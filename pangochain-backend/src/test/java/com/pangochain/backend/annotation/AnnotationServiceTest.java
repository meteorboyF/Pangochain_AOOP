package com.pangochain.backend.annotation;

import com.pangochain.backend.annotation.AnnotationDtos.AnnotationDto;
import com.pangochain.backend.annotation.AnnotationDtos.CreateAnnotationRequest;
import com.pangochain.backend.audit.AuditService;
import com.pangochain.backend.document.DocumentService;
import com.pangochain.backend.user.User;
import com.pangochain.backend.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AnnotationServiceTest {

    @Mock DocumentAnnotationRepository repository;
    @Mock DocumentService documentService;
    @Mock UserRepository userRepository;
    @Mock AuditService auditService;

    @InjectMocks AnnotationService service;

    private User author;
    private UUID docId;

    @BeforeEach
    void setup() {
        author = User.builder().id(UUID.randomUUID()).email("a@firm.com").fullName("Aaron Avers").build();
        docId = UUID.randomUUID();
    }

    @Test
    void add_persistsAndAuditsWhenAccessGranted() {
        when(documentService.hasDocumentAccess(docId, author.getId())).thenReturn(true);
        when(userRepository.findById(author.getId())).thenReturn(Optional.of(author));
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        AnnotationDto dto = service.add(docId,
                new CreateAnnotationRequest("Check clause 4", "hash1", null, 2, null), author);

        assertThat(dto.body()).isEqualTo("Check clause 4");
        assertThat(dto.authorName()).isEqualTo("Aaron Avers");
        assertThat(dto.status()).isEqualTo("OPEN");
        verify(auditService).log(eq("ANNOTATION_ADDED"), eq(author.getId()), eq("DOCUMENT"), eq(docId.toString()), any(), any());
    }

    @Test
    void add_deniedWhenNoDocumentAccess() {
        when(documentService.hasDocumentAccess(docId, author.getId())).thenReturn(false);

        assertThatThrownBy(() -> service.add(docId,
                new CreateAnnotationRequest("hi", null, null, null, null), author))
                .isInstanceOf(AccessDeniedException.class);
        verify(repository, never()).save(any());
    }
}
