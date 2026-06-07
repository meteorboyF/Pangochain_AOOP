package com.pangochain.backend.rag;

import com.pangochain.backend.rag.config.RagProperties;
import com.pangochain.backend.rag.dto.RagHealthResponse;
import com.pangochain.backend.rag.langchain.EmbeddingProvider;
import com.pangochain.backend.rag.langchain.LlmChatProvider;
import com.pangochain.backend.rag.repository.RagEmbeddingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class RagDependencyHealthService {
    private final RagProperties properties;
    private final RagEmbeddingRepository embeddingRepository;
    private final EmbeddingProvider embeddingProvider;
    private final LlmChatProvider llmChatProvider;

    public RagHealthResponse health() {
        Map<String, Boolean> deps = new LinkedHashMap<>();
        deps.put("featureEnabled", properties.isEnabled());
        deps.put("pgvector", embeddingRepository.isAvailable());
        deps.put("embeddingService", embeddingProvider.isAvailable());
        deps.put("llmEndpoint", llmChatProvider.isAvailable());

        if (!properties.isEnabled()) {
            return unavailable("RAG_DISABLED", "Case chat is disabled by configuration.", deps);
        }
        if (!deps.get("pgvector")) {
            return unavailable("PGVECTOR_UNAVAILABLE", "Case chat is unavailable because pgvector is not installed or migrated.", deps);
        }
        if (!deps.get("embeddingService")) {
            return unavailable("EMBEDDING_SERVICE_UNAVAILABLE", "Case chat is unavailable because the embedding service is not configured.", deps);
        }
        if (!deps.get("llmEndpoint")) {
            return unavailable("LLM_ENDPOINT_UNAVAILABLE", "Case chat is unavailable because the LLM endpoint is not configured.", deps);
        }
        return new RagHealthResponse(true, "READY", "Case chat is ready.", deps);
    }

    public void requireAvailable() {
        RagHealthResponse health = health();
        if (!health.available()) {
            throw RagExceptions.unavailable(health.reason());
        }
    }

    public void requireIndexingAvailable() {
        RagHealthResponse health = health();
        Map<String, Boolean> deps = health.dependencies();
        if (!Boolean.TRUE.equals(deps.get("featureEnabled"))) {
            throw RagExceptions.unavailable("RAG_DISABLED");
        }
        if (!Boolean.TRUE.equals(deps.get("pgvector"))) {
            throw RagExceptions.unavailable("PGVECTOR_UNAVAILABLE");
        }
        if (!Boolean.TRUE.equals(deps.get("embeddingService"))) {
            throw RagExceptions.unavailable("EMBEDDING_SERVICE_UNAVAILABLE");
        }
    }

    private RagHealthResponse unavailable(String reason, String message, Map<String, Boolean> deps) {
        return new RagHealthResponse(false, reason, message, deps);
    }
}
