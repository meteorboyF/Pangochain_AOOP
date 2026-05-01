package com.pangochain.backend.hearing;

import com.pangochain.backend.audit.AuditService;
import com.pangochain.backend.cases.Case;
import com.pangochain.backend.cases.CaseRepository;
import com.pangochain.backend.user.User;
import com.pangochain.backend.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/hearings")
@RequiredArgsConstructor
public class HearingController {

    private final HearingRepository hearingRepository;
    private final CaseRepository caseRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;

    @GetMapping("/by-case/{caseId}")
    public ResponseEntity<List<HearingDto>> byCase(@PathVariable UUID caseId) {
        List<HearingDto> list = hearingRepository
                .findByLegalCaseIdOrderByHearingDateAsc(caseId)
                .stream().map(HearingDto::from).toList();
        return ResponseEntity.ok(list);
    }

    @GetMapping("/upcoming")
    public ResponseEntity<List<HearingDto>> upcoming(
            @AuthenticationPrincipal UserDetails principal) {
        User user = resolveUser(principal);
        List<Hearing> hearings;
        if (user.getFirm() != null) {
            hearings = hearingRepository.findUpcomingByFirm(user.getFirm().getId(), Instant.now());
        } else {
            hearings = List.of();
        }
        return ResponseEntity.ok(hearings.stream().map(HearingDto::from).toList());
    }

    @PostMapping
    public ResponseEntity<HearingDto> create(
            @RequestBody HearingCreateRequest req,
            @AuthenticationPrincipal UserDetails principal) {
        User creator = resolveUser(principal);
        Case legalCase = caseRepository.findById(req.caseId())
                .orElseThrow(() -> new IllegalArgumentException("Case not found"));

        Hearing h = Hearing.builder()
                .legalCase(legalCase)
                .title(req.title())
                .hearingDate(req.hearingDate())
                .location(req.location())
                .courtName(req.courtName())
                .hearingType(req.hearingType() != null ? req.hearingType() : "COURT_HEARING")
                .notes(req.notes())
                .createdBy(creator)
                .build();

        h = hearingRepository.save(h);
        auditService.log("HEARING_SCHEDULED", creator, h.getId().toString(),
                String.format("{\"caseId\":\"%s\",\"date\":\"%s\"}", legalCase.getId(), req.hearingDate()));
        return ResponseEntity.ok(HearingDto.from(h));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails principal) {
        User user = resolveUser(principal);
        hearingRepository.deleteById(id);
        auditService.log("HEARING_DELETED", user, id.toString(), "{}");
        return ResponseEntity.noContent().build();
    }

    private User resolveUser(UserDetails principal) {
        return userRepository.findByEmail(principal.getUsername())
                .orElseThrow(() -> new IllegalStateException("User not found"));
    }
}
