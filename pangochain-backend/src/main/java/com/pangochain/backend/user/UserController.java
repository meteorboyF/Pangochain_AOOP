package com.pangochain.backend.user;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class UserController {

    private final UserRepository userRepository;

    public record SetPublicKeysRequest(@NotBlank String publicKeyJwk, String signingPublicKeyJwk) {}

    /**
     * Upsert the current user's public keys. Used by first-login key provisioning so that
     * accounts created server-side (e.g. seeded demo users) become E2E-capable the first
     * time they log in through the browser — the browser generates the keypairs, keeps the
     * PBKDF2-wrapped private keys in localStorage, and registers the public keys here.
     */
    @Transactional
    @PutMapping("/me/public-keys")
    public ResponseEntity<Void> setMyPublicKeys(
            @Valid @RequestBody SetPublicKeysRequest req,
            @AuthenticationPrincipal UserDetails principal) {
        User user = userRepository.findByEmail(principal.getUsername())
                .orElseThrow(() -> new IllegalStateException("User not found"));
        user.setPublicKeyEcies(req.publicKeyJwk());
        if (req.signingPublicKeyJwk() != null && !req.signingPublicKeyJwk().isBlank()) {
            user.setSigningPublicKey(req.signingPublicKeyJwk());
        }
        userRepository.save(user);
        return ResponseEntity.noContent().build();
    }

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
