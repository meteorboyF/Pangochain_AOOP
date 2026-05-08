package com.pangochain.backend.esignature;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * Browser sends: documentId (path param), documentHash (SHA-256 of plaintext), signatureHash (ECDH-signed hash).
 * The signature is computed in-browser using the signer's ECIES private key over the document hash.
 */
public record SignDocumentRequest(
        @NotBlank @Pattern(regexp = "[A-Za-z0-9+/=]+") String documentHash,
        @NotBlank @Pattern(regexp = "[A-Za-z0-9+/=]+") String signatureHash
) {}
