package com.pangochain.backend.rag;

import com.pangochain.backend.rag.config.RagProperties;
import com.pangochain.backend.rag.dto.RagChunkDto;
import com.pangochain.backend.rag.dto.RagDocumentIndexDto;
import com.pangochain.backend.rag.dto.RagIndexRequest;
import com.pangochain.backend.rag.dto.RagIndexResponse;
import com.pangochain.backend.rag.langchain.EmbeddingProvider;
import com.pangochain.backend.rag.repository.RagEmbeddingRepository;
import com.pangochain.backend.user.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class RagIndexingService {
    private final RagProperties properties;
    private final RagDependencyHealthService healthService;
    private final RagAccessService accessService;
    private final RagSessionPlaintextStore plaintextStore;
    private final EmbeddingProvider embeddingProvider;
    private final RagEmbeddingRepository embeddingRepository;

    @Transactional
    public RagIndexResponse index(UUID caseId, User user, RagIndexRequest request) {
        healthService.requireIndexingAvailable();
        accessService.requireCaseAccess(caseId, user);

        int chunkTotal = request.documents().stream().mapToInt(doc -> doc.chunks().size()).sum();
        if (chunkTotal > properties.getMaxChunksPerRequest()) {
            throw RagExceptions.invalid("Too many chunks in one indexing request");
        }

        int indexed = 0;
        for (RagDocumentIndexDto doc : request.documents()) {
            accessService.requireDocumentInCase(caseId, doc.documentId());
            for (RagChunkDto chunk : doc.chunks()) {
                try {
                    if (chunk.text().length() > properties.getMaxChunkChars()) {
                        throw RagExceptions.invalid("Chunk text exceeds maximum size");
                    }
                    String normalizedChunkId = normalizeChunkId(doc.documentId(), chunk);
                    String hash = sha256(chunk.text());
                    plaintextStore.put(user.getId(), caseId, doc.documentId(), normalizedChunkId, chunk.text());
                    float[] embedding = embeddingProvider.embed(chunk.text());
                    embeddingRepository.upsert(caseId, doc.documentId(), normalizedChunkId, doc.fileName(),
                            chunk.pageNumber(), chunk.chunkIndex(), hash, embedding, embeddingProvider.modelName());
                    indexed++;
                } catch (org.springframework.web.server.ResponseStatusException ex) {
                    throw ex;
                } catch (Exception ex) {
                    log.warn("RAG indexing failed for case={} doc={} chunk={}: {}",
                            caseId, doc.documentId(), chunk.chunkId(), ex.getMessage());
                    throw RagExceptions.invalid("Could not index " + doc.fileName + ". Please retry or choose another document.");
                }
            }
        }
        return new RagIndexResponse(caseId, indexed, "READY", properties.getSessionTtlSeconds());
    }

    private String normalizeChunkId(UUID documentId, RagChunkDto chunk) {
        if (chunk.chunkId() != null && !chunk.chunkId().isBlank()) {
            return chunk.chunkId();
        }
        return documentId + ":p" + (chunk.pageNumber() == null ? "unknown" : chunk.pageNumber()) + ":c" + chunk.chunkIndex();
    }

    private String sha256(String text) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(text.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("Could not hash chunk");
        }
    }
}
