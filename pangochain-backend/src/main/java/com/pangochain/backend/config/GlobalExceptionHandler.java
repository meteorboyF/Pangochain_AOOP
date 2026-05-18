package com.pangochain.backend.config;

import com.pangochain.backend.auth.InvalidMfaCodeException;
import com.pangochain.backend.auth.MfaChallengeRequiredException;
import com.pangochain.backend.auth.MfaSetupRequiredException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(MfaSetupRequiredException.class)
    public org.springframework.http.ResponseEntity<Map<String, Object>> handleMfaSetupRequired(MfaSetupRequiredException ex) {
        return org.springframework.http.ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of(
                        "requiresMfaSetup", true,
                        "setupToken", ex.getSetupToken(),
                        "message", ex.getMessage()
                ));
    }

    @ExceptionHandler(MfaChallengeRequiredException.class)
    public org.springframework.http.ResponseEntity<Map<String, Object>> handleMfaChallenge(MfaChallengeRequiredException ex) {
        return org.springframework.http.ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(Map.of(
                        "requiresMfaCode", true,
                        "challengeToken", ex.getChallengeToken(),
                        "message", ex.getMessage()
                ));
    }

    @ExceptionHandler(InvalidMfaCodeException.class)
    public org.springframework.http.ResponseEntity<Map<String, String>> handleInvalidMfa(InvalidMfaCodeException ex) {
        return org.springframework.http.ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("error", ex.getMessage()));
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ProblemDetail handleResponseStatus(ResponseStatusException ex) {
        ProblemDetail detail = ProblemDetail.forStatusAndDetail(ex.getStatusCode(), ex.getReason());
        detail.setType(URI.create("about:blank"));
        return detail;
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> errors = ex.getBindingResult().getFieldErrors().stream()
                .collect(Collectors.toMap(FieldError::getField, fe ->
                        fe.getDefaultMessage() != null ? fe.getDefaultMessage() : "Invalid value"));
        ProblemDetail detail = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST, "Validation failed");
        detail.setProperty("errors", errors);
        return detail;
    }

    @ExceptionHandler(Exception.class)
    public ProblemDetail handleGeneral(Exception ex) {
        log.error("Unhandled exception", ex);
        return ProblemDetail.forStatusAndDetail(
                HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred");
    }
}
