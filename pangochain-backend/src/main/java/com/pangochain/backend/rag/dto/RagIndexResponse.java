package com.pangochain.backend.rag.dto;

import java.util.UUID;

public record RagIndexResponse(UUID caseId, int indexedChunkCount, String status, long plaintextTtlSeconds) {
}
