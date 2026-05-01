package com.pangochain.backend.dashboard;

import com.pangochain.backend.audit.AuditLogRepository;
import com.pangochain.backend.cases.CaseRepository;
import com.pangochain.backend.cases.CaseStatus;
import com.pangochain.backend.document.DocumentRepository;
import com.pangochain.backend.hearing.HearingDto;
import com.pangochain.backend.hearing.HearingRepository;
import com.pangochain.backend.message.MessageRepository;
import com.pangochain.backend.reminder.ReminderRepository;
import com.pangochain.backend.user.User;
import com.pangochain.backend.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final CaseRepository caseRepository;
    private final DocumentRepository documentRepository;
    private final MessageRepository messageRepository;
    private final AuditLogRepository auditLogRepository;
    private final HearingRepository hearingRepository;
    private final ReminderRepository reminderRepository;
    private final UserRepository userRepository;

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> stats(
            @AuthenticationPrincipal UserDetails principal) {
        User user = userRepository.findByEmail(principal.getUsername())
                .orElseThrow(() -> new IllegalStateException("User not found"));

        Map<String, Object> stats = new HashMap<>();

        String roleStr = user.getRole().name();
        boolean isClientRole = roleStr.startsWith("CLIENT_");

        if (isClientRole) {
            // Client-specific stats
            stats.put("activeCases", 0L); // populated from case_clients join (simplified)
            stats.put("totalDocuments", documentRepository.countByOwnerId(user.getId()));
            stats.put("unreadMessages", messageRepository.countByRecipientIdAndReadAtIsNull(user.getId()));
            stats.put("unreadReminders", reminderRepository.countByRecipientIdAndReadFalse(user.getId()));
            stats.put("auditEvents", auditLogRepository.count());

            // Next upcoming hearing for client (from firm hearings — simplified for now)
            stats.put("nextHearing", null);

        } else {
            // Legal professional stats
            long activeCases = user.getFirm() != null
                    ? caseRepository.countByFirmIdAndStatus(user.getFirm().getId(), CaseStatus.ACTIVE)
                    : 0L;
            stats.put("activeCases", activeCases);
            stats.put("totalDocuments", documentRepository.count());
            stats.put("unreadMessages", messageRepository.countByRecipientIdAndReadAtIsNull(user.getId()));
            stats.put("unreadReminders", reminderRepository.countByRecipientIdAndReadFalse(user.getId()));
            stats.put("auditEvents", auditLogRepository.count());

            // Next upcoming hearing for this firm
            if (user.getFirm() != null) {
                hearingRepository.findUpcomingByFirm(user.getFirm().getId(), Instant.now())
                        .stream().findFirst()
                        .ifPresentOrElse(
                                h -> stats.put("nextHearing", HearingDto.from(h)),
                                () -> stats.put("nextHearing", null)
                        );
            } else {
                stats.put("nextHearing", null);
            }
        }

        return ResponseEntity.ok(stats);
    }
}
