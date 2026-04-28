package com.pangochain.backend.access;

import com.pangochain.backend.user.User;
import com.pangochain.backend.user.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/access")
@RequiredArgsConstructor
public class AccessControlController {

    private final AccessControlService accessControlService;
    private final UserRepository userRepository;

    /** POST /api/access/grant — browser sends ECIES-wrapped key for the grantee */
    @PostMapping("/grant")
    public ResponseEntity<AccessDto> grant(
            @Valid @RequestBody GrantAccessRequest req,
            @AuthenticationPrincipal UserDetails principal) {
        User granter = resolveUser(principal);
        return ResponseEntity.ok(accessControlService.grant(req, granter));
    }

    /** DELETE /api/access/{docId}/user/{userId} */
    @DeleteMapping("/{docId}/user/{userId}")
    public ResponseEntity<Void> revoke(
            @PathVariable String docId,
            @PathVariable String userId,
            @AuthenticationPrincipal UserDetails principal) {
        User revoker = resolveUser(principal);
        accessControlService.revoke(docId, userId, revoker);
        return ResponseEntity.noContent().build();
    }

    /** GET /api/access/{docId} — returns current ACL for a document */
    @GetMapping("/{docId}")
    public ResponseEntity<List<AccessDto>> list(
            @PathVariable UUID docId,
            @AuthenticationPrincipal UserDetails principal) {
        User requester = resolveUser(principal);
        return ResponseEntity.ok(accessControlService.listForDoc(docId, requester));
    }

    private User resolveUser(UserDetails principal) {
        return userRepository.findByEmail(principal.getUsername())
                .orElseThrow(() -> new IllegalStateException("User not found"));
    }
}
