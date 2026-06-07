package com.pangochain.backend.rag.dto;

import java.util.Map;

public record RagHealthResponse(boolean available, String reason, String message, Map<String, Boolean> dependencies) {
}
