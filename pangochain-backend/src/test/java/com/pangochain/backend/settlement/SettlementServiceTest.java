package com.pangochain.backend.settlement;

import com.pangochain.backend.audit.AuditService;
import com.pangochain.backend.notification.NotificationService;
import com.pangochain.backend.settlement.SettlementDtos.CreateOfferRequest;
import com.pangochain.backend.settlement.SettlementDtos.OfferDto;
import com.pangochain.backend.settlement.SettlementDtos.RespondRequest;
import com.pangochain.backend.user.User;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SettlementServiceTest {

    @Mock SettlementOfferRepository offerRepository;
    @Mock AuditService auditService;
    @Mock NotificationService notificationService;
    @Mock EntityManager em;
    @Mock Query query;

    @InjectMocks SettlementService service;

    private User lawyer;
    private User client;
    private UUID caseId;

    @BeforeEach
    void setup() {
        lawyer = User.builder().id(UUID.randomUUID()).email("lawyer@firm.com").build();
        client = User.builder().id(UUID.randomUUID()).email("client@demo.com").build();
        caseId = UUID.randomUUID();
        // @PersistenceContext field isn't constructor-injected, so Mockito leaves it null.
        ReflectionTestUtils.setField(service, "em", em);
    }

    @Test
    void addOffer_persistsAndAudits() {
        when(offerRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        OfferDto dto = service.addOffer(caseId,
                new CreateOfferRequest("Tranche A", 5_000_00L, "USD", "mutual NDA", "fair"), lawyer);

        assertThat(dto.monetaryValueCents()).isEqualTo(5_000_00L);
        assertThat(dto.status()).isEqualTo("PROPOSED");
        verify(auditService).log(eq("SETTLEMENT_OFFER_ADDED"), eq(lawyer.getId()), eq("CASE"), eq(caseId.toString()), any(), any());
    }

    @Test
    void respond_accepts_setsStatusAuditsAndNotifiesLawyer() {
        SettlementOffer offer = SettlementOffer.builder()
                .id(UUID.randomUUID()).caseId(caseId).title("Tranche A")
                .status("PROPOSED").createdBy(lawyer.getId()).build();
        when(offerRepository.findById(offer.getId())).thenReturn(Optional.of(offer));
        when(offerRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        // case_clients membership check → one row
        when(em.createNativeQuery(anyString())).thenReturn(query);
        when(query.setParameter(anyString(), any())).thenReturn(query);
        when(query.getResultList()).thenReturn(List.of(1));

        OfferDto dto = service.respond(offer.getId(), new RespondRequest("ACCEPTED"), client);

        assertThat(dto.status()).isEqualTo("ACCEPTED");
        assertThat(dto.respondedBy()).isEqualTo(client.getId());
        verify(auditService).log(eq("RECORD_SETTLEMENT_RESPONSE"), eq(client.getId()), eq("CASE"), eq(caseId.toString()), any(), any());
        verify(notificationService).push(eq(lawyer.getId()), eq("SETTLEMENT_RESPONSE"), contains("accepted"));
    }

    @Test
    void respond_rejectsNonClientOnCase() {
        SettlementOffer offer = SettlementOffer.builder()
                .id(UUID.randomUUID()).caseId(caseId).status("PROPOSED").build();
        when(offerRepository.findById(offer.getId())).thenReturn(Optional.of(offer));
        when(em.createNativeQuery(anyString())).thenReturn(query);
        when(query.setParameter(anyString(), any())).thenReturn(query);
        when(query.getResultList()).thenReturn(List.of()); // not a client on the case

        assertThatThrownBy(() -> service.respond(offer.getId(), new RespondRequest("ACCEPTED"), client))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void respond_conflictWhenAlreadyResponded() {
        SettlementOffer offer = SettlementOffer.builder()
                .id(UUID.randomUUID()).caseId(caseId).status("ACCEPTED").build();
        when(offerRepository.findById(offer.getId())).thenReturn(Optional.of(offer));
        when(em.createNativeQuery(anyString())).thenReturn(query);
        when(query.setParameter(anyString(), any())).thenReturn(query);
        when(query.getResultList()).thenReturn(List.of(1));

        assertThatThrownBy(() -> service.respond(offer.getId(), new RespondRequest("REJECTED"), client))
                .isInstanceOf(ResponseStatusException.class);
    }
}
