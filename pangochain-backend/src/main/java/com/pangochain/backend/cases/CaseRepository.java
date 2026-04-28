package com.pangochain.backend.cases;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface CaseRepository extends JpaRepository<Case, UUID> {

    Page<Case> findByFirmId(UUID firmId, Pageable pageable);

    Page<Case> findByFirmIdAndStatus(UUID firmId, CaseStatus status, Pageable pageable);

    @Query("""
        SELECT c FROM Case c WHERE c.firm.id = :firmId
        AND (:status IS NULL OR c.status = :status)
        AND (LOWER(c.title) LIKE LOWER(CONCAT('%', :q, '%'))
             OR LOWER(c.caseType) LIKE LOWER(CONCAT('%', :q, '%')))
        """)
    Page<Case> searchByFirm(@Param("firmId") UUID firmId,
                             @Param("status") CaseStatus status,
                             @Param("q") String q,
                             Pageable pageable);

    @Query("""
        SELECT c FROM Case c
        JOIN CaseMember cm ON cm.caseId = c.id
        WHERE cm.userId = :userId
        ORDER BY c.createdAt DESC
        """)
    List<Case> findByMember(@Param("userId") UUID userId);

    long countByFirmIdAndStatus(UUID firmId, CaseStatus status);
}
