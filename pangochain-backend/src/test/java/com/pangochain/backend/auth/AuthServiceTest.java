package com.pangochain.backend.auth;

import com.pangochain.backend.audit.AuditService;
import com.pangochain.backend.auth.dto.AuthResponse;
import com.pangochain.backend.auth.dto.LoginRequest;
import com.pangochain.backend.auth.dto.RefreshRequest;
import com.pangochain.backend.auth.dto.RegisterRequest;
import com.pangochain.backend.crypto.Pbkdf2Service;
import com.pangochain.backend.user.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock UserRepository userRepository;
    @Mock FirmRepository firmRepository;
    @Mock Pbkdf2Service pbkdf2Service;
    @Mock JwtTokenProvider jwtTokenProvider;
    @Mock AuditService auditService;

    @InjectMocks AuthService authService;

    private UUID userId;
    private User activeUser;

    @BeforeEach
    void setup() {
        userId = UUID.randomUUID();
        activeUser = User.builder()
                .id(userId)
                .email("test@example.com")
                .passwordHash("hashed")
                .salt("salt")
                .fullName("Test User")
                .role(UserRole.ASSOCIATE_SENIOR)
                .status(AccountStatus.ACTIVE)
                .mfaEnabled(false)
                .build();
    }

    @Test
    void register_validInput_createsUserAndReturnsTokens() {
        RegisterRequest req = new RegisterRequest("new@example.com", "password", "New User",
                UserRole.ASSOCIATE_JUNIOR, null, "pubkey-jwk", "signing-key-jwk");

        when(userRepository.existsByEmail("new@example.com")).thenReturn(false);
        when(pbkdf2Service.generateSalt()).thenReturn("newsalt");
        when(pbkdf2Service.hash("password", "newsalt")).thenReturn("newhash");
        when(userRepository.save(any())).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            if (u.getId() == null) u.setId(UUID.randomUUID());
            return u;
        });
        when(jwtTokenProvider.generateAccessToken(any(), any(), any())).thenReturn("access-token");
        when(jwtTokenProvider.generateRefreshToken(any(), any(), any())).thenReturn("refresh-token");

        AuthResponse response = authService.register(req);

        assertThat(response.accessToken()).isEqualTo("access-token");
        assertThat(response.email()).isEqualTo("new@example.com");
        verify(userRepository).save(argThat(u -> u.getEmail().equals("new@example.com")));
        verify(auditService).log(eq("USER_REGISTERED"), any(UUID.class), eq("USER"), any(), any(), any());
    }

    @Test
    void register_duplicateEmail_throwsConflict() {
        RegisterRequest req = new RegisterRequest("dup@example.com", "password", "Dup",
                UserRole.ASSOCIATE_JUNIOR, null, null, null);
        when(userRepository.existsByEmail("dup@example.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(req))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Email already registered");
    }

    @Test
    void login_validCredentials_returnsTokenPair() {
        LoginRequest req = new LoginRequest("test@example.com", "password", null);
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(activeUser));
        when(pbkdf2Service.verify("password", "salt", "hashed")).thenReturn(true);
        when(userRepository.save(any())).thenReturn(activeUser);
        when(jwtTokenProvider.generateAccessToken(any(), any(), any())).thenReturn("access");
        when(jwtTokenProvider.generateRefreshToken(any(), any(), any())).thenReturn("refresh");

        AuthResponse response = authService.login(req);

        assertThat(response.accessToken()).isEqualTo("access");
        assertThat(response.refreshToken()).isEqualTo("refresh");
    }

    @Test
    void login_invalidCredentials_throwsUnauthorized() {
        LoginRequest req = new LoginRequest("test@example.com", "wrong", null);
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(activeUser));
        when(pbkdf2Service.verify("wrong", "salt", "hashed")).thenReturn(false);

        assertThatThrownBy(() -> authService.login(req))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Invalid credentials");
    }

    @Test
    void login_managingPartnerWithoutMfa_throwsMfaSetupRequired() {
        User partner = User.builder()
                .id(userId)
                .email("partner@example.com")
                .passwordHash("hashed")
                .salt("salt")
                .fullName("Partner")
                .role(UserRole.MANAGING_PARTNER)
                .status(AccountStatus.ACTIVE)
                .mfaEnabled(false)
                .build();
        LoginRequest req = new LoginRequest("partner@example.com", "password", null);
        when(userRepository.findByEmail("partner@example.com")).thenReturn(Optional.of(partner));
        when(pbkdf2Service.verify("password", "salt", "hashed")).thenReturn(true);
        when(jwtTokenProvider.generateMfaSetupToken(any(), any())).thenReturn("setup-token");

        assertThatThrownBy(() -> authService.login(req))
                .isInstanceOf(MfaSetupRequiredException.class);
    }

    @Test
    void login_managingPartnerWithMfaEnabled_throwsMfaChallengeRequired() {
        User partner = User.builder()
                .id(userId)
                .email("partner@example.com")
                .passwordHash("hashed")
                .salt("salt")
                .fullName("Partner")
                .role(UserRole.MANAGING_PARTNER)
                .status(AccountStatus.ACTIVE)
                .mfaEnabled(true)
                .mfaSecret(null)
                .build();
        LoginRequest req = new LoginRequest("partner@example.com", "password", null);
        when(userRepository.findByEmail("partner@example.com")).thenReturn(Optional.of(partner));
        when(pbkdf2Service.verify("password", "salt", "hashed")).thenReturn(true);
        when(jwtTokenProvider.generateMfaChallengeToken(any(), any(), any())).thenReturn("challenge-token");

        // No TOTP code provided → should throw MfaChallengeRequiredException
        assertThatThrownBy(() -> authService.login(req))
                .isInstanceOf(MfaChallengeRequiredException.class);
    }

    @Test
    void refresh_validRefreshToken_returnsNewAccessToken() {
        RefreshRequest req = new RefreshRequest("valid-refresh");
        when(jwtTokenProvider.isRefreshToken("valid-refresh")).thenReturn(true);
        when(jwtTokenProvider.extractUserId("valid-refresh")).thenReturn(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(activeUser));
        when(jwtTokenProvider.generateAccessToken(any(), any(), any())).thenReturn("new-access");
        when(jwtTokenProvider.generateRefreshToken(any(), any(), any())).thenReturn("new-refresh");

        AuthResponse response = authService.refresh(req);

        assertThat(response.accessToken()).isEqualTo("new-access");
    }

    @Test
    void refresh_nonRefreshToken_throwsUnauthorized() {
        RefreshRequest req = new RefreshRequest("access-token");
        when(jwtTokenProvider.isRefreshToken("access-token")).thenReturn(false);

        assertThatThrownBy(() -> authService.refresh(req))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Not a refresh token");
    }
}
