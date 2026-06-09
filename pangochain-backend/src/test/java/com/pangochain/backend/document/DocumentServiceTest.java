package com.pangochain.backend.document;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pangochain.backend.audit.AuditService;
import com.pangochain.backend.blockchain.FabricException;
import com.pangochain.backend.blockchain.FabricGatewayService;
import com.pangochain.backend.cases.Case;
import com.pangochain.backend.cases.CaseRepository;
import com.pangochain.backend.cases.CaseStatus;
import com.pangochain.backend.document.dto.DocumentUploadRequest;
import com.pangochain.backend.ipfs.IpfsService;
import com.pangochain.backend.user.Firm;
import com.pangochain.backend.user.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class DocumentServiceTest {

    @Mock DocumentRepository documentRepository;
    @Mock DocumentAccessRepository accessRepository;
    @Mock CaseRepository caseRepository;
    @Mock IpfsService ipfsService;
    @Mock FabricGatewayService fabricGatewayService;
    @Mock AuditService auditService;
    @Mock ObjectMapper objectMapper;

    @InjectMocks DocumentService documentService;

    private UUID caseId;
    private UUID docId;
    private UUID userId;
    private Firm firm;
    private User uploader;
    private Case legalCase;
    private Document savedDoc;

    @BeforeEach
    void setup() throws Exception {
        caseId = UUID.randomUUID();
        docId = UUID.randomUUID();
        userId = UUID.randomUUID();

        firm = Firm.builder().id(UUID.randomUUID()).name("Firm").mspId("FirmMSP").build();
        uploader = User.builder().id(userId).email("up@firm.com").fullName("Uploader").firm(firm).build();

        legalCase = Case.builder().id(caseId).title("Case A").firm(firm)
                .createdBy(uploader).status(CaseStatus.ACTIVE).build();

        savedDoc = Document.builder()
                .id(docId).legalCase(legalCase).fileName("test.pdf")
                .ipfsCid("Qm123").documentHashSha256("abc123")
                .owner(uploader).version(1).status(DocStatus.ACTIVE)
                .category("GENERAL").build();

        when(objectMapper.writeValueAsString(any())).thenReturn("{}");

        // FabricGatewayService is @Autowired(required=false) — inject manually since
        // @InjectMocks uses the @RequiredArgsConstructor constructor which excludes it.
        ReflectionTestUtils.setField(documentService, "fabricGatewayService", fabricGatewayService);
    }

    private DocumentUploadRequest uploadReq() {
        DocumentUploadRequest r = new DocumentUploadRequest();
        r.setCaseId(caseId.toString());
        r.setFileName("test.pdf");
        r.setIvBase64("AAAAAAAAAAAAAAAA"); // 12 bytes base64
        r.setCiphertextBase64("dGVzdA==");
        r.setDocumentHashSha256("abc123");
        r.setWrappedKeyTokenForOwner("wrappedkeytoken");
        return r;
    }

    @Test
    void upload_storesOnIpfsAndFabricAndAudits() throws Exception {
        when(caseRepository.findById(caseId)).thenReturn(Optional.of(legalCase));
        when(ipfsService.add(any(), eq("test.pdf"))).thenReturn("Qm123");
        when(documentRepository.save(any())).thenReturn(savedDoc);
        when(fabricGatewayService.registerDocument(any(), any(), any(), any(), any(), any(), any())).thenReturn("tx-doc-001");
        when(accessRepository.save(any())).thenReturn(mock(DocumentAccess.class));

        var dto = documentService.upload(uploadReq(), uploader);

        verify(ipfsService).add(any(), eq("test.pdf"));
        verify(fabricGatewayService).registerDocument(
                eq(docId.toString()), eq(caseId.toString()),
                eq("abc123"), eq("Qm123"), eq(userId.toString()), eq("FirmMSP"), any());
        verify(accessRepository).save(argThat(a -> a.getCapability() == DocumentAccess.Capability.owner));
        verify(auditService).log(eq("DOC_REGISTERED"), eq(userId), eq("DOCUMENT"), eq(docId.toString()), eq("tx-doc-001"), any());
        assertThat(dto.getIpfsCid()).isEqualTo("Qm123");
    }

    @Test
    void upload_fabricUnavailable_continuesWithoutTxId() throws Exception {
        when(caseRepository.findById(caseId)).thenReturn(Optional.of(legalCase));
        when(ipfsService.add(any(), any())).thenReturn("Qm456");
        when(documentRepository.save(any())).thenReturn(savedDoc);
        when(fabricGatewayService.registerDocument(any(), any(), any(), any(), any(), any(), any()))
                .thenThrow(new FabricException("Fabric down"));
        when(accessRepository.save(any())).thenReturn(mock(DocumentAccess.class));

        var dto = documentService.upload(uploadReq(), uploader);

        verify(documentRepository).save(any());
        verify(auditService).log(eq("DOC_REGISTERED"), eq(userId), eq("DOCUMENT"), any(), isNull(), any());
        assertThat(dto).isNotNull();
    }

    @Test
    void downloadCiphertext_layer2Pass_returnsBytes() throws Exception {
        byte[] ciphertextBlob = new byte[]{1, 2, 3};
        when(documentRepository.findById(docId)).thenReturn(Optional.of(savedDoc));
        when(fabricGatewayService.checkAccess(eq(docId.toString()), eq(userId.toString()), eq("FirmMSP")))
                .thenReturn(true);
        when(ipfsService.cat("Qm123")).thenReturn(ciphertextBlob);

        byte[] result = documentService.downloadCiphertext(docId, uploader);

        verify(ipfsService).cat("Qm123");
        verify(auditService, never()).log(eq("FABRIC_OUTAGE_ACCESS_DENIED"), any(), any(), any(), any(), any());
        verify(auditService, never()).log(eq("ACL_FABRIC_FALLBACK"), any(), any(), any(), any(), any());
        assertThat(result).isEqualTo(ciphertextBlob);
    }

    @Test
    void downloadCiphertext_layer2Fail_throwsAccessDenied() throws Exception {
        when(documentRepository.findById(docId)).thenReturn(Optional.of(savedDoc));
        when(fabricGatewayService.checkAccess(any(), any(), any())).thenReturn(false);

        assertThatThrownBy(() -> documentService.downloadCiphertext(docId, uploader))
                .isInstanceOf(DocumentService.AccessDeniedException.class)
                .hasMessageContaining("Access denied");

        verify(ipfsService, never()).cat(any());
        verify(accessRepository, never()).findActiveEntry(docId, userId);
        verify(auditService, never()).log(eq("FABRIC_OUTAGE_ACCESS_DENIED"), any(), any(), any(), any(), any());
        verify(auditService, never()).log(eq("ACL_FABRIC_FALLBACK"), any(), any(), any(), any(), any());
    }

    @Test
    void downloadCiphertext_fabricUnavailable_deniesFailClosedAndLogsOutage() throws Exception {
        when(documentRepository.findById(docId)).thenReturn(Optional.of(savedDoc));
        when(fabricGatewayService.checkAccess(any(), any(), any()))
                .thenThrow(new FabricException("Fabric unreachable"));

        assertThatThrownBy(() -> documentService.downloadCiphertext(docId, uploader))
                .isInstanceOf(FabricException.class)
                .hasMessageContaining("Fabric unreachable");

        verify(ipfsService, never()).cat(any());
        verify(accessRepository).findActiveEntry(docId, userId);
        verify(auditService).log(eq("FABRIC_OUTAGE_ACCESS_DENIED"), eq(userId), eq("DOCUMENT"), eq(docId.toString()), isNull(), any());
        verify(auditService, never()).log(eq("ACL_FABRIC_FALLBACK"), any(), any(), any(), any(), any());
    }

    @Test
    void downloadCiphertext_fabricUnavailableWithValidDbAclAndFallbackDisabled_deniesFailClosed() throws Exception {
        ReflectionTestUtils.setField(documentService, "materialDbFallbackEnabled", false);
        when(documentRepository.findById(docId)).thenReturn(Optional.of(savedDoc));
        when(fabricGatewayService.checkAccess(any(), any(), any()))
                .thenThrow(new FabricException("Fabric unreachable"));

        assertThatThrownBy(() -> documentService.downloadCiphertext(docId, uploader))
                .isInstanceOf(FabricException.class);

        verify(ipfsService, never()).cat(any());
        verify(accessRepository, never()).findActiveEntry(docId, userId);
        verify(auditService).log(eq("FABRIC_OUTAGE_ACCESS_DENIED"), eq(userId), eq("DOCUMENT"), eq(docId.toString()), isNull(), any());
        verify(auditService, never()).log(eq("ACL_FABRIC_FALLBACK"), any(), any(), any(), any(), any());
    }

    @Test
    void downloadCiphertext_fabricUnavailableWithFallbackAndValidDbAcl_returnsBytesAndAuditsFallback() throws Exception {
        byte[] ciphertextBlob = new byte[]{4, 5, 6};
        DocumentAccess access = DocumentAccess.builder()
                .docId(docId).userId(userId)
                .capability(DocumentAccess.Capability.read)
                .wrappedKeyToken("wkt").build();

        ReflectionTestUtils.setField(documentService, "materialDbFallbackEnabled", true);
        when(documentRepository.findById(docId)).thenReturn(Optional.of(savedDoc));
        when(fabricGatewayService.checkAccess(any(), any(), any()))
                .thenThrow(new FabricException("Fabric unreachable"));
        when(accessRepository.findActiveEntry(docId, userId)).thenReturn(Optional.of(access));
        when(ipfsService.cat("Qm123")).thenReturn(ciphertextBlob);

        byte[] result = documentService.downloadCiphertext(docId, uploader);

        assertThat(result).isEqualTo(ciphertextBlob);
        verify(ipfsService).cat("Qm123");
        verify(auditService).log(eq("ACL_FABRIC_FALLBACK"), eq(userId), eq("DOCUMENT"), eq(docId.toString()), isNull(), any());
        verify(auditService, never()).log(eq("FABRIC_OUTAGE_ACCESS_DENIED"), any(), any(), any(), any(), any());
    }

    @Test
    void getWrappedKey_layer2Pass_returnsToken() throws Exception {
        DocumentAccess access = DocumentAccess.builder()
                .docId(docId).userId(userId)
                .capability(DocumentAccess.Capability.read)
                .wrappedKeyToken("wkt").build();
        when(documentRepository.findById(docId)).thenReturn(Optional.of(savedDoc));
        when(fabricGatewayService.checkAccess(eq(docId.toString()), eq(userId.toString()), eq("FirmMSP")))
                .thenReturn(true);
        when(accessRepository.findActiveEntry(docId, userId)).thenReturn(Optional.of(access));

        String token = documentService.getWrappedKey(docId, uploader);

        assertThat(token).isEqualTo("wkt");
        verify(auditService, never()).log(eq("FABRIC_OUTAGE_ACCESS_DENIED"), any(), any(), any(), any(), any());
        verify(auditService, never()).log(eq("ACL_FABRIC_FALLBACK"), any(), any(), any(), any(), any());
    }

    @Test
    void getWrappedKey_layer2Deny_throwsAccessDeniedWithoutDbFallback() throws Exception {
        when(documentRepository.findById(docId)).thenReturn(Optional.of(savedDoc));
        when(fabricGatewayService.checkAccess(any(), any(), any())).thenReturn(false);

        assertThatThrownBy(() -> documentService.getWrappedKey(docId, uploader))
                .isInstanceOf(DocumentService.AccessDeniedException.class)
                .hasMessageContaining("Access denied");

        verify(accessRepository, never()).findActiveEntry(docId, userId);
        verify(auditService, never()).log(eq("FABRIC_OUTAGE_ACCESS_DENIED"), any(), any(), any(), any(), any());
        verify(auditService, never()).log(eq("ACL_FABRIC_FALLBACK"), any(), any(), any(), any(), any());
    }

    @Test
    void getWrappedKey_fabricUnavailable_deniesFailClosedAndDoesNotReturnToken() throws Exception {
        when(documentRepository.findById(docId)).thenReturn(Optional.of(savedDoc));
        when(fabricGatewayService.checkAccess(any(), any(), any()))
                .thenThrow(new FabricException("UNAVAILABLE: io exception"));

        assertThatThrownBy(() -> documentService.getWrappedKey(docId, uploader))
                .isInstanceOf(FabricException.class)
                .hasMessageContaining("UNAVAILABLE");

        verify(accessRepository).findActiveEntry(docId, userId);
        verify(auditService).log(eq("FABRIC_OUTAGE_ACCESS_DENIED"), eq(userId), eq("DOCUMENT"), eq(docId.toString()), isNull(), any());
        verify(auditService, never()).log(eq("ACL_FABRIC_FALLBACK"), any(), any(), any(), any(), any());
    }

    @Test
    void getWrappedKey_fabricUnavailableWithFallbackAndValidDbAcl_returnsTokenAndAuditsFallback() throws Exception {
        DocumentAccess access = DocumentAccess.builder()
                .docId(docId).userId(userId)
                .capability(DocumentAccess.Capability.read)
                .wrappedKeyToken("wkt").build();

        ReflectionTestUtils.setField(documentService, "materialDbFallbackEnabled", true);
        when(documentRepository.findById(docId)).thenReturn(Optional.of(savedDoc));
        when(fabricGatewayService.checkAccess(any(), any(), any()))
                .thenThrow(new FabricException("UNAVAILABLE: io exception"));
        when(accessRepository.findActiveEntry(docId, userId)).thenReturn(Optional.of(access));

        String token = documentService.getWrappedKey(docId, uploader);

        assertThat(token).isEqualTo("wkt");
        verify(auditService).log(eq("ACL_FABRIC_FALLBACK"), eq(userId), eq("DOCUMENT"), eq(docId.toString()), isNull(), any());
        verify(auditService, never()).log(eq("FABRIC_OUTAGE_ACCESS_DENIED"), any(), any(), any(), any(), any());
    }
}
