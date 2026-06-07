package com.pangochain.backend.rag.repository;

import java.util.UUID;

public record RagChunkMatch(
        UUID id,
        UUID caseId,
        UUID documentId,
        String chunkId,
        String fileName,
        Integer pageNumber,
        Integer chunkIndex,
        String chunkHashSha256,
        double similarity
) {
}
