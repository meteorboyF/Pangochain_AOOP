package com.pangochain.backend.audit;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    Page<AuditLog> findByActorIdOrderByTimestampDesc(UUID actorId, Pageable pageable);
    Page<AuditLog> findByResourceId(String resourceId, Pageable pageable);
    Page<AuditLog> findByEventType(String eventType, Pageable pageable);
    Page<AuditLog> findAllByOrderByTimestampDesc(Pageable pageable);
}
