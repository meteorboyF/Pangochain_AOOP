package com.pangochain.backend.message;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface MessageRepository extends JpaRepository<Message, UUID> {

    @Query("""
        SELECT m FROM Message m WHERE
        (m.senderId = :userId OR m.recipientId = :userId)
        ORDER BY m.createdAt DESC
        """)
    Page<Message> findConversations(@Param("userId") UUID userId, Pageable pageable);

    List<Message> findByRecipientIdAndReadAtIsNullOrderByCreatedAtDesc(UUID recipientId);

    long countByRecipientIdAndReadAtIsNull(UUID recipientId);

    @Modifying
    @Query("UPDATE Message m SET m.readAt = :now WHERE m.recipientId = :userId AND m.readAt IS NULL")
    int markAllRead(@Param("userId") UUID userId, @Param("now") Instant now);
}
