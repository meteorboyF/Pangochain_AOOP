package com.pangochain.backend.rag;

import com.pangochain.backend.rag.dto.RagCitationDto;

import java.util.UUID;

public record RagRetrievedContext(
        UUID documentId,
        String fileName,
        Integer pageNumber,
        Integer chunkIndex,
        String chunkId,
        double similarity,
        String text
) {
    public String citationId() {
        return documentId + ":p" + (pageNumber == null ? "unknown" : pageNumber) + ":c" + chunkIndex;
    }

    public RagCitationDto citation() {
        return new RagCitationDto(citationId(), documentId, fileName, pageNumber, chunkIndex, chunkId, similarity);
    }
}
