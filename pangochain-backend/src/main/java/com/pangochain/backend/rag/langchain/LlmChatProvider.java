package com.pangochain.backend.rag.langchain;

public interface LlmChatProvider {
    boolean isAvailable();
    String modelName();
    String complete(String prompt);
}
