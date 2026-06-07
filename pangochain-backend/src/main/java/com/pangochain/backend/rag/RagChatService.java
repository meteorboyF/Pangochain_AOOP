package com.pangochain.backend.rag;

import com.pangochain.backend.rag.config.RagProperties;
import com.pangochain.backend.rag.dto.RagChatRequest;
import com.pangochain.backend.rag.dto.RagChatResponse;
import com.pangochain.backend.rag.langchain.LlmChatProvider;
import com.pangochain.backend.rag.langchain.RagPromptFactory;
import com.pangochain.backend.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RagChatService {
    private final RagProperties properties;
    private final RagDependencyHealthService healthService;
    private final RagAccessService accessService;
    private final RagRetrievalService retrievalService;
    private final RagPromptFactory promptFactory;
    private final LlmChatProvider llmChatProvider;

    public RagChatResponse ask(UUID caseId, User user, RagChatRequest request) {
        healthService.requireAvailable();
        accessService.requireCaseAccess(caseId, user);
        String question = request.question().trim();
        if (question.length() > properties.getMaxQuestionChars()) {
            throw RagExceptions.invalid("Question exceeds maximum size");
        }

        int topK = request.topK() == null ? properties.getDefaultTopK() : Math.max(1, Math.min(20, request.topK()));
        List<RagRetrievedContext> contexts = retrievalService.retrieve(caseId, user.getId(), question, topK);
        if (contexts.isEmpty()) {
            return new RagChatResponse(
                    "I could not find enough information in the uploaded case documents to answer that. This is not legal advice.",
                    List.of(),
                    false);
        }

        String prompt = promptFactory.build(question, contexts);
        String answer = llmChatProvider.complete(prompt);
        if (!answer.toLowerCase().contains("legal advice")) {
            answer = answer + " This is not legal advice and only summarizes uploaded document evidence.";
        }
        return new RagChatResponse(answer, contexts.stream().map(RagRetrievedContext::citation).toList(), true);
    }
}
