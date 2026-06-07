package com.pangochain.backend.rag.dto;

import jakarta.validation.constraints.NotBlank;

public record RagChatRequest(@NotBlank String question, Integer topK) {
}
