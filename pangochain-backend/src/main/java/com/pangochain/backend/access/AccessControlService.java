package com.pangochain.backend.access;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pangochain.backend.audit.AuditService;
import com.pangochain.backend.blockchain.FabricException;
import com.pangochain.backend.blockchain.FabricGatewayService;
import com.pangochain.backend.document.DocumentAccess;
import com.pangochain.backend.document.DocumentAccessRepository;
import com.pangochain.backend.document.DocumentRepository;
import com.pangochain.backend.notification.Notification;
import com.pangochain.backend.notification.NotificationRepository;
import com.pangochain.backend.user.User;
import com.pangochain.backend.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AccessControlService {

    private final DocumentAccessRepository accessRepository;
    private final DocumentRepository documentRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    @Autowired(required = false)
    private FabricGatewayService fabricGatewayService;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;

    /**
     * Phase 4: Grant access — ECIES-wrapped key arrives from the browser.
     * 1. Verify granter has owner/write capability
     * 2. Call GrantAccess chaincode (records on ledger)
     * 3. Persist DocumentAccess row
     * 4. Notify grantee
     */
    @Transactional
    public AccessDto grant(GrantAccessRequest req, User granter) {
        UUID docId = UUID.fromString(req.getDocId());
        UUID granteeId = UUID.fromString(req.getGranteeId());

        // Verify granter has owner capability
        DocumentAccess granterAccess = accessRepository.findActiveEntry(docId, granter.getId())
                .orElseThrow(() -> new IllegalStateException("You do not have access to this document"));
        if (granterAccess.getCapability() == DocumentAccess.Capability.read) {
            throw new IllegalStateException("Read-only users cannot grant access");
        }

        User grantee = userRepository.findById(granteeId)
                .orElseThrow(() -> new IllegalArgumentException("Grantee not found: " + req.getGranteeId()));

        // Determine expiry
        Instant expiresAt = req.getExpiresAtEpochMs() != null
                ? Instant.ofEpochMilli(req.getExpiresAtEpochMs()) : null;

        // Fabric GrantAccess
        String fabricTxId = null;
        try {
            String expiryStr = expiresAt != null ? expiresAt.toString() : "";
            fabricTxId = fabricGatewayService.grantAccess(
                    docId.toString(),
                    grantee.getId().toString(),
                    grantee.getFirm() != null ? grantee.getFirm().getMspId() : "FirmAMSP",
                    req.getCapability().toLowerCase(),
                    expiryStr,
                    req.getWrappedKeyToken(),
                    granter.getId().toString()
            );
        } catch (FabricException e) {
            log.warn("Fabric GrantAccess failed: {}", e.getMessage());
        }

        DocumentAccess.Capability cap = DocumentAccess.Capability.valueOf(req.getCapability().toLowerCase());
        DocumentAccess access = DocumentAccess.builder()
                .docId(docId)
                .userId(granteeId)
                .capability(cap)
                .grantedBy(granter.getId())
                .expiresAt(expiresAt)
                .wrappedKeyToken(req.getWrappedKeyToken())
                .build();
        access = accessRepository.save(access);

        // Notify grantee
        notificationRepository.save(Notification.builder()
                .userId(granteeId)
                .type("ACCESS_GRANTED")
                .message(String.format("%s granted you %s access to a document",
                        granter.getFullName(), req.getCapability()))
                .build());

        auditService.log("ACCESS_GRANTED", granter.getId(), "DOCUMENT",
                docId.toString(), fabricTxId,
                toJson(Map.of("grantee", grantee.getEmail(), "capability", req.getCapability())));

        return toDto(access, grantee.getEmail(), granter.getEmail());
    }

    /**
     * Phase 4: Revoke access. Also triggers key rotation notification.
     */
    @Transactional
    public void revoke(String docIdStr, String targetUserIdStr, User revoker) {
        UUID docId = UUID.fromString(docIdStr);
        UUID targetUserId = UUID.fromString(targetUserIdStr);

        DocumentAccess access = accessRepository.findActiveEntry(docId, targetUserId)
                .orElseThrow(() -> new IllegalArgumentException("No active access entry found"));

        access.setRevokedAt(Instant.now());
        access.setRevokedBy(revoker.getId());
        accessRepository.save(access);

        String fabricTxId = null;
        try {
            fabricTxId = fabricGatewayService.revokeAccess(docIdStr, targetUserIdStr, revoker.getId().toString());
        } catch (FabricException e) {
            log.warn("Fabric RevokeAccess failed: {}", e.getMessage());
        }

        // Notify revoked user
        notificationRepository.save(Notification.builder()
                .userId(targetUserId)
                .type("ACCESS_REVOKED")
                .message("Your access to a document has been revoked by " + revoker.getFullName())
                .build());

        auditService.log("ACCESS_REVOKED", revoker.getId(), "DOCUMENT",
                docIdStr, fabricTxId,
                toJson(Map.of("targetUser", targetUserIdStr)));
    }

    public List<AccessDto> listForDoc(UUID docId, User requester) {
        return accessRepository.findActiveByDoc(docId)
                .stream()
                .map(a -> {
                    String granteeEmail = userRepository.findById(a.getUserId())
                            .map(User::getEmail).orElse("unknown");
                    String granterEmail = a.getGrantedBy() != null
                            ? userRepository.findById(a.getGrantedBy()).map(User::getEmail).orElse("system")
                            : "system";
                    return toDto(a, granteeEmail, granterEmail);
                })
                .toList();
    }

    private AccessDto toDto(DocumentAccess a, String granteeEmail, String granterEmail) {
        return AccessDto.builder()
                .id(a.getId())
                .docId(a.getDocId())
                .userId(a.getUserId())
                .userEmail(granteeEmail)
                .grantedByEmail(granterEmail)
                .capability(a.getCapability().name())
                .expiresAt(a.getExpiresAt())
                .grantedAt(a.getGrantedAt())
                .build();
    }

    private String toJson(Object obj) {
        try { return objectMapper.writeValueAsString(obj); } catch (Exception e) { return "{}"; }
    }
}
