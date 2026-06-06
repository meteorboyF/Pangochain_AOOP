package com.pangochain.backend.signingworkflow;

import com.pangochain.backend.audit.AuditService;
import com.pangochain.backend.document.Document;
import com.pangochain.backend.document.DocumentRepository;
import com.pangochain.backend.notification.NotificationService;
import com.pangochain.backend.signingworkflow.SigningDtos.InitiateRequest;
import com.pangochain.backend.signingworkflow.SigningDtos.SignRequest;
import com.pangochain.backend.signingworkflow.SigningDtos.WorkflowDto;
import com.pangochain.backend.user.User;
import com.pangochain.backend.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SigningWorkflowServiceTest {

    @Mock SigningWorkflowRepository workflowRepository;
    @Mock SigningRequestRepository requestRepository;
    @Mock DocumentRepository documentRepository;
    @Mock UserRepository userRepository;
    @Mock AuditService auditService;
    @Mock NotificationService notificationService;

    @InjectMocks SigningWorkflowService service;

    @Test
    void compositeHash_isDeterministicSha256Base64() {
        UUID wf = UUID.randomUUID();
        UUID signer = UUID.randomUUID();
        String a = SigningWorkflowService.compositeHashB64("ZG9jaGFzaA==", wf, signer);
        String b = SigningWorkflowService.compositeHashB64("ZG9jaGFzaA==", wf, signer);
        assertThat(a).isEqualTo(b);
        assertThat(a).hasSize(44); // 32-byte SHA-256 → 44 base64 chars
        assertThat(SigningWorkflowService.compositeHashB64("other", wf, signer)).isNotEqualTo(a);
    }

    @Test
    void initiate_createsOrderedRequestsAndAudits() {
        UUID docId = UUID.randomUUID();
        User initiator = User.builder().id(UUID.randomUUID()).email("lawyer@firm.com").build();
        UUID s1 = UUID.randomUUID();
        UUID s2 = UUID.randomUUID();

        Document doc = new Document();
        doc.setId(docId);
        doc.setDocumentHashSha256("aabbcc");
        when(documentRepository.findById(docId)).thenReturn(Optional.of(doc));
        when(workflowRepository.save(any())).thenAnswer(inv -> {
            SigningWorkflow w = inv.getArgument(0);
            if (w.getId() == null) w.setId(UUID.randomUUID());
            return w;
        });
        when(requestRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(requestRepository.findByWorkflowIdOrderBySignOrderAsc(any())).thenReturn(List.of());

        WorkflowDto dto = service.initiate(
                new InitiateRequest(docId, null, "Execute settlement", List.of(s1, s2)), initiator);

        assertThat(dto.status()).isEqualTo("PENDING");
        verify(requestRepository, times(2)).save(any());
        verify(auditService).log(eq("SIGNING_WORKFLOW_INITIATED"), eq(initiator.getId()), eq("DOCUMENT"), eq(docId.toString()), any(), any());
    }

    @Test
    void sign_rejectsOutOfTurnSigner() {
        UUID wfId = UUID.randomUUID();
        SigningWorkflow wf = SigningWorkflow.builder()
                .id(wfId).documentId(UUID.randomUUID()).documentHashB64("aGFzaA==").status("PENDING").build();
        User signerB = User.builder().id(UUID.randomUUID()).email("b@firm.com").build();

        SigningRequest reqA = SigningRequest.builder().id(UUID.randomUUID()).workflowId(wfId)
                .signerId(UUID.randomUUID()).signOrder(0).status("PENDING").build();
        SigningRequest reqB = SigningRequest.builder().id(UUID.randomUUID()).workflowId(wfId)
                .signerId(signerB.getId()).signOrder(1).status("PENDING").build();

        when(workflowRepository.findById(wfId)).thenReturn(Optional.of(wf));
        when(requestRepository.findByWorkflowIdOrderBySignOrderAsc(wfId)).thenReturn(List.of(reqA, reqB));

        assertThatThrownBy(() -> service.sign(wfId, new SignRequest("c2ln"), signerB))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("not your turn");
    }
}
