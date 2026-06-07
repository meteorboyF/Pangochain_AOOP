package com.pangochain.backend.rag;

import com.pangochain.backend.rag.config.RagProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Component
@RequiredArgsConstructor
public class RagSessionPlaintextStore {
    private final RagProperties properties;
    private final Map<Key, Entry> entries = new ConcurrentHashMap<>();

    public void put(UUID userId, UUID caseId, UUID documentId, String chunkId, String text) {
        Instant expiresAt = Instant.now().plusSeconds(properties.getSessionTtlSeconds());
        entries.put(new Key(userId, caseId, documentId, chunkId), new Entry(text, expiresAt));
    }

    public Optional<String> get(UUID userId, UUID caseId, UUID documentId, String chunkId) {
        Key key = new Key(userId, caseId, documentId, chunkId);
        Entry entry = entries.get(key);
        if (entry == null) {
            return Optional.empty();
        }
        if (entry.expiresAt().isBefore(Instant.now())) {
            entries.remove(key);
            return Optional.empty();
        }
        return Optional.of(entry.text());
    }

    public void clear(UUID userId, UUID caseId) {
        entries.keySet().removeIf(key -> key.userId().equals(userId) && key.caseId().equals(caseId));
    }

    public int count(UUID userId, UUID caseId) {
        cleanupExpired();
        return (int) entries.keySet().stream()
                .filter(key -> key.userId().equals(userId) && key.caseId().equals(caseId))
                .count();
    }

    @Scheduled(fixedDelay = 60_000)
    void cleanupExpired() {
        Instant now = Instant.now();
        entries.entrySet().removeIf(entry -> entry.getValue().expiresAt().isBefore(now));
    }

    private record Key(UUID userId, UUID caseId, UUID documentId, String chunkId) {
    }

    private record Entry(String text, Instant expiresAt) {
    }
}
