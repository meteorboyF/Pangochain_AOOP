package com.pangochain.backend.message;

import com.pangochain.backend.notification.Notification;
import com.pangochain.backend.notification.NotificationRepository;
import com.pangochain.backend.user.User;
import com.pangochain.backend.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MessageService {

    private final MessageRepository messageRepository;
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    /**
     * Send an E2E-encrypted message.
     * The encryptedPayload and wrappedKeyToken are produced entirely in the browser.
     * The server stores ciphertext only — never the plaintext.
     */
    @Transactional
    public MessageDto send(SendMessageRequest req, User sender) {
        UUID recipientId = UUID.fromString(req.getRecipientId());
        userRepository.findById(recipientId)
                .orElseThrow(() -> new IllegalArgumentException("Recipient not found"));

        Message msg = Message.builder()
                .senderId(sender.getId())
                .recipientId(recipientId)
                .caseId(req.getCaseId() != null ? UUID.fromString(req.getCaseId()) : null)
                .encryptedPayload(req.getEncryptedPayload())
                .wrappedKeyToken(req.getWrappedKeyToken())
                .build();
        msg = messageRepository.save(msg);

        notificationRepository.save(Notification.builder()
                .userId(recipientId)
                .type("NEW_MESSAGE")
                .message("New encrypted message from " + sender.getFullName())
                .build());

        return toDto(msg, sender.getEmail());
    }

    public Page<MessageDto> inbox(User user, int page, int size) {
        return messageRepository.findConversations(user.getId(), PageRequest.of(page, size))
                .map(m -> {
                    String senderEmail = userRepository.findById(m.getSenderId())
                            .map(User::getEmail).orElse("unknown");
                    return toDto(m, senderEmail);
                });
    }

    @Transactional
    public int markAllRead(User user) {
        return messageRepository.markAllRead(user.getId(), Instant.now());
    }

    public long unreadCount(User user) {
        return messageRepository.countByRecipientIdAndReadAtIsNull(user.getId());
    }

    private MessageDto toDto(Message m, String senderEmail) {
        return MessageDto.builder()
                .id(m.getId())
                .senderId(m.getSenderId())
                .senderEmail(senderEmail)
                .recipientId(m.getRecipientId())
                .caseId(m.getCaseId())
                .encryptedPayload(m.getEncryptedPayload())
                .wrappedKeyToken(m.getWrappedKeyToken())
                .readAt(m.getReadAt())
                .createdAt(m.getCreatedAt())
                .build();
    }
}
