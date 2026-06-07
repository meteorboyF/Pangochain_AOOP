package com.pangochain.backend.rag;

import com.pangochain.backend.cases.Case;
import com.pangochain.backend.cases.CaseMemberRepository;
import com.pangochain.backend.cases.CaseRepository;
import com.pangochain.backend.document.DocStatus;
import com.pangochain.backend.document.Document;
import com.pangochain.backend.document.DocumentRepository;
import com.pangochain.backend.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RagAccessService {
    private final CaseRepository caseRepository;
    private final CaseMemberRepository caseMemberRepository;
    private final DocumentRepository documentRepository;

    public Case requireCaseAccess(UUID caseId, User user) {
        Case legalCase = caseRepository.findById(caseId)
                .orElseThrow(() -> new IllegalArgumentException("Case not found: " + caseId));
        boolean sameFirm = user.getFirm() != null
                && legalCase.getFirm() != null
                && user.getFirm().getId().equals(legalCase.getFirm().getId());
        boolean member = caseMemberRepository.existsByCaseIdAndUserId(caseId, user.getId());
        if (!sameFirm && !member) {
            throw new AccessDeniedException("No access to case");
        }
        return legalCase;
    }

    public Document requireDocumentInCase(UUID caseId, UUID documentId) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Document not found: " + documentId));
        if (document.getLegalCase() == null || !caseId.equals(document.getLegalCase().getId())
                || document.getStatus() != DocStatus.ACTIVE) {
            throw new AccessDeniedException("Document is not active in this case");
        }
        return document;
    }
}
