package com.pangochain.backend.cases;

import com.pangochain.backend.cases.dto.CaseCreateRequest;
import com.pangochain.backend.cases.dto.CaseDto;
import com.pangochain.backend.user.User;
import com.pangochain.backend.user.UserRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/cases")
@RequiredArgsConstructor
public class CaseController {

    private final CaseService caseService;
    private final UserRepository userRepository;

    @PersistenceContext
    private EntityManager em;

    @PostMapping
    public ResponseEntity<CaseDto> create(
            @Valid @RequestBody CaseCreateRequest req,
            @AuthenticationPrincipal UserDetails principal) {
        User creator = resolveUser(principal);
        return ResponseEntity.ok(caseService.create(req, creator));
    }

    @GetMapping
    public ResponseEntity<Page<CaseDto>> list(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal UserDetails principal) {
        User user = resolveUser(principal);
        UUID firmId = user.getFirm() != null ? user.getFirm().getId() : null;
        CaseStatus caseStatus = (status != null && !status.isBlank()) ? CaseStatus.valueOf(status) : null;
        return ResponseEntity.ok(caseService.listByFirm(firmId, caseStatus, q, page, size));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CaseDto> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(caseService.getById(id));
    }

    @PostMapping("/{id}/close")
    public ResponseEntity<CaseDto> close(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails principal) {
        User closer = resolveUser(principal);
        return ResponseEntity.ok(caseService.close(id, closer));
    }

    /** Link a client user to a case (lawyer/partner only) */
    @PostMapping("/{id}/clients")
    @Transactional
    public ResponseEntity<Map<String, String>> addClient(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetails principal) {
        UUID clientId = UUID.fromString(body.get("clientId"));
        User caller = resolveUser(principal);
        em.createNativeQuery(
                "INSERT INTO case_clients (case_id, client_id, added_by) VALUES (:c, :u, :a) ON CONFLICT DO NOTHING"
        ).setParameter("c", id).setParameter("u", clientId).setParameter("a", caller.getId()).executeUpdate();
        return ResponseEntity.ok(Map.of("status", "linked"));
    }

    /** Get all cases a client is associated with */
    @GetMapping("/my-cases")
    @SuppressWarnings("unchecked")
    public ResponseEntity<List<CaseDto>> myCases(@AuthenticationPrincipal UserDetails principal) {
        User user = resolveUser(principal);
        List<UUID> caseIds = em.createNativeQuery(
                "SELECT case_id FROM case_clients WHERE client_id = :uid"
        ).setParameter("uid", user.getId()).getResultList();
        List<CaseDto> result = caseIds.stream()
                .map(cid -> caseService.getById(cid))
                .toList();
        return ResponseEntity.ok(result);
    }

    private User resolveUser(UserDetails principal) {
        return userRepository.findByEmail(principal.getUsername())
                .orElseThrow(() -> new IllegalStateException("User not found"));
    }
}
