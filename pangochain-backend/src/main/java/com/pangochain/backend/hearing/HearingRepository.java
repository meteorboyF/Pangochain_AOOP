package com.pangochain.backend.hearing;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface HearingRepository extends JpaRepository<Hearing, UUID> {

    List<Hearing> findByLegalCaseIdOrderByHearingDateAsc(UUID caseId);

    @Query("SELECT h FROM Hearing h WHERE h.legalCase.firm.id = :firmId AND h.hearingDate > :now ORDER BY h.hearingDate ASC")
    List<Hearing> findUpcomingByFirm(UUID firmId, Instant now);

    @Query("SELECT h FROM Hearing h JOIN h.legalCase c JOIN case_clients cc ON cc.caseId = c.id WHERE cc.clientId = :clientId AND h.hearingDate > :now ORDER BY h.hearingDate ASC")
    List<Hearing> findUpcomingForClient(UUID clientId, Instant now);

    Optional<Hearing> findFirstByLegalCaseIdAndHearingDateAfterOrderByHearingDateAsc(UUID caseId, Instant now);
}
