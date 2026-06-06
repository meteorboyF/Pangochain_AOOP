package com.pangochain.backend.auth;

import com.pangochain.backend.crypto.Pbkdf2Service;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** Unit tests for recovery-code generation/consumption against an in-memory fake repository. */
class RecoveryCodeServiceTest {

    private RecoveryCodeService service;
    private final UUID userId = UUID.randomUUID();
    private List<UserRecoveryCode> store;

    @BeforeEach
    void setUp() {
        store = new ArrayList<>();
        UserRecoveryCodeRepository repo = mock(UserRecoveryCodeRepository.class);

        when(repo.save(any(UserRecoveryCode.class))).thenAnswer(inv -> {
            UserRecoveryCode c = inv.getArgument(0);
            if (!store.contains(c)) store.add(c);
            return c;
        });
        when(repo.findByUserIdAndUsedFalse(any(UUID.class))).thenAnswer(inv -> store.stream()
                .filter(c -> c.getUserId().equals(inv.getArgument(0)) && !c.isUsed())
                .toList());
        when(repo.countByUserIdAndUsedFalse(any(UUID.class))).thenAnswer(inv -> store.stream()
                .filter(c -> c.getUserId().equals(inv.getArgument(0)) && !c.isUsed())
                .count());
        // deleteAllForUser is void — Mockito's default no-op is fine, but mirror it in the store
        org.mockito.Mockito.doAnswer(inv -> {
            store.removeIf(c -> c.getUserId().equals(inv.getArgument(0)));
            return null;
        }).when(repo).deleteAllForUser(any(UUID.class));

        service = new RecoveryCodeService(repo, new Pbkdf2Service());
    }

    @Test
    void regenerate_issuesTenDistinctCodes() {
        List<String> codes = service.regenerate(userId);
        assertThat(codes).hasSize(RecoveryCodeService.CODE_COUNT);
        assertThat(codes).doesNotHaveDuplicates();
        assertThat(service.remaining(userId)).isEqualTo(RecoveryCodeService.CODE_COUNT);
    }

    @Test
    void consume_validCode_succeedsOnceThenIsRejected() {
        List<String> codes = service.regenerate(userId);
        String code = codes.get(3);

        assertThat(service.consume(userId, code)).isTrue();
        assertThat(service.remaining(userId)).isEqualTo(RecoveryCodeService.CODE_COUNT - 1);
        // Single-use: the same code cannot be consumed again.
        assertThat(service.consume(userId, code)).isFalse();
    }

    @Test
    void consume_isCaseAndFormatInsensitive() {
        String code = service.regenerate(userId).get(0);
        String messy = "  " + code.toLowerCase().replace("-", " ") + "  ";
        assertThat(service.consume(userId, messy)).isTrue();
    }

    @Test
    void consume_unknownOrBlankCode_returnsFalse() {
        service.regenerate(userId);
        assertThat(service.consume(userId, "ZZZZZ-ZZZZZ")).isFalse();
        assertThat(service.consume(userId, "")).isFalse();
        assertThat(service.consume(userId, null)).isFalse();
    }

    @Test
    void regenerate_invalidatesPreviousCodes() {
        String oldCode = service.regenerate(userId).get(0);
        service.regenerate(userId); // fresh set wipes the old one
        assertThat(service.consume(userId, oldCode)).isFalse();
        assertThat(service.remaining(userId)).isEqualTo(RecoveryCodeService.CODE_COUNT);
    }
}
