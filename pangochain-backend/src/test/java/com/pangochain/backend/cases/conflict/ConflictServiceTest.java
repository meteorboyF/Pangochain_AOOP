package com.pangochain.backend.cases.conflict;

import com.pangochain.backend.cases.Case;
import com.pangochain.backend.cases.CaseRepository;
import com.pangochain.backend.cases.CaseStatus;
import com.pangochain.backend.cases.conflict.ConflictService.ConflictCheckRequest;
import com.pangochain.backend.cases.conflict.ConflictService.ConflictCheckResult;
import com.pangochain.backend.user.Firm;
import com.pangochain.backend.user.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ConflictServiceTest {

    private ConflictService service;
    private final UUID firmId = UUID.randomUUID();
    private User requester;

    private Case existing(String client, String opposing, String title) {
        return Case.builder()
                .id(UUID.randomUUID())
                .title(title)
                .clientName(client)
                .opposingParty(opposing)
                .status(CaseStatus.ACTIVE)
                .build();
    }

    @BeforeEach
    void setUp() {
        CaseRepository caseRepo = mock(CaseRepository.class);
        ConflictCheckLogRepository logRepo = mock(ConflictCheckLogRepository.class);
        when(logRepo.save(any(ConflictCheckLog.class))).thenAnswer(inv -> inv.getArgument(0));
        when(caseRepo.findByFirmId(firmId)).thenReturn(List.of(
                existing("Acme Corporation", "Globex LLC", "Acme v. Globex"),
                existing("Wayne Enterprises", "Ace Chemical", "Wayne contract review")));

        Firm firm = mock(Firm.class);
        when(firm.getId()).thenReturn(firmId);
        requester = mock(User.class);
        when(requester.getFirm()).thenReturn(firm);
        when(requester.getId()).thenReturn(UUID.randomUUID());
        when(requester.getEmail()).thenReturn("lawyer@firm.com");

        service = new ConflictService(caseRepo, logRepo);
    }

    @Test
    void exactClientName_flagsConflict() {
        ConflictCheckResult r = service.check(
                new ConflictCheckRequest("Acme Corporation", "New Defendant", null, false), requester);
        assertThat(r.hasConflicts()).isTrue();
        assertThat(r.matches()).anySatisfy(m -> {
            assertThat(m.matchedField()).isEqualTo("client");
            assertThat(m.score()).isGreaterThanOrEqualTo(90);
        });
    }

    @Test
    void typoInName_stillFuzzyMatches() {
        // "Acme Corporatin" (missing 'o') should still match "Acme Corporation".
        ConflictCheckResult r = service.check(
                new ConflictCheckRequest("Acme Corporatin", null, null, false), requester);
        assertThat(r.hasConflicts()).isTrue();
    }

    @Test
    void opposingPartyBecomesClient_isDetectedAsRelatedConflict() {
        // A party that was previously an opponent now appearing as our client is a classic conflict.
        ConflictCheckResult r = service.check(
                new ConflictCheckRequest("Globex LLC", null, null, false), requester);
        assertThat(r.hasConflicts()).isTrue();
        assertThat(r.matches()).anySatisfy(m -> assertThat(m.matchedField()).isEqualTo("opposing party"));
    }

    @Test
    void unrelatedParty_noConflict() {
        ConflictCheckResult r = service.check(
                new ConflictCheckRequest("Stark Industries", "Hammer Tech", null, false), requester);
        assertThat(r.hasConflicts()).isFalse();
        assertThat(r.matches()).isEmpty();
    }

    @Test
    void relatedPartiesList_isSplitAndMatched() {
        ConflictCheckResult r = service.check(
                new ConflictCheckRequest("Fresh Client", null, "Some Person; Globex LLC, Another", false), requester);
        assertThat(r.hasConflicts()).isTrue();
    }
}
