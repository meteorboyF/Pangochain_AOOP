package com.pangochain.backend.rag;

import com.pangochain.backend.rag.dto.RagChatRequest;
import com.pangochain.backend.rag.dto.RagChatResponse;
import com.pangochain.backend.rag.dto.RagHealthResponse;
import com.pangochain.backend.rag.dto.RagIndexRequest;
import com.pangochain.backend.rag.dto.RagIndexResponse;
import com.pangochain.backend.rag.repository.RagEmbeddingRepository;
import com.pangochain.backend.user.User;
import com.pangochain.backend.user.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class RagController {
    private final RagDependencyHealthService healthService;
    private final RagIndexingService indexingService;
    private final RagChatService chatService;
    private final RagAccessService accessService;
    private final RagSessionPlaintextStore plaintextStore;
    private final RagEmbeddingRepository embeddingRepository;
    private final UserRepository userRepository;

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/api/rag/health")
    public ResponseEntity<RagHealthResponse> health() {
        return ResponseEntity.ok(healthService.health());
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/api/cases/{caseId}/rag/status")
    public ResponseEntity<Map<String, Object>> status(
            @PathVariable UUID caseId,
            @AuthenticationPrincipal UserDetails principal) {
        User user = resolveUser(principal);
        accessService.requireCaseAccess(caseId, user);
        RagHealthResponse health = healthService.health();
        return ResponseEntity.ok(Map.of(
                "caseId", caseId,
                "available", health.available(),
                "reason", health.reason(),
                "message", health.message(),
                "dependencies", health.dependencies(),
                "persistedEmbeddingCount", embeddingRepository.countByCase(caseId),
                "sessionPlaintextChunkCount", plaintextStore.count(user.getId(), caseId)
        ));
    }

    @PreAuthorize("isAuthenticated()")
    @PostMapping("/api/cases/{caseId}/rag/session/index")
    public ResponseEntity<RagIndexResponse> index(
            @PathVariable UUID caseId,
            @Valid @RequestBody RagIndexRequest request,
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(indexingService.index(caseId, resolveUser(principal), request));
    }

    @PreAuthorize("isAuthenticated()")
    @PostMapping("/api/cases/{caseId}/rag/chat")
    public ResponseEntity<RagChatResponse> chat(
            @PathVariable UUID caseId,
            @Valid @RequestBody RagChatRequest request,
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(chatService.ask(caseId, resolveUser(principal), request));
    }

    @PreAuthorize("isAuthenticated()")
    @DeleteMapping("/api/cases/{caseId}/rag/session")
    public ResponseEntity<Void> clearSession(
            @PathVariable UUID caseId,
            @AuthenticationPrincipal UserDetails principal) {
        User user = resolveUser(principal);
        accessService.requireCaseAccess(caseId, user);
        plaintextStore.clear(user.getId(), caseId);
        return ResponseEntity.noContent().build();
    }

    private User resolveUser(UserDetails principal) {
        return userRepository.findByEmail(principal.getUsername())
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found"));
    }
}
