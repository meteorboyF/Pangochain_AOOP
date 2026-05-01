package com.pangochain.backend.reminder;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ReminderRepository extends JpaRepository<Reminder, UUID> {
    List<Reminder> findByRecipientIdOrderByCreatedAtDesc(UUID recipientId);
    long countByRecipientIdAndReadFalse(UUID recipientId);
}
