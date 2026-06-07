package com.pangochain.backend.rag.dto;

import java.util.UUID;

public record RagCitationDto(
        String citationId,
        UUID documentId,
        String fileName,
        Integer pageNumber,
        Integer chunkIndex,
        String chunkId,
        double similarity
) {
}
