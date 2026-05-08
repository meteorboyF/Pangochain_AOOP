package com.pangochain.backend.audit;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/audit")
@RequiredArgsConstructor
public class AuditController {

    private final AuditLogRepository auditLogRepository;

    @GetMapping
    public ResponseEntity<Page<AuditLog>> list(
            @RequestParam(required = false) String eventType,
            @RequestParam(required = false) String resourceId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by("timestamp").descending());
        if (eventType != null && !eventType.isBlank()) {
            return ResponseEntity.ok(auditLogRepository.findByEventType(eventType, pageable));
        }
        if (resourceId != null && !resourceId.isBlank()) {
            return ResponseEntity.ok(auditLogRepository.findByResourceId(resourceId, pageable));
        }
        return ResponseEntity.ok(auditLogRepository.findAll(pageable));
    }

    /**
     * GET /api/audit/regulator?caseId={id}&resourceId={id}&eventType={type}
     * Cross-firm audit access for REGULATOR role only.
     * Regulators can query audit trails for any case or resource across all firms.
     * Regulators CANNOT access wrapped key tokens or document ciphertext — audit metadata only.
     */
    @GetMapping("/regulator")
    @PreAuthorize("hasRole('REGULATOR')")
    public ResponseEntity<Page<AuditLog>> regulatorAudit(
            @RequestParam(required = false) String caseId,
            @RequestParam(required = false) String resourceId,
            @RequestParam(required = false) String eventType,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size) {

        PageRequest pageable = PageRequest.of(page, size, Sort.by("timestamp").descending());

        if (resourceId != null && eventType != null) {
            return ResponseEntity.ok(auditLogRepository.findByResourceIdAndEventType(resourceId, eventType, pageable));
        }
        if (resourceId != null) {
            return ResponseEntity.ok(auditLogRepository.findByResourceId(resourceId, pageable));
        }
        if (eventType != null) {
            return ResponseEntity.ok(auditLogRepository.findByEventType(eventType, pageable));
        }
        return ResponseEntity.ok(auditLogRepository.findAll(pageable));
    }
}
