package com.pangochain.backend.audit;

import com.pangochain.backend.blockchain.FabricException;
import com.pangochain.backend.blockchain.FabricGatewayService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AuditServiceTest {

    @Mock AuditLogRepository auditLogRepository;
    @Mock FabricGatewayService fabricGatewayService;

    @InjectMocks AuditService auditService;

    private final UUID actorId = UUID.randomUUID();
    private final UUID docId = UUID.randomUUID();

    @BeforeEach
    void setup() {
        // FabricGatewayService is @Autowired(required=false) — inject manually.
        ReflectionTestUtils.setField(auditService, "fabricGatewayService", fabricGatewayService);
    }

    @Test
    void log_writesToPostgres() {
        when(auditLogRepository.save(any())).thenReturn(null);

        // @Async has no effect in unit tests — called synchronously
        auditService.log("DOC_VIEWED", actorId, "DOCUMENT", docId.toString(), null, null);

        verify(auditLogRepository).save(argThat(entry ->
                "DOC_VIEWED".equals(entry.getEventType())
                && actorId.equals(entry.getActorId())
        ));
    }

    @Test
    void log_fabricAvailable_anchorsToFabricFirst() throws Exception {
        when(fabricGatewayService.submitTransaction(eq("LogAuditEvent"), any())).thenReturn("tx-audit-001");
        when(auditLogRepository.save(any())).thenReturn(null);

        auditService.log("CASE_REGISTERED", actorId, "CASE", docId.toString(), null, "{\"title\":\"Case A\"}");

        // Fabric anchor must be attempted before PostgreSQL write
        var order = inOrder(fabricGatewayService, auditLogRepository);
        order.verify(fabricGatewayService).submitTransaction(eq("LogAuditEvent"), any(String[].class));
        order.verify(auditLogRepository).save(any());
    }

    @Test
    void log_fabricUnavailable_stillWritesToPostgres() throws Exception {
        when(fabricGatewayService.submitTransaction(eq("LogAuditEvent"), any()))
                .thenThrow(new FabricException("Fabric offline"));
        when(auditLogRepository.save(any())).thenReturn(null);

        auditService.log("DOC_REGISTERED", actorId, "DOCUMENT", docId.toString(), null, null);

        // PostgreSQL write must still succeed with null fabricTxId
        verify(auditLogRepository).save(argThat(entry ->
                "DOC_REGISTERED".equals(entry.getEventType())
                && entry.getFabricTxId() == null
        ));
    }
}
