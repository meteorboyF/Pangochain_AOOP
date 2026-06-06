package com.pangochain.backend.cases;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pangochain.backend.audit.AuditService;
import com.pangochain.backend.blockchain.FabricException;
import com.pangochain.backend.blockchain.FabricGatewayService;
import com.pangochain.backend.cases.dto.CaseCreateRequest;
import com.pangochain.backend.cases.dto.CaseDto;
import com.pangochain.backend.document.DocStatus;
import com.pangochain.backend.document.DocumentRepository;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.data.domain.PageRequest;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class CaseServiceTest {

    @Mock CaseRepository caseRepository;
    @Mock DocumentRepository documentRepository;
    @Mock FabricGatewayService fabricGatewayService;
    @Mock AuditService auditService;
    @Mock ObjectMapper objectMapper;

    @InjectMocks CaseService caseService;

    private UUID firmId;
    private UUID userId;
    private Firm firm;
    private User creator;

    @BeforeEach
    void setup() throws Exception {
        firmId = UUID.randomUUID();
        userId = UUID.randomUUID();

        firm = Firm.builder().id(firmId).name("Test Firm").mspId("TestMSP").build();
        creator = User.builder()
                .id(userId)
                .email("lawyer@firm.com")
                .fullName("Test Lawyer")
                .firm(firm)
                .build();

        // FabricGatewayService is @Autowired(required=false) — not constructor-injected.
        // @InjectMocks uses the @RequiredArgsConstructor ctor, so we must set it manually.
        ReflectionTestUtils.setField(caseService, "fabricGatewayService", fabricGatewayService);

        // ObjectMapper is used in toJson() — return a stable string
        when(objectMapper.writeValueAsString(any())).thenReturn("{}");
    }

    private CaseCreateRequest req(String title, String desc, String type) {
        CaseCreateRequest r = new CaseCreateRequest();
        r.setTitle(title);
        r.setDescription(desc);
        r.setCaseType(type);
        return r;
    }

    @Test
    void createCase_savesToDbAndCallsFabric() throws Exception {
        CaseCreateRequest req = req("Title A", "Desc", "CIVIL");
        UUID caseId = UUID.randomUUID();

        Case savedCase = Case.builder()
                .id(caseId).title("Title A").description("Desc")
                .firm(firm).createdBy(creator).status(CaseStatus.ACTIVE).build();

        when(fabricGatewayService.registerCase(any(), any(), any(), any(), any())).thenReturn("tx-001");
        when(caseRepository.save(any())).thenReturn(savedCase);
        when(documentRepository.countByLegalCaseIdAndStatus(caseId, DocStatus.ACTIVE)).thenReturn(0L);

        CaseDto result = caseService.create(req, creator);

        verify(fabricGatewayService).registerCase(any(), eq(firmId.toString()), eq("Title A"), eq(userId.toString()), any());
        verify(caseRepository).save(any(Case.class));
        assertThat(result.getTitle()).isEqualTo("Title A");
    }

    @Test
    void createCase_writesAuditLogEntry() throws Exception {
        CaseCreateRequest req = req("Title B", "Desc", "CRIMINAL");
        UUID caseId = UUID.randomUUID();

        Case savedCase = Case.builder()
                .id(caseId).title("Title B").firm(firm).createdBy(creator).status(CaseStatus.ACTIVE).build();

        when(fabricGatewayService.registerCase(any(), any(), any(), any(), any())).thenReturn("tx-002");
        when(caseRepository.save(any())).thenReturn(savedCase);
        when(documentRepository.countByLegalCaseIdAndStatus(any(), any())).thenReturn(0L);

        caseService.create(req, creator);

        verify(auditService).log(eq("CASE_REGISTERED"), eq(userId), eq("CASE"), any(), any(), any());
    }

    @Test
    void closeCase_updatesStatusAndAudits() {
        UUID caseId = UUID.randomUUID();
        Case existingCase = Case.builder()
                .id(caseId).title("Close Me").firm(firm).createdBy(creator).status(CaseStatus.ACTIVE).build();
        Case closedCase = Case.builder()
                .id(caseId).title("Close Me").firm(firm).createdBy(creator)
                .status(CaseStatus.CLOSED).closedAt(Instant.now()).build();

        when(caseRepository.findById(caseId)).thenReturn(Optional.of(existingCase));
        when(caseRepository.save(any())).thenReturn(closedCase);
        when(documentRepository.countByLegalCaseIdAndStatus(caseId, DocStatus.ACTIVE)).thenReturn(0L);

        CaseDto result = caseService.close(caseId, creator);

        verify(caseRepository).save(argThat(c -> c.getStatus() == CaseStatus.CLOSED));
        verify(auditService).log(eq("CASE_CLOSED"), eq(userId), eq("CASE"), eq(caseId.toString()), isNull(), isNull());
        assertThat(result.getStatus()).isEqualTo("CLOSED");
    }

    @Test
    void closeCase_throwsIfNotFound() {
        UUID missing = UUID.randomUUID();
        when(caseRepository.findById(missing)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> caseService.close(missing, creator))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Case not found");
    }

    @Test
    void listByFirm_returnsOnlyCasesForFirm() {
        Case c = Case.builder().id(UUID.randomUUID()).title("C").firm(firm).createdBy(creator).status(CaseStatus.ACTIVE).build();
        Page<Case> page = new PageImpl<>(List.of(c));

        when(caseRepository.findByFirmId(eq(firmId), any(PageRequest.class))).thenReturn(page);
        when(documentRepository.countByLegalCaseIdAndStatus(any(), any())).thenReturn(0L);

        Page<CaseDto> result = caseService.listByFirm(firmId, null, null, 0, 10);

        verify(caseRepository).findByFirmId(eq(firmId), any());
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getTitle()).isEqualTo("C");
    }

    @Test
    void searchCases_filtersBySearchTerm() {
        Case c = Case.builder().id(UUID.randomUUID()).title("Tax Dispute").firm(firm).createdBy(creator).status(CaseStatus.ACTIVE).build();
        Page<Case> page = new PageImpl<>(List.of(c));

        when(caseRepository.searchByFirm(eq(firmId), isNull(), eq("tax"), any())).thenReturn(page);
        when(documentRepository.countByLegalCaseIdAndStatus(any(), any())).thenReturn(0L);

        Page<CaseDto> result = caseService.listByFirm(firmId, null, "tax", 0, 10);

        verify(caseRepository).searchByFirm(eq(firmId), isNull(), eq("tax"), any());
        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    void createCase_fabricUnavailable_continuesSaving() throws Exception {
        CaseCreateRequest req = req("No Fabric", "Desc", "CIVIL");
        UUID caseId = UUID.randomUUID();
        Case savedCase = Case.builder()
                .id(caseId).title("No Fabric").firm(firm).createdBy(creator).status(CaseStatus.ACTIVE).build();

        when(fabricGatewayService.registerCase(any(), any(), any(), any(), any()))
                .thenThrow(new FabricException("Fabric down"));
        when(caseRepository.save(any())).thenReturn(savedCase);
        when(documentRepository.countByLegalCaseIdAndStatus(any(), any())).thenReturn(0L);

        CaseDto result = caseService.create(req, creator);

        verify(caseRepository).save(any());
        // Audit is still written even when Fabric fails
        verify(auditService).log(eq("CASE_REGISTERED"), any(), eq("CASE"), any(), isNull(), any());
        assertThat(result).isNotNull();
    }
}
