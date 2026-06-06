package com.pangochain.backend.redaction;

import com.pangochain.backend.audit.AuditService;
import com.pangochain.backend.document.Document;
import com.pangochain.backend.document.DocumentRepository;
import com.pangochain.backend.redaction.RedactionDtos.RecordRedactionRequest;
import com.pangochain.backend.redaction.RedactionDtos.RedactionDto;
import com.pangochain.backend.user.User;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RedactionServiceTest {

    @Mock DocumentRedactionRepository redactionRepository;
    @Mock DocumentRepository documentRepository;
    @Mock AuditService auditService;

    @InjectMocks RedactionService service;

    @Test
    void record_linksCidPairAndAnchors() {
        User actor = User.builder().id(UUID.randomUUID()).email("lawyer@firm.com").build();

        Document original = new Document();
        original.setId(UUID.randomUUID());
        original.setIpfsCid("QmORIGINAL");
        Document redacted = new Document();
        redacted.setId(UUID.randomUUID());
        redacted.setIpfsCid("QmREDACTED");

        when(documentRepository.findById(original.getId())).thenReturn(Optional.of(original));
        when(documentRepository.findById(redacted.getId())).thenReturn(Optional.of(redacted));
        when(redactionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        RedactionDto dto = service.record(original.getId(),
                new RecordRedactionRequest(redacted.getId(), 3), actor);

        assertThat(dto.originalCid()).isEqualTo("QmORIGINAL");
        assertThat(dto.redactedCid()).isEqualTo("QmREDACTED");
        assertThat(dto.redactionCount()).isEqualTo(3);
        verify(auditService).log(eq("RECORD_REDACTION"), eq(actor.getId()), eq("DOCUMENT"),
                eq(original.getId().toString()), any(), any());
    }
}
