package com.pangochain.backend.hearing;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pangochain.backend.audit.AuditService;
import com.pangochain.backend.auth.JwtTokenProvider;
import com.pangochain.backend.cases.Case;

import com.pangochain.backend.cases.CaseRepository;
import com.pangochain.backend.cases.CaseStatus;
import com.pangochain.backend.user.AccountStatus;
import com.pangochain.backend.user.Firm;
import com.pangochain.backend.user.User;
import com.pangochain.backend.user.UserRepository;
import com.pangochain.backend.user.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(HearingController.class)
@TestPropertySource(properties = {
        "jwt.secret=test-secret-at-least-32-chars-long-for-pangochain-tests",
        "jwt.access-token-expiry=3600",
        "jwt.refresh-token-expiry=86400"
})
class HearingControllerTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean HearingRepository hearingRepository;
    @MockBean CaseRepository caseRepository;
    @MockBean UserRepository userRepository;
    @MockBean AuditService auditService;
    // JwtTokenProvider is @Component but not in WebMvcTest's scan scope — mock it.
    // @WithMockUser bypasses JWT filter entirely, so JwtTokenProvider is never called.
    @MockBean JwtTokenProvider jwtTokenProvider;

    private UUID userId;
    private UUID firmId;
    private UUID caseId;
    private Firm firm;
    private User lawyer;
    private Case legalCase;

    @BeforeEach
    void setup() {
        userId = UUID.randomUUID();
        firmId = UUID.randomUUID();
        caseId = UUID.randomUUID();

        firm = Firm.builder().id(firmId).name("Test Firm").mspId("TestMSP").build();
        lawyer = User.builder()
                .id(userId).email("user").fullName("Test Lawyer")
                .role(UserRole.ASSOCIATE_SENIOR).status(AccountStatus.ACTIVE).firm(firm)
                .build();
        legalCase = Case.builder()
                .id(caseId).title("Case A").firm(firm)
                .createdBy(lawyer).status(CaseStatus.ACTIVE).build();
    }

    @Test
    @WithMockUser(username = "user", roles = {"ASSOCIATE_SENIOR"})
    void createHearing_savesAndReturns() throws Exception {
        UUID hearingId = UUID.randomUUID();
        Instant futureDate = Instant.now().plusSeconds(86_400);

        Hearing savedHearing = Hearing.builder()
                .id(hearingId).legalCase(legalCase).title("Pre-Trial Hearing")
                .hearingDate(futureDate).location("Court 1")
                .courtName("High Court").hearingType("COURT_HEARING")
                .createdBy(lawyer).build();

        when(userRepository.findByEmail("user")).thenReturn(Optional.of(lawyer));
        when(caseRepository.findById(caseId)).thenReturn(Optional.of(legalCase));
        when(hearingRepository.save(any())).thenReturn(savedHearing);

        String body = """
                {
                  "caseId": "%s",
                  "title": "Pre-Trial Hearing",
                  "hearingDate": "%s",
                  "location": "Court 1",
                  "courtName": "High Court"
                }
                """.formatted(caseId, futureDate.toString());

        mvc.perform(post("/api/hearings")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Pre-Trial Hearing"));

        verify(hearingRepository).save(any(Hearing.class));
        verify(auditService).log(eq("HEARING_SCHEDULED"), eq(userId), eq("HEARING"), eq(hearingId.toString()), isNull(), any());
    }

    @Test
    @WithMockUser(username = "user", roles = {"ASSOCIATE_SENIOR"})
    void getUpcomingHearings_returnsOnlyFuture() throws Exception {
        Instant futureDate = Instant.now().plusSeconds(86_400);

        Hearing upcoming = Hearing.builder()
                .id(UUID.randomUUID()).legalCase(legalCase).title("Upcoming")
                .hearingDate(futureDate).hearingType("COURT_HEARING")
                .createdBy(lawyer).build();

        when(userRepository.findByEmail("user")).thenReturn(Optional.of(lawyer));
        when(hearingRepository.findUpcomingByFirm(eq(firmId), any(Instant.class)))
                .thenReturn(List.of(upcoming));

        mvc.perform(get("/api/hearings/upcoming"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("Upcoming"));

        verify(hearingRepository).findUpcomingByFirm(eq(firmId), any(Instant.class));
    }

    @Test
    @WithMockUser(username = "user", roles = {"ASSOCIATE_SENIOR"})
    void sendReminder_auditsHighPriority() throws Exception {
        UUID hearingId = UUID.randomUUID();
        Instant futureDate = Instant.now().plusSeconds(86_400);

        Hearing hearing = Hearing.builder()
                .id(hearingId).legalCase(legalCase).title("Final Hearing")
                .hearingDate(futureDate).hearingType("COURT_HEARING")
                .createdBy(lawyer).build();

        when(userRepository.findByEmail("user")).thenReturn(Optional.of(lawyer));
        when(hearingRepository.findById(hearingId)).thenReturn(Optional.of(hearing));

        mvc.perform(post("/api/hearings/{id}/remind", hearingId)
                        .with(csrf()))
                .andExpect(status().isNoContent());

        verify(auditService).log(eq("HEARING_REMINDER_SENT"), eq(userId), eq("HEARING"),
                eq(hearingId.toString()), isNull(), contains("HIGH"));
    }
}
