package com.pangochain.backend.chat;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ConversationRepository extends JpaRepository<Conversation, UUID> {

    Optional<Conversation> findByCaseId(UUID caseId);

    Optional<Conversation> findByTypeAndFirmId(Conversation.Type type, UUID firmId);

    List<Conversation> findByIdIn(List<UUID> ids);
}
