package com.pangochain.backend.rag.config;

import jakarta.validation.constraints.Min;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Getter
@Setter
@Validated
@ConfigurationProperties(prefix = "rag")
public class RagProperties {
    private boolean enabled = true;
    private boolean mockEnabled = false;

    @Min(60)
    private long sessionTtlSeconds = 1800;

    @Min(200)
    private int maxQuestionChars = 2000;

    @Min(1)
    private int maxChunksPerRequest = 120;

    @Min(500)
    private int maxChunkChars = 6000;

    @Min(1)
    private int defaultTopK = 6;

    private double minimumSimilarity = 0.72;
    private Embedding embedding = new Embedding();
    private Llm llm = new Llm();

    @Getter
    @Setter
    public static class Embedding {
        private String provider = "sentence-transformer";
        private String endpoint = "";
        private String model = "sentence-transformer/all-MiniLM-L6-v2";
        private String apiKey = "";
        private String baseUrl = "https://generativelanguage.googleapis.com/v1beta";

        @Min(1)
        private int dimensions = 384;
    }

    @Getter
    @Setter
    public static class Llm {
        private String provider = "http";
        private String endpoint = "";
        private String model = "local-legal-rag";
        private String apiKey = "";
        private String baseUrl = "https://generativelanguage.googleapis.com/v1beta";
    }
}
