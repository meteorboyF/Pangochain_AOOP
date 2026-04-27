package com.pangochain.backend.audit;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    /**
     * Async, separate transaction so audit writes never block or rollback the main transaction.
     * The PostgreSQL INSERT-only trigger enforces append-only at DB level.
     */
    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(String eventType, UUID actorId, String resourceType,
                    String resourceId, String fabricTxId, String metadataJson) {
        try {
            AuditLog entry = AuditLog.builder()
                    .eventType(eventType)
                    .actorId(actorId)
                    .resourceType(resourceType)
                    .resourceId(resourceId)
                    .fabricTxId(fabricTxId)
                    .metadataJson(metadataJson)
                    .build();
            auditLogRepository.save(entry);
        } catch (Exception e) {
            log.error("Failed to write audit log entry: eventType={}, actorId={}", eventType, actorId, e);
        }
    }

    /** Overload for system-generated events (no UUID actor — uses string identity). */
    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(String eventType, String actorIdStr, String actorOrg,
                    String resourceType, String resourceId, String fabricTxId,
                    String metadataJson, String ipAddress) {
        try {
            AuditLog entry = AuditLog.builder()
                    .eventType(eventType)
                    .actorId(null)
                    .resourceType(resourceType)
                    .resourceId(resourceId)
                    .fabricTxId(fabricTxId)
                    .metadataJson(metadataJson != null ? metadataJson
                            : String.format("{\"actor\":\"%s\",\"org\":\"%s\"}", actorIdStr, actorOrg))
                    .build();
            auditLogRepository.save(entry);
        } catch (Exception e) {
            log.error("Failed to write system audit log: eventType={}", eventType, e);
        }
    }
}
