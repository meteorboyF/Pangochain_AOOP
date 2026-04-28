package com.pangochain.backend.audit;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
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
}
