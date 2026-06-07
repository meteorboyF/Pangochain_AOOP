package com.pangochain.backend.rag;

import com.pangochain.backend.rag.config.RagProperties;
import com.pangochain.backend.rag.langchain.EmbeddingProvider;
import com.pangochain.backend.rag.repository.RagEmbeddingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RagRetrievalService {
    private final RagProperties properties;
    private final EmbeddingProvider embeddingProvider;
    private final RagEmbeddingRepository embeddingRepository;
    private final RagSessionPlaintextStore plaintextStore;

    public List<RagRetrievedContext> retrieve(UUID caseId, UUID userId, String question, int topK) {
        float[] queryEmbedding = embeddingProvider.embed(question);
        return embeddingRepository.search(caseId, queryEmbedding, topK).stream()
                .filter(match -> match.similarity() >= properties.getMinimumSimilarity())
                .map(match -> plaintextStore.get(userId, caseId, match.documentId(), match.chunkId())
                        .map(text -> new RagRetrievedContext(match.documentId(), match.fileName(),
                                match.pageNumber(), match.chunkIndex(), match.chunkId(), match.similarity(), text))
                        .orElse(null))
                .filter(ctx -> ctx != null)
                .toList();
    }
}
