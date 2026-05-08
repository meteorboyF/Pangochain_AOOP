package com.pangochain.backend.esignature;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class ESignatureDto {
    private UUID id;
    private UUID documentId;
    private UUID signerId;
    private String signerEmail;
    private String documentHash;
    private String signatureHash;
    private String fabricTxId;
    private Instant signedAt;
}
