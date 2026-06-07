package com.pangochain.backend.rag.langchain;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pangochain.backend.rag.RagExceptions;
import com.pangochain.backend.rag.config.RagProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Map;

@Component
@RequiredArgsConstructor
public class HttpLlmChatProvider implements LlmChatProvider {
    private final RagProperties properties;
    private final ObjectMapper objectMapper;
    private final WebClient.Builder webClientBuilder;

    @Override
    public boolean isAvailable() {
        if (isGemini()) {
            return !properties.getLlm().getApiKey().isBlank();
        }
        return properties.isMockEnabled() || !properties.getLlm().getEndpoint().isBlank();
    }

    @Override
    public String modelName() {
        return properties.isMockEnabled() ? "mock-" + properties.getLlm().getModel() : properties.getLlm().getModel();
    }

    @Override
    public String complete(String prompt) {
        if (properties.isMockEnabled()) {
            return mockAnswer(prompt);
        }
        if (isGemini()) {
            return completeWithGemini(prompt);
        }
        if (properties.getLlm().getEndpoint().isBlank()) {
            throw RagExceptions.unavailable("LLM_ENDPOINT_UNAVAILABLE");
        }
        try {
            String response = webClientBuilder.build()
                    .post()
                    .uri(properties.getLlm().getEndpoint())
                    .bodyValue(Map.of("model", properties.getLlm().getModel(), "prompt", prompt))
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();
            return parseCompletion(response);
        } catch (Exception ex) {
            throw RagExceptions.unavailable("LLM_ENDPOINT_UNAVAILABLE");
        }
    }

    private boolean isGemini() {
        return "gemini".equalsIgnoreCase(properties.getLlm().getProvider());
    }

    private String completeWithGemini(String prompt) {
        try {
            String uri = "%s/models/%s:generateContent"
                    .formatted(trimTrailingSlash(properties.getLlm().getBaseUrl()), properties.getLlm().getModel());
            Map<String, Object> body = Map.of(
                    "contents", java.util.List.of(Map.of(
                            "parts", java.util.List.of(Map.of("text", prompt))
                    )),
                    "generationConfig", Map.of(
                            "temperature", 0.1,
                            "topP", 0.8
                    )
            );
            String response = webClientBuilder.build()
                    .post()
                    .uri(uri)
                    .header("x-goog-api-key", properties.getLlm().getApiKey())
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();
            return parseCompletion(response);
        } catch (Exception ex) {
            throw RagExceptions.unavailable("LLM_ENDPOINT_UNAVAILABLE");
        }
    }

    private String parseCompletion(String response) throws Exception {
        JsonNode root = objectMapper.readTree(response);
        JsonNode content = root.path("choices").path(0).path("message").path("content");
        if (!content.isMissingNode() && !content.asText().isBlank()) {
            return content.asText();
        }
        JsonNode geminiParts = root.path("candidates").path(0).path("content").path("parts");
        if (geminiParts.isArray()) {
            StringBuilder sb = new StringBuilder();
            for (JsonNode part : geminiParts) {
                if (part.hasNonNull("text")) {
                    sb.append(part.path("text").asText());
                }
            }
            if (!sb.isEmpty()) {
                return sb.toString();
            }
        }
        for (String field : new String[]{"response", "text", "content", "answer"}) {
            if (root.hasNonNull(field)) {
                return root.path(field).asText();
            }
        }
        return response;
    }

    private String mockAnswer(String prompt) {
        int start = prompt.indexOf("Retrieved case document excerpts:");
        String context = start >= 0 ? prompt.substring(start) : prompt;
        String[] lines = context.split("\\R");
        String citation = "";
        String evidence = "";
        for (String line : lines) {
            if (line.startsWith("[CITATION:")) {
                citation = line.substring("[CITATION:".length(), line.length() - 1);
            } else if (evidence.isBlank() && !line.isBlank() && !line.startsWith("File:")
                    && !line.startsWith("Page:") && !line.startsWith("Chunk:")
                    && !line.startsWith("Text:") && !line.startsWith("Retrieved")) {
                evidence = line.trim();
            }
        }
        if (evidence.isBlank()) {
            return "I could not find enough information in the uploaded case documents to answer that. This is not legal advice.";
        }
        String suffix = citation.isBlank() ? "" : " [" + citation + "]";
        return evidence + suffix + " This summarizes uploaded document evidence only and is not legal advice.";
    }

    private String trimTrailingSlash(String value) {
        if (value == null || value.isBlank()) {
            return "https://generativelanguage.googleapis.com/v1beta";
        }
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }
}
