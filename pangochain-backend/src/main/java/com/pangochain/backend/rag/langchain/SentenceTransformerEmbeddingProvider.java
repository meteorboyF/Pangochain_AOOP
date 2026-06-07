package com.pangochain.backend.rag.langchain;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pangochain.backend.rag.RagExceptions;
import com.pangochain.backend.rag.config.RagProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class SentenceTransformerEmbeddingProvider implements EmbeddingProvider {
    private final RagProperties properties;
    private final ObjectMapper objectMapper;
    private final WebClient.Builder webClientBuilder;

    @Override
    public boolean isAvailable() {
        if (isGemini()) {
            return !properties.getEmbedding().getApiKey().isBlank();
        }
        return properties.isMockEnabled() || !properties.getEmbedding().getEndpoint().isBlank();
    }

    @Override
    public String modelName() {
        return properties.isMockEnabled() ? "mock-" + properties.getEmbedding().getModel()
                : properties.getEmbedding().getModel();
    }

    @Override
    public int dimensions() {
        return properties.getEmbedding().getDimensions();
    }

    @Override
    public float[] embed(String text) {
        if (isGemini()) {
            return embedWithGemini(text);
        }
        if (properties.isMockEnabled() && properties.getEmbedding().getEndpoint().isBlank()) {
            return deterministicEmbedding(text, dimensions());
        }
        if (properties.getEmbedding().getEndpoint().isBlank()) {
            throw RagExceptions.unavailable("EMBEDDING_SERVICE_UNAVAILABLE");
        }
        try {
            String response = webClientBuilder.build()
                    .post()
                    .uri(properties.getEmbedding().getEndpoint())
                    .bodyValue(Map.of("model", properties.getEmbedding().getModel(), "inputs", List.of(text)))
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();
            return parseEmbedding(response);
        } catch (Exception ex) {
            throw RagExceptions.unavailable("EMBEDDING_SERVICE_UNAVAILABLE");
        }
    }

    private boolean isGemini() {
        return "gemini".equalsIgnoreCase(properties.getEmbedding().getProvider());
    }

    private float[] embedWithGemini(String text) {
        try {
            String model = properties.getEmbedding().getModel();
            String uri = "%s/models/%s:embedContent"
                    .formatted(trimTrailingSlash(properties.getEmbedding().getBaseUrl()), model);
            Map<String, Object> body = Map.of(
                    "model", "models/" + model,
                    "content", Map.of("parts", List.of(Map.of("text", text))),
                    "output_dimensionality", properties.getEmbedding().getDimensions()
            );
            String response = webClientBuilder.build()
                    .post()
                    .uri(uri)
                    .header("x-goog-api-key", properties.getEmbedding().getApiKey())
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();
            return parseEmbedding(response);
        } catch (Exception ex) {
            throw RagExceptions.unavailable("EMBEDDING_SERVICE_UNAVAILABLE");
        }
    }

    private float[] parseEmbedding(String response) throws Exception {
        JsonNode root = objectMapper.readTree(response);
        JsonNode vector = root.path("embedding");
        if (vector.has("values")) {
            vector = vector.path("values");
        }
        if (vector.isMissingNode()) {
            vector = root.path("embeddings").isArray() ? root.path("embeddings").path(0) : root.path(0);
        }
        if (vector.has("values")) {
            vector = vector.path("values");
        }
        if (!vector.isArray()) {
            throw new IllegalArgumentException("Embedding response did not contain a vector");
        }
        float[] values = new float[vector.size()];
        for (int i = 0; i < vector.size(); i++) {
            values[i] = (float) vector.get(i).asDouble();
        }
        return values;
    }

    private float[] deterministicEmbedding(String text, int dimensions) {
        float[] values = new float[dimensions];
        String normalized = text == null ? "" : text.toLowerCase();
        for (String token : normalized.split("[^a-z0-9]+")) {
            if (token.isBlank()) {
                continue;
            }
            String hash = sha256(token);
            int idx = Math.floorMod(hash.hashCode(), dimensions);
            values[idx] += 1.0f;
        }
        float norm = 0.0f;
        for (float value : values) {
            norm += value * value;
        }
        norm = (float) Math.sqrt(norm);
        if (norm > 0.0f) {
            for (int i = 0; i < values.length; i++) {
                values[i] = values[i] / norm;
            }
        }
        return values;
    }

    private String sha256(String text) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(text.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            return text;
        }
    }

    private String trimTrailingSlash(String value) {
        if (value == null || value.isBlank()) {
            return "https://generativelanguage.googleapis.com/v1beta";
        }
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }
}
