package com.pangochain.backend.document;

import com.pangochain.backend.document.dto.DocumentDto;
import com.pangochain.backend.document.dto.DocumentUploadRequest;
import com.pangochain.backend.user.User;
import com.pangochain.backend.user.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;
    private final UserRepository userRepository;

    /**
     * POST /api/documents/upload
     * Accepts ciphertext + metadata from browser, pins to IPFS, anchors on Fabric.
     */
    @PostMapping("/upload")
    public ResponseEntity<DocumentDto> upload(
            @Valid @RequestBody DocumentUploadRequest req,
            @AuthenticationPrincipal UserDetails principal) {
        User uploader = resolveUser(principal);
        DocumentDto dto = documentService.upload(req, uploader);
        return ResponseEntity.ok(dto);
    }

    /**
     * GET /api/documents/{id}/ciphertext
     * Returns raw ciphertext bytes (IPFS content). Browser decrypts with WebCrypto.
     * Requires JWT + Fabric CheckAccess (two-layer ACL).
     */
    @GetMapping("/{id}/ciphertext")
    public ResponseEntity<byte[]> downloadCiphertext(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails principal) {
        User requester = resolveUser(principal);
        byte[] ciphertext = documentService.downloadCiphertext(id, requester);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"encrypted.bin\"")
                .body(ciphertext);
    }

    /**
     * GET /api/documents/{id}/wrapped-key
     * Returns the ECIES-wrapped document key for the calling user.
     * Browser uses this with the private key to recover the AES doc key.
     */
    @GetMapping("/{id}/wrapped-key")
    public ResponseEntity<String> getWrappedKey(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails principal) {
        User requester = resolveUser(principal);
        String token = documentService.getWrappedKey(id, requester);
        return ResponseEntity.ok(token);
    }

    /**
     * GET /api/documents/by-case/{caseId}
     * Lists all active documents for a case (metadata only, no ciphertext).
     */
    @GetMapping("/by-case/{caseId}")
    public ResponseEntity<List<DocumentDto>> listByCase(@PathVariable UUID caseId) {
        return ResponseEntity.ok(documentService.listByCase(caseId));
    }

    /**
     * GET /api/documents
     * Lists all documents accessible to the calling user.
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> listAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @AuthenticationPrincipal UserDetails principal) {
        User user = resolveUser(principal);
        List<DocumentDto> content = documentService.listAccessibleByUser(user);
        int total = content.size();
        int from = Math.min(page * size, total);
        int to = Math.min(from + size, total);
        return ResponseEntity.ok(Map.of(
                "content", content.subList(from, to),
                "totalElements", total,
                "totalPages", (int) Math.ceil((double) total / size),
                "number", page
        ));
    }

    private User resolveUser(UserDetails principal) {
        return userRepository.findByEmail(principal.getUsername())
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found"));
    }
}
