package com.pangochain.backend.caseevent;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CaseEventRepository extends JpaRepository<CaseEvent, UUID> {
    List<CaseEvent> findByLegalCaseIdOrderByCreatedAtDesc(UUID caseId);
}
