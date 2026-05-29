package com.pangochain.backend.casenode;

import com.pangochain.backend.casenode.CaseNodeDtos.CaseNodeDto;
import com.pangochain.backend.casenode.CaseNodeDtos.CreateNodeRequest;
import com.pangochain.backend.user.User;
import com.pangochain.backend.user.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/** Case-journey tree (Feature 3). Read for any case member; write for legal professionals. */
@RestController
@RequestMapping("/api/cases/{caseId}/nodes")
@RequiredArgsConstructor
public class CaseNodeController {

    private final CaseNodeService caseNodeService;
    private final UserRepository userRepository;

    @PreAuthorize("isAuthenticated()")
    @GetMapping
    public ResponseEntity<List<CaseNodeDto>> list(@PathVariable UUID caseId) {
        return ResponseEntity.ok(caseNodeService.list(caseId));
    }

    @PreAuthorize("hasAnyRole('MANAGING_PARTNER','PARTNER_SENIOR','PARTNER_JUNIOR','ASSOCIATE_SENIOR','ASSOCIATE_JUNIOR','PARALEGAL')")
    @PostMapping
    public ResponseEntity<CaseNodeDto> create(
            @PathVariable UUID caseId,
            @Valid @RequestBody CreateNodeRequest req,
            @AuthenticationPrincipal UserDetails principal) {
        User author = userRepository.findByEmail(principal.getUsername())
                .orElseThrow(() -> new IllegalStateException("User not found"));
        return ResponseEntity.ok(caseNodeService.create(caseId, req, author));
    }
}
