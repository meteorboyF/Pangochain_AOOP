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

        // Version chaining: if this upload supersedes an existing document, link it as the next
        // version (version = previous + 1) rather than starting a fresh v1 chain.
        int versionNumber = 1;
        UUID previousVersionId = null;
        if (req.getPreviousVersionId() != null && !req.getPreviousVersionId().isBlank()) {
            Document previous = documentRepository.findById(UUID.fromString(req.getPreviousVersionId()))
                    .orElseThrow(() -> new IllegalArgumentException("Previous version not found"));
            if (accessRepository.findActiveEntry(previous.getId(), uploader.getId()).isEmpty()) {
                throw new AccessDeniedException("You do not have access to the document you are versioning");
            }
            versionNumber = previous.getVersion() + 1;
            previousVersionId = previous.getId();
        }

        // Persist document FIRST — establishes the authoritative UUID in PostgreSQL.
        // Fabric is called immediately after using doc.getId() so both systems share
        // the same UUID regardless of any Hibernate @GeneratedValue behaviour.
        Document doc = Document.builder()
                .id(UUID.randomUUID())
                .legalCase(legalCase)
                .fileName(req.getFileName())
                .ipfsCid(cid)
                .documentHashSha256(req.getDocumentHashSha256())
                .fabricTxId(null)
                .owner(uploader)
                .version(versionNumber)
                .previousVersionId(previousVersionId)
                .status(DocStatus.ACTIVE)
                .build();
        doc = documentRepository.save(doc);

        // Register on Fabric using the PostgreSQL-committed UUID
        String docId = doc.getId().toString();
        String fabricTxId = null;
        try {
            if (fabricGatewayService != null) {
                log.info("Registering on Fabric: docId={}", docId);
                fabricTxId = fabricGatewayService.registerDocument(
                        docId,
                        legalCase.getId().toString(),
                        req.getDocumentHashSha256(),
                        cid,
                        uploader.getId().toString(),
                        uploader.getFirm() != null ? uploader.getFirm().getMspId() : "FirmAMSP",
                        Instant.now().toString());
                doc.setFabricTxId(fabricTxId);
            }
        } catch (FabricException e) {
            log.warn("Fabric registration failed (continuing): {}", e.getMessage());
        }

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

        // Two-layer ACL: Layer 1 = JWT (Spring Security, validated before this method).
        //                Layer 2 = Fabric CheckAccess chaincode (authoritative on-chain ACL).
        boolean allowed;
        String aclLayer2Status;
        try {
            if (fabricGatewayService != null) {
                allowed = fabricGatewayService.checkAccess(
                        docId.toString(),
                        requester.getId().toString(),
                        requester.getFirm() != null ? requester.getFirm().getMspId() : "FirmAMSP");
                aclLayer2Status = allowed ? "PASS" : "FAIL";
            } else {
                // Fabric disabled — fall back to DB access check
                allowed = accessRepository.findActiveEntry(docId, requester.getId()).isPresent();
                aclLayer2Status = "FALLBACK";
                log.warn("ACL fallback to DB for doc={}: Fabric not enabled", docId);
            }
        } catch (FabricException e) {
            log.warn("Fabric ACL check failed for doc={}: {}", docId, e.getMessage());
            allowed = accessRepository.findActiveEntry(docId, requester.getId()).isPresent();
            aclLayer2Status = "FALLBACK";
            auditService.log("ACL_FABRIC_FALLBACK", requester.getId(), "DOCUMENT", docId.toString(), null,
                    "{\"reason\":\"" + e.getMessage().replace("\"", "'") + "\"}");
        }
        log.info("ACL check: Layer1=PASS Layer2={} doc={} user={}", aclLayer2Status, docId, requester.getEmail());

        if (!allowed) throw new AccessDeniedException("Access denied for document " + docId);

        auditService.log("DOC_VIEWED", requester.getId(), "DOCUMENT",
                docId.toString(), null, null);

        return ipfsService.cat(doc.getIpfsCid());
    }

    @Transactional
    public void completeKeyRotation(UUID docId, User requester) {
        Document doc = documentRepository.findById(docId)
                .orElseThrow(() -> new IllegalArgumentException("Document not found"));
        if (!doc.getOwner().getId().equals(requester.getId())) {
            throw new AccessDeniedException("Only the document owner can complete key rotation");
        }
        doc.setKeyRotationPending(false);
        documentRepository.save(doc);
        auditService.log("KEY_ROTATION_COMPLETED", requester.getId(), "DOCUMENT",
                docId.toString(), null, null);
        log.info("Key rotation completed for doc={} by user={}", docId, requester.getEmail());
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

    public String getDocumentHistory(UUID docId, User requester) {
        Document doc = documentRepository.findById(docId)
                .orElseThrow(() -> new IllegalArgumentException("Document not found"));
        if (fabricGatewayService == null) return "[]";
        try {
            return fabricGatewayService.getDocumentHistory(docId.toString());
        } catch (FabricException e) {
            log.warn("Could not fetch Fabric history for doc={}: {}", docId, e.getMessage());
            return "[]";
        }
    }

    @Transactional
    public DocumentDto updateMetadata(UUID docId, String category, Boolean confidential, User requester) {
        Document doc = documentRepository.findById(docId)
                .orElseThrow(() -> new IllegalArgumentException("Document not found"));
        accessRepository.findActiveEntry(docId, requester.getId())
                .orElseThrow(() -> new AccessDeniedException("No access to document " + docId));
        if (category != null) doc.setCategory(category);
        if (confidential != null) doc.setConfidential(confidential);
        doc = documentRepository.save(doc);
        auditService.log("DOC_METADATA_UPDATED", requester.getId(), "DOCUMENT",
                docId.toString(), null,
                toJson(Map.of("category", doc.getCategory(), "confidential", doc.isConfidential())));
        return toDto(doc, doc.getOwner().getEmail());
    }

    /**
     * Full version lineage for a document, ordered oldest → newest. Walks up the
     * previous_version_id chain to the root, then down through successors.
     */
    @Transactional(readOnly = true)
    public List<DocumentDto> listVersions(UUID docId, User requester) {
        Document doc = documentRepository.findById(docId)
                .orElseThrow(() -> new IllegalArgumentException("Document not found"));
        if (accessRepository.findActiveEntry(docId, requester.getId()).isEmpty()
                && !doc.getOwner().getId().equals(requester.getId())) {
            throw new AccessDeniedException("No access to document " + docId);
        }

        // Walk up to the root of the chain.
        Document root = doc;
        java.util.Set<UUID> guard = new java.util.HashSet<>();
        while (root.getPreviousVersionId() != null && guard.add(root.getId())) {
            Document prev = documentRepository.findById(root.getPreviousVersionId()).orElse(null);
            if (prev == null) break;
            root = prev;
        }

        // Walk down from the root collecting successors (linear chain).
        List<Document> chain = new java.util.ArrayList<>();
        Document current = root;
        guard.clear();
        while (current != null && guard.add(current.getId())) {
            chain.add(current);
            current = documentRepository.findByPreviousVersionId(current.getId())
                    .stream().findFirst().orElse(null);
        }
        return chain.stream().map(d -> toDto(d, d.getOwner().getEmail())).toList();
    }

    /**
     * Restore an earlier version: creates a NEW document at the head of the chain that reuses
     * the selected version's ciphertext (same IPFS CID + hash + key), so existing key grants
     * still decrypt it. A fresh Fabric anchor is written; the prior chain is preserved intact.
     */
    @Transactional
    public DocumentDto restore(UUID versionId, User requester) {
        Document source = documentRepository.findById(versionId)
                .orElseThrow(() -> new IllegalArgumentException("Version not found"));
        if (accessRepository.findActiveEntry(versionId, requester.getId()).isEmpty()
                && !source.getOwner().getId().equals(requester.getId())) {
            throw new AccessDeniedException("No access to document " + versionId);
        }

        // Find the current head of this chain (highest version reachable from the source).
        List<DocumentDto> lineage = listVersions(versionId, requester);
        UUID headId = lineage.get(lineage.size() - 1).getId();
        Document head = documentRepository.findById(headId).orElse(source);

        Document restored = Document.builder()
                .id(UUID.randomUUID())
                .legalCase(source.getLegalCase())
                .fileName(source.getFileName())
                .ipfsCid(source.getIpfsCid())
                .documentHashSha256(source.getDocumentHashSha256())
                .fabricTxId(null)
                .owner(source.getOwner())
                .version(head.getVersion() + 1)
                .previousVersionId(head.getId())
                .status(DocStatus.ACTIVE)
                .category(source.getCategory())
                .confidential(source.isConfidential())
                .build();
        restored = documentRepository.save(restored);

        String fabricTxId = null;
        try {
            if (fabricGatewayService != null) {
                fabricTxId = fabricGatewayService.registerDocument(
                        restored.getId().toString(),
                        source.getLegalCase().getId().toString(),
                        source.getDocumentHashSha256(),
                        source.getIpfsCid(),
                        requester.getId().toString(),
                        requester.getFirm() != null ? requester.getFirm().getMspId() : "FirmAMSP",
                        Instant.now().toString());
                restored.setFabricTxId(fabricTxId);
            }
        } catch (FabricException e) {
            log.warn("Fabric registration failed for restored version (continuing): {}", e.getMessage());
        }

        // Re-issue the same wrapped-key grants on the new document — same ciphertext/key, so
        // every grantee on the restored version retains access.
        for (DocumentAccess grant : accessRepository.findActiveByDoc(source.getId())) {
            accessRepository.save(DocumentAccess.builder()
                    .docId(restored.getId())
                    .userId(grant.getUserId())
                    .capability(grant.getCapability())
                    .grantedBy(requester.getId())
                    .wrappedKeyToken(grant.getWrappedKeyToken())
                    .build());
        }

        auditService.log("DOC_VERSION_RESTORED", requester.getId(), "DOCUMENT",
                restored.getId().toString(), fabricTxId,
                toJson(Map.of("restoredFrom", source.getId().toString(),
                        "restoredFromVersion", source.getVersion(),
                        "newVersion", restored.getVersion())));
        log.info("Restored doc v{} ({}) as new v{} ({})",
                source.getVersion(), source.getId(), restored.getVersion(), restored.getId());

        return toDto(restored, restored.getOwner().getEmail());
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
                .previousVersionId(d.getPreviousVersionId())
                .status(d.getStatus().name())
                .keyRotationPending(d.isKeyRotationPending())
                .category(d.getCategory())
                .confidential(d.isConfidential())
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
