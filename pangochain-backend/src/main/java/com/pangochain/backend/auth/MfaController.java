package com.pangochain.backend.auth;

import com.pangochain.backend.audit.AuditService;
import com.pangochain.backend.user.User;
import com.pangochain.backend.user.UserRepository;
import com.warrenstrange.googleauth.GoogleAuthenticator;
import com.warrenstrange.googleauth.GoogleAuthenticatorKey;
import com.warrenstrange.googleauth.GoogleAuthenticatorQRGenerator;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

/**
 * MFA/TOTP endpoints.
 *
 * Setup flow  : POST /api/auth/mfa/setup   → returns otpauth:// URI for QR scan
 * Verify flow : POST /api/auth/mfa/verify  → validates 6-digit code, enables MFA
 *
 * Required for MANAGING_PARTNER and IT_ADMIN roles on login.
 */
@RestController
@RequestMapping("/api/auth/mfa")
@RequiredArgsConstructor
@Slf4j
public class MfaController {

    private final UserRepository userRepository;
    private final AuditService auditService;

    private static final GoogleAuthenticator gAuth = new GoogleAuthenticator();

    private static final String ISSUER = "PangoChain";

    /**
     * POST /api/auth/mfa/setup
     * Generates a new TOTP secret for the authenticated user and returns the
     * otpauth:// QR URI for Google Authenticator / Authy.
     * The secret is NOT yet activated — the user must call /verify to confirm enrollment.
     */
    @PostMapping("/setup")
    public ResponseEntity<Map<String, String>> setup(@AuthenticationPrincipal User user) {
        if (user == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);

        GoogleAuthenticatorKey credentials = gAuth.createCredentials();
        String secret = credentials.getKey();

        // Persist secret (not yet enabled — confirmed on /verify)
        user.setMfaSecret(secret);
        userRepository.save(user);

        String qrUri = GoogleAuthenticatorQRGenerator.getOtpAuthTotpURL(
                ISSUER, user.getEmail(), credentials);

        log.info("MFA setup initiated for user={}", user.getEmail());
        return ResponseEntity.ok(Map.of(
                "secret", secret,
                "qrUri", qrUri
        ));
    }

    /**
     * POST /api/auth/mfa/verify
     * Verifies a 6-digit TOTP code and activates MFA for the account.
     * Also used during login when mfaRequired=true.
     */
    @PostMapping("/verify")
    public ResponseEntity<Map<String, Object>> verify(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody MfaVerifyRequest req) {

        if (user == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);

        String secret = user.getMfaSecret();
        if (secret == null || secret.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "MFA not set up — call /mfa/setup first");
        }

        int code;
        try {
            code = Integer.parseInt(req.code());
        } catch (NumberFormatException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid TOTP code format");
        }

        boolean valid = gAuth.authorize(secret, code);
        if (!valid) {
            auditService.log("MFA_VERIFY_FAILED", user.getId(), "USER", user.getId().toString(), null, null);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid or expired TOTP code");
        }

        // Activate MFA on first successful verify
        if (!user.isMfaEnabled()) {
            user.setMfaEnabled(true);
            userRepository.save(user);
            log.info("MFA enabled for user={}", user.getEmail());
        }

        auditService.log("MFA_VERIFY_SUCCESS", user.getId(), "USER", user.getId().toString(), null, null);
        return ResponseEntity.ok(Map.of("mfaEnabled", true, "message", "MFA verified successfully"));
    }

    public record MfaVerifyRequest(
            @NotBlank @Size(min = 6, max = 6) @Pattern(regexp = "\\d{6}") String code
    ) {}
}
