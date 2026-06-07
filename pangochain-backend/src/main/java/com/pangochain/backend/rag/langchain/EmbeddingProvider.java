package com.pangochain.backend.rag.langchain;

public interface EmbeddingProvider {
    boolean isAvailable();
    String modelName();
    int dimensions();
    float[] embed(String text);
}
