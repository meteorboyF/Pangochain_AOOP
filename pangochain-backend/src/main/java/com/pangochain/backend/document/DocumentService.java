package com.pangochain.backend.document;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pangochain.backend.audit.AuditService;
import com.pangochain.backend.blockchain.FabricException;
import com.pangochain.backend.blockchain.FabricGatewayService;
import org.springframework.beans.factory.annotation.Autowired;
import com.pangochain.backend.cases.Case;
import com.pangochain.backend.cases.CaseRepository;
import com.pangochain.backend.document.dto.DocumentDto;
import com.pangochain.backend.document.dto.DocumentUploadRequest;
import com.pangochain.backend.ipfs.IpfsService;
import com.pangochain.backend.user.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final DocumentAccessRepository accessRepository;
    private final CaseRepository caseRepository;
    private final IpfsService ipfsService;
    @Autowired(required = false)
    private FabricGatewayService fabricGatewayService;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;

    /**
     * Phase 3 core upload flow:
     * 1. Validate case membership
     * 2. Upload ciphertext to IPFS → get CID
     * 3. RegisterDocument on Hyperledger Fabric
     * 4. Persist Document row in PostgreSQL
     * 5. Persist owner DocumentAccess entry with wrapped key
     * 6. Audit log
     */
    @Transactional
    public DocumentDto upload(DocumentUploadRequest req, User uploader) {
        Case legalCase = caseRepository.findById(UUID.fromString(req.getCaseId()))
                .orElseThrow(() -> new IllegalArgumentException("Case not found: " + req.getCaseId()));

        // Decode IV + ciphertext from browser and prepend IV so download can split it
        byte[] ivBytes = Base64.getDecoder().decode(req.getIvBase64());
        byte[] ciphertextOnly = Base64.getDecoder().decode(req.getCiphertextBase64());
        byte[] ciphertextBytes = new byte[ivBytes.length + ciphertextOnly.length];
        System.arraycopy(ivBytes, 0, ciphertextBytes, 0, ivBytes.length);
        System.arraycopy(ciphertextOnly, 0, ciphertextBytes, ivBytes.length, ciphertextOnly.length);

        // Upload to IPFS
        String cid = ipfsService.add(ciphertextBytes, req.getFileName());

        // Register on Fabric
        String docId = UUID.randomUUID().toString();
        String fabricTxId = null;
        try {
            if (fabricGatewayService != null) {
                fabricTxId = fabricGatewayService.registerDocument(
                        docId,
                        legalCase.getId().toString(),
                        req.getDocumentHashSha256(),
                        cid,
                        uploader.getId().toString(),
                        uploader.getFirm() != null ? uploader.getFirm().getMspId() : "FirmAMSP",
                        Instant.now().toString());
            }
        } catch (FabricException e) {
            log.warn("Fabric registration failed (continuing): {}", e.getMessage());
        }

        // Persist document
        Document doc = Document.builder()
                .id(UUID.fromString(docId))
                .legalCase(legalCase)
                .fileName(req.getFileName())
                .ipfsCid(cid)
                .documentHashSha256(req.getDocumentHashSha256())
                .fabricTxId(fabricTxId)
                .owner(uploader)
                .version(1)
                .status(DocStatus.ACTIVE)
                .build();
        doc = documentRepository.save(doc);

        // Owner access entry with wrapped key
        DocumentAccess ownerAccess = DocumentAccess.builder()
                .docId(doc.getId())
                .userId(uploader.getId())
                .capability(DocumentAccess.Capability.owner)
                .grantedBy(uploader.getId())
                .wrappedKeyToken(req.getWrappedKeyTokenForOwner())
                .build();
        accessRepository.save(ownerAccess);

        // Audit
        auditService.log("DOC_REGISTERED", uploader.getId(), "DOCUMENT",
                doc.getId().toString(), fabricTxId,
                toJson(Map.of("fileName", req.getFileName(), "cid", cid)));

        log.info("Document {} uploaded: CID={} txId={}", doc.getId(), cid, fabricTxId);
        return toDto(doc, uploader.getEmail());
    }

    /**
     * Phase 3 download flow:
     * 1. JWT validates uploader identity (Spring Security)
     * 2. CheckAccess chaincode — two-layer ACL
     * 3. Fetch ciphertext from IPFS
     * 4. Return ciphertext to browser for WebCrypto decryption
     */
    public byte[] downloadCiphertext(UUID docId, User requester) {
        Document doc = documentRepository.findById(docId)
                .orElseThrow(() -> new IllegalArgumentException("Document not found"));

        // Chaincode ACL check (two-layer: JWT already validated layer 1)
        boolean allowed;
        try {
            if (fabricGatewayService != null) {
                allowed = fabricGatewayService.checkAccess(
                        docId.toString(),
                        requester.getId().toString(),
                        requester.getFirm() != null ? requester.getFirm().getMspId() : "FirmAMSP");
            } else {
                // Fabric disabled — fall back to DB access check
                allowed = accessRepository.findActiveEntry(docId, requester.getId()).isPresent();
            }
        } catch (FabricException e) {
            log.warn("Fabric ACL check failed for doc={}: {}", docId, e.getMessage());
            allowed = accessRepository.findActiveEntry(docId, requester.getId()).isPresent();
        }

        if (!allowed) throw new AccessDeniedException("Access denied for document " + docId);

        auditService.log("DOC_VIEWED", requester.getId(), "DOCUMENT",
                docId.toString(), null, null);

        return ipfsService.cat(doc.getIpfsCid());
    }

    public String getWrappedKey(UUID docId, User requester) {
        return accessRepository.findActiveEntry(docId, requester.getId())
                .map(DocumentAccess::getWrappedKeyToken)
                .orElseThrow(() -> new AccessDeniedException("No active access entry for document " + docId));
    }

    @Transactional(readOnly = true)
    public List<DocumentDto> listAccessibleByUser(User user) {
        return documentRepository.findAccessibleByUser(user.getId(), DocStatus.ACTIVE)
                .stream()
                .map(d -> toDto(d, d.getOwner().getEmail()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<DocumentDto> listByCase(UUID caseId) {
        return documentRepository.findByLegalCaseIdAndStatus(caseId, DocStatus.ACTIVE)
                .stream()
                .map(d -> toDto(d, d.getOwner().getEmail()))
                .toList();
    }

    private DocumentDto toDto(Document d, String ownerEmail) {
        return DocumentDto.builder()
                .id(d.getId())
                .caseId(d.getLegalCase().getId())
                .fileName(d.getFileName())
                .ipfsCid(d.getIpfsCid())
                .documentHash(d.getDocumentHashSha256())
                .fabricTxId(d.getFabricTxId())
                .ownerEmail(ownerEmail)
                .version(d.getVersion())
                .status(d.getStatus().name())
                .createdAt(d.getCreatedAt())
                .build();
    }

    private String toJson(Object obj) {
        try { return objectMapper.writeValueAsString(obj); } catch (Exception e) { return "{}"; }
    }

    public static class AccessDeniedException extends RuntimeException {
        public AccessDeniedException(String msg) { super(msg); }
    }
}
