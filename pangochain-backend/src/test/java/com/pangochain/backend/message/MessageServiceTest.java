package com.pangochain.backend.message;

import com.pangochain.backend.notification.NotificationRepository;
import com.pangochain.backend.user.User;
import com.pangochain.backend.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MessageServiceTest {

    @Mock MessageRepository messageRepository;
    @Mock NotificationRepository notificationRepository;
    @Mock UserRepository userRepository;

    @InjectMocks MessageService messageService;

    private UUID senderId;
    private UUID recipientId;
    private User sender;
    private User recipient;

    @BeforeEach
    void setup() {
        senderId = UUID.randomUUID();
        recipientId = UUID.randomUUID();

        sender = User.builder().id(senderId).email("sender@firm.com").fullName("Sender").build();
        recipient = User.builder().id(recipientId).email("recipient@firm.com").fullName("Recipient").build();
    }

    @Test
    void send_storesCiphertextAndCreatesNotification() {
        SendMessageRequest req = new SendMessageRequest();
        req.setRecipientId(recipientId.toString());
        req.setEncryptedPayload("base64-encrypted-payload");
        req.setWrappedKeyToken("base64-wrapped-key");
        req.setCaseId(null);

        Message savedMsg = Message.builder()
                .id(UUID.randomUUID())
                .senderId(senderId)
                .recipientId(recipientId)
                .encryptedPayload("base64-encrypted-payload")
                .wrappedKeyToken("base64-wrapped-key")
                .build();

        when(userRepository.findById(recipientId)).thenReturn(Optional.of(recipient));
        when(userRepository.findById(senderId)).thenReturn(Optional.of(sender));
        when(messageRepository.save(any())).thenReturn(savedMsg);

        MessageDto dto = messageService.send(req, sender);

        // Server MUST store only ciphertext — never plaintext
        verify(messageRepository).save(argThat(m ->
                m.getEncryptedPayload().equals("base64-encrypted-payload")
                && m.getWrappedKeyToken().equals("base64-wrapped-key")
        ));
        // Notification must be sent to recipient
        verify(notificationRepository).save(argThat(n -> n.getUserId().equals(recipientId)));
        assertThat(dto.getEncryptedPayload()).isEqualTo("base64-encrypted-payload");
    }

    @Test
    void send_recipientNotFound_throws() {
        SendMessageRequest req = new SendMessageRequest();
        req.setRecipientId(recipientId.toString());
        req.setEncryptedPayload("payload");
        req.setWrappedKeyToken("key");

        when(userRepository.findById(recipientId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> messageService.send(req, sender))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Recipient not found");
    }

    @Test
    void unreadCount_returnsCorrectCount() {
        when(messageRepository.countByRecipientIdAndReadAtIsNull(recipientId)).thenReturn(5L);

        long count = messageService.unreadCount(recipient);

        assertThat(count).isEqualTo(5L);
    }

    @Test
    void markOneRead_callsRepository() {
        UUID messageId = UUID.randomUUID();
        when(messageRepository.markOneRead(eq(messageId), any(Instant.class))).thenReturn(1);

        int updated = messageService.markOneRead(messageId, recipient);

        verify(messageRepository).markOneRead(eq(messageId), any(Instant.class));
        assertThat(updated).isEqualTo(1);
    }
}
