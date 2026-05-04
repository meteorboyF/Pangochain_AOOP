package com.pangochain.backend.document;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface DocumentRepository extends JpaRepository<Document, UUID> {

    List<Document> findByLegalCaseIdAndStatus(UUID caseId, DocStatus status);

    Page<Document> findByLegalCaseId(UUID caseId, Pageable pageable);

    @Query("""
        SELECT d FROM Document d
        JOIN DocumentAccess da ON da.docId = d.id
        WHERE da.userId = :userId AND da.revokedAt IS NULL
        AND d.status = :status
        ORDER BY d.createdAt DESC
        """)
    List<Document> findAccessibleByUser(@Param("userId") UUID userId,
                                        @Param("status") DocStatus status);

    long countByLegalCaseIdAndStatus(UUID caseId, DocStatus status);

    long countByOwnerId(UUID ownerId);
}
