package com.pangochain.backend.user;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;

    /** Returns the ECIES P-256 public key (JWK) for a user — needed before granting document access. */
    @GetMapping("/{id}/public-key")
    public ResponseEntity<Map<String, String>> getPublicKey(@PathVariable UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (user.getPublicKeyEcies() == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(Map.of("publicKeyJwk", user.getPublicKeyEcies(), "userId", id.toString()));
    }

    /** Look up a user by email — for the access-grant form. */
    @GetMapping("/by-email")
    public ResponseEntity<Map<String, Object>> findByEmail(@RequestParam String email) {
        return userRepository.findByEmail(email)
                .map(u -> ResponseEntity.ok(Map.<String, Object>of(
                        "id", u.getId().toString(),
                        "email", u.getEmail(),
                        "fullName", u.getFullName(),
                        "role", u.getRole().name(),
                        "hasPublicKey", u.getPublicKeyEcies() != null
                )))
                .orElse(ResponseEntity.notFound().build());
    }
}
