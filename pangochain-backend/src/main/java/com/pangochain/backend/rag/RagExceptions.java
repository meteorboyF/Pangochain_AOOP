package com.pangochain.backend.rag;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public final class RagExceptions {
    private RagExceptions() {
    }

    public static ResponseStatusException unavailable(String reason) {
        return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, reason);
    }

    public static ResponseStatusException sessionExpired() {
        return new ResponseStatusException(HttpStatus.CONFLICT,
                "RAG plaintext session expired. Re-open and re-index the relevant documents.");
    }

    public static ResponseStatusException invalid(String reason) {
        return new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, reason);
    }
}
