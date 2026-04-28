package com.pangochain.backend.admin;

import com.pangochain.backend.user.AccountStatus;
import com.pangochain.backend.user.User;
import com.pangochain.backend.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasAnyAuthority('MANAGING_PARTNER','IT_ADMIN')")
public class AdminController {

    private final UserRepository userRepository;

    @GetMapping("/users")
    public ResponseEntity<Page<UserSummary>> listUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<UserSummary> result = userRepository.findAll(pageable).map(UserSummary::from);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/users/{id}/activate")
    public ResponseEntity<Map<String, String>> activate(@PathVariable UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + id));
        user.setStatus(AccountStatus.ACTIVE);
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("status", "ACTIVE", "userId", id.toString()));
    }

    @PostMapping("/users/{id}/suspend")
    public ResponseEntity<Map<String, String>> suspend(@PathVariable UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + id));
        user.setStatus(AccountStatus.SUSPENDED);
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("status", "SUSPENDED", "userId", id.toString()));
    }

    public record UserSummary(
            UUID id, String email, String fullName, String role,
            String status, String firmName, boolean mfaEnabled
    ) {
        static UserSummary from(User u) {
            return new UserSummary(
                    u.getId(), u.getEmail(), u.getFullName(),
                    u.getRole().name(), u.getStatus().name(),
                    u.getFirm() != null ? u.getFirm().getName() : null,
                    u.isMfaEnabled()
            );
        }
    }
}
