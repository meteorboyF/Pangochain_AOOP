package com.pangochain.backend.security;

import com.pangochain.backend.admin.AdminController;
import com.pangochain.backend.audit.AuditService;
import com.pangochain.backend.auth.JwtTokenProvider;
import com.pangochain.backend.document.DocumentController;
import com.pangochain.backend.document.DocumentService;
import com.pangochain.backend.user.AccountStatus;
import com.pangochain.backend.user.Firm;
import com.pangochain.backend.user.User;
import com.pangochain.backend.user.UserRepository;
import com.pangochain.backend.user.UserRole;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Tests JWT rejection (401) and role-based access control (403/200) at the HTTP layer.
 * Uses @WebMvcTest to avoid loading JPA. JWT-filter rejection tests pass a token in
 * the header; since no JWT filter is wired here, unauthenticated requests reach Spring
 * Security's URL rule (anyRequest().authenticated) and return 401. Role tests use the
 * Spring Security test user() post-processor so they don't depend on the filter.
 */
@WebMvcTest(controllers = {DocumentController.class, AdminController.class})
@Import(JwtTokenProvider.class)
@TestPropertySource(properties = {
        "jwt.secret=test-secret-at-least-32-chars-long-for-pangochain-tests",
        "jwt.access-token-expiry=3600",
        "jwt.refresh-token-expiry=86400"
})
class SecurityTest {

    /** Enables @PreAuthorize processing in the @WebMvcTest slice. */
    @TestConfiguration
    @EnableMethodSecurity
    static class TestConfig {}

    private static final String SECRET = "test-secret-at-least-32-chars-long-for-pangochain-tests";
    private static final SecretKey KEY = Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));

    @Autowired MockMvc mvc;
    @Autowired JwtTokenProvider jwtTokenProvider;

    @MockBean DocumentService documentService;
    @MockBean UserRepository userRepository;
    @MockBean AuditService auditService;

    private UUID userId;
    private User activeUser;

    @BeforeEach
    void setup() {
        userId = UUID.randomUUID();
        Firm firm = Firm.builder().id(UUID.randomUUID()).name("Firm").mspId("FirmMSP").build();
        activeUser = User.builder()
                .id(userId).email("mp@firm.com").fullName("Managing Partner")
                .role(UserRole.MANAGING_PARTNER).status(AccountStatus.ACTIVE).firm(firm)
                .build();
    }

    @Test
    void unauthenticated_returns401() throws Exception {
        mvc.perform(get("/api/documents"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void expiredJwt_returns401() throws Exception {
        String expiredToken = Jwts.builder()
                .subject(userId.toString())
                .claim("email", "old@firm.com")
                .claim("role", "ASSOCIATE_SENIOR")
                .claim("type", "access")
                .expiration(Date.from(Instant.now().minusSeconds(3600)))
                .signWith(KEY)
                .compact();

        mvc.perform(get("/api/documents")
                        .header("Authorization", "Bearer " + expiredToken))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void invalidJwtSignature_returns401() throws Exception {
        String validToken = jwtTokenProvider.generateAccessToken(userId, "test@firm.com", "ASSOCIATE_SENIOR");
        String tampered = validToken.substring(0, validToken.length() - 4) + "XXXX";

        mvc.perform(get("/api/documents")
                        .header("Authorization", "Bearer " + tampered))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void wrongRole_returns403() throws Exception {
        // ASSOCIATE_JUNIOR hitting /api/admin/users which requires MANAGING_PARTNER or IT_ADMIN
        mvc.perform(get("/api/admin/users")
                        .with(user("junior@firm.com").roles("ASSOCIATE_JUNIOR")))
                .andExpect(status().isForbidden());
    }

    @Test
    void validJwt_correctRole_returns2xx() throws Exception {
        // MANAGING_PARTNER can access /api/admin/users
        when(userRepository.findAll(any(org.springframework.data.domain.Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(activeUser)));

        mvc.perform(get("/api/admin/users")
                        .with(user("mp@firm.com").roles("MANAGING_PARTNER")))
                .andExpect(status().isOk());
    }
}
