package com.pangochain.backend.cases;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface CaseMemberRepository extends JpaRepository<CaseMember, CaseMember.CaseMemberId> {
    boolean existsByCaseIdAndUserId(UUID caseId, UUID userId);
}
