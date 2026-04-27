package com.pangochain.backend.auth;

import com.pangochain.backend.audit.AuditService;
import com.pangochain.backend.auth.dto.AuthResponse;
import com.pangochain.backend.auth.dto.LoginRequest;
import com.pangochain.backend.auth.dto.RefreshRequest;
import com.pangochain.backend.auth.dto.RegisterRequest;
import com.pangochain.backend.crypto.Pbkdf2Service;
import com.pangochain.backend.user.*;
import io.jsonwebtoken.JwtException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final FirmRepository firmRepository;
    private final Pbkdf2Service pbkdf2Service;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuditService auditService;

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        if (userRepository.existsByEmail(req.email())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        }

        Firm firm = null;
        if (req.firmId() != null) {
            firm = firmRepository.findById(req.firmId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Firm not found"));
        }

        String salt = pbkdf2Service.generateSalt();
        String hash = pbkdf2Service.hash(req.password(), salt);

        // Legal professionals start as PENDING_APPROVAL; clients are activated immediately by their lawyer later
        AccountStatus initialStatus = req.role().name().startsWith("CLIENT")
                ? AccountStatus.PENDING_APPROVAL
                : AccountStatus.PENDING_APPROVAL;

        User user = User.builder()
                .email(req.email())
                .passwordHash(hash)
                .salt(salt)
                .fullName(req.fullName())
                .role(req.role())
                .firm(firm)
                .publicKeyEcies(req.publicKeyJwk())
                .status(initialStatus)
                .build();

        userRepository.save(user);

        auditService.log("USER_REGISTERED", user.getId(), "USER", user.getId().toString(), null, null);

        log.info("New user registered: {} ({}), status={}", req.email(), req.role(), initialStatus);

        // Return tokens — user must be approved before most endpoints work
        String accessToken = jwtTokenProvider.generateAccessToken(user.getId(), user.getEmail(), user.getRole().name());
        String refreshToken = jwtTokenProvider.generateRefreshToken(user.getId(), user.getEmail(), user.getRole().name());

        return buildResponse(user, accessToken, refreshToken, false);
    }

    @Transactional
    public AuthResponse login(LoginRequest req) {
        User user = userRepository.findByEmail(req.email())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        if (user.getStatus() == AccountStatus.SUSPENDED) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account suspended");
        }

        if (!pbkdf2Service.verify(req.password(), user.getSalt(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        // MFA check for PARTNER+ and IT_ADMIN
        if (user.isMfaEnabled() && (req.totpCode() == null || req.totpCode().isBlank())) {
            // Return partial response signalling MFA required
            return new AuthResponse(null, null, user.getId(), user.getEmail(),
                    user.getFullName(), user.getRole(),
                    user.getFirm() != null ? user.getFirm().getId().toString() : null,
                    true, true);
        }

        user.setLastLoginAt(Instant.now());
        userRepository.save(user);

        auditService.log("USER_LOGIN", user.getId(), "USER", user.getId().toString(), null, req.toString());

        String accessToken = jwtTokenProvider.generateAccessToken(user.getId(), user.getEmail(), user.getRole().name());
        String refreshToken = jwtTokenProvider.generateRefreshToken(user.getId(), user.getEmail(), user.getRole().name());

        return buildResponse(user, accessToken, refreshToken, false);
    }

    public AuthResponse refresh(RefreshRequest req) {
        try {
            if (!jwtTokenProvider.isRefreshToken(req.refreshToken())) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not a refresh token");
            }
            UUID userId = jwtTokenProvider.extractUserId(req.refreshToken());
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));

            if (user.getStatus() == AccountStatus.SUSPENDED) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account suspended");
            }

            String newAccess = jwtTokenProvider.generateAccessToken(user.getId(), user.getEmail(), user.getRole().name());
            String newRefresh = jwtTokenProvider.generateRefreshToken(user.getId(), user.getEmail(), user.getRole().name());
            return buildResponse(user, newAccess, newRefresh, false);

        } catch (JwtException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token");
        }
    }

    private AuthResponse buildResponse(User user, String access, String refresh, boolean mfaRequired) {
        return new AuthResponse(
                access,
                refresh,
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRole(),
                user.getFirm() != null ? user.getFirm().getId().toString() : null,
                mfaRequired,
                user.isMfaEnabled()
        );
    }
}
