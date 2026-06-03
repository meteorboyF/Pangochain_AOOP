package com.pangochain.backend.report;

import com.pangochain.backend.audit.AuditLog;
import com.pangochain.backend.audit.AuditLogRepository;
import com.pangochain.backend.audit.AuditService;
import com.pangochain.backend.cases.Case;
import com.pangochain.backend.cases.CaseRepository;
import com.pangochain.backend.document.DocStatus;
import com.pangochain.backend.document.Document;
import com.pangochain.backend.document.DocumentRepository;
import com.pangochain.backend.user.User;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CaseArchiveServiceTest {

    @Mock CaseRepository caseRepository;
    @Mock DocumentRepository documentRepository;
    @Mock AuditLogRepository auditLogRepository;
    @Mock AuditService auditService;

    @InjectMocks CaseArchiveService service;

    @Test
    void permanenceCertificate_producesPdfAndAudits() {
        UUID caseId = UUID.randomUUID();
        User actor = User.builder().id(UUID.randomUUID()).email("client@demo.com").build();

        Case legalCase = new Case();
        legalCase.setId(caseId);
        legalCase.setTitle("Chen v. Meridian");
        legalCase.setFabricTxId("tx-case-001");

        Document doc = new Document();
        doc.setFileName("complaint.pdf");
        doc.setVersion(1);
        doc.setCategory("EVIDENCE");
        doc.setDocumentHashSha256("abc123");
        doc.setFabricTxId("tx-doc-001");

        AuditLog event = AuditLog.builder()
                .eventType("DOCUMENT_REGISTERED").timestamp(Instant.now()).fabricTxId("tx-doc-001").build();

        when(caseRepository.findById(caseId)).thenReturn(Optional.of(legalCase));
        when(documentRepository.findByLegalCaseIdAndStatus(caseId, DocStatus.ACTIVE)).thenReturn(List.of(doc));
        Page<AuditLog> page = new PageImpl<>(List.of(event));
        when(auditLogRepository.findByResourceId(eq(caseId.toString()), any(Pageable.class))).thenReturn(page);

        CaseArchiveService.CertificateResult result = service.permanenceCertificate(caseId, actor);

        assertThat(new String(result.pdf(), 0, 5)).isEqualTo("%PDF-");
        assertThat(result.fileName()).startsWith("permanence-certificate_");
        verify(auditService).log(eq("CASE_ARCHIVE_GENERATED"), eq(actor.getId()), eq("CASE"), eq(caseId.toString()), any(), any());
    }
}
