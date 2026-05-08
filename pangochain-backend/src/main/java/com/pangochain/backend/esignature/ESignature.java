package com.pangochain.backend.esignature;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "esignatures")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ESignature {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "document_id", nullable = false)
    private UUID documentId;

    @Column(name = "signer_id", nullable = false)
    private UUID signerId;

    @Column(name = "document_hash", length = 128)
    private String documentHash;

    @Column(name = "signature_hash", nullable = false, length = 128)
    private String signatureHash;

    @Column(name = "fabric_tx_id", length = 128)
    private String fabricTxId;

    @Column(name = "signed_at", nullable = false, updatable = false)
    private Instant signedAt;

    @PrePersist
    void prePersist() { signedAt = Instant.now(); }
}
