package com.pangochain.backend.rag.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record RagChunkDto(
        @NotBlank String chunkId,
        Integer pageNumber,
        @NotNull Integer chunkIndex,
        @NotBlank String text
) {
}
