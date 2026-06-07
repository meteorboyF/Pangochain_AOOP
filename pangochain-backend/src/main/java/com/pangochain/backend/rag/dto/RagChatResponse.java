package com.pangochain.backend.rag.dto;

import java.util.List;

public record RagChatResponse(String answer, List<RagCitationDto> citations, boolean grounded) {
}
