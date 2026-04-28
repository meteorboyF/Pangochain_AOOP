package com.pangochain.backend.dashboard;

import com.pangochain.backend.audit.AuditLogRepository;
import com.pangochain.backend.cases.CaseRepository;
import com.pangochain.backend.cases.CaseStatus;
import com.pangochain.backend.document.DocumentRepository;
import com.pangochain.backend.message.MessageRepository;
import com.pangochain.backend.user.User;
import com.pangochain.backend.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final CaseRepository caseRepository;
    private final DocumentRepository documentRepository;
    private final MessageRepository messageRepository;
    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> stats(
            @AuthenticationPrincipal UserDetails principal) {
        User user = userRepository.findByEmail(principal.getUsername())
                .orElseThrow(() -> new IllegalStateException("User not found"));

        long activeCases = user.getFirm() != null
                ? caseRepository.countByFirmIdAndStatus(user.getFirm().getId(), CaseStatus.ACTIVE)
                : 0L;
        long totalDocuments = documentRepository.count();
        long unreadMessages = messageRepository.countByRecipientIdAndReadAtIsNull(user.getId());
        long auditEvents = auditLogRepository.count();

        return ResponseEntity.ok(Map.of(
                "activeCases", activeCases,
                "totalDocuments", totalDocuments,
                "unreadMessages", unreadMessages,
                "auditEvents", auditEvents
        ));
    }
}
