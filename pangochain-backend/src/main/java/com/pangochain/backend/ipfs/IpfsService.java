package com.pangochain.backend.ipfs;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Map;

/**
 * Thin HTTP client for IPFS Kubo node (v0 API).
 *
 * Upload:  POST /api/v0/add         → returns { Name, Hash, Size }
 * Fetch:   POST /api/v0/cat?arg=CID → returns raw bytes
 */
@Service
@Slf4j
public class IpfsService {

    private final WebClient client;

    public IpfsService(@Value("${ipfs.api.host:http://localhost}") String host,
                       @Value("${ipfs.api.port:5001}") int port,
                       WebClient.Builder webClientBuilder) {
        this.client = webClientBuilder
                .baseUrl(host + ":" + port)
                .build();
    }

    /**
     * Uploads ciphertext bytes to IPFS and returns the content-addressed CID.
     * The ciphertext is already AES-256-GCM encrypted by the browser — no plaintext here.
     */
    public String add(byte[] ciphertextBytes, String fileName) {
        MultipartBodyBuilder body = new MultipartBodyBuilder();
        body.part("file", new ByteArrayResource(ciphertextBytes) {
            @Override public String getFilename() { return fileName; }
        }, MediaType.APPLICATION_OCTET_STREAM);

        @SuppressWarnings("unchecked")
        Map<String, String> response = client.post()
                .uri("/api/v0/add")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(BodyInserters.fromMultipartData(body.build()))
                .retrieve()
                .bodyToMono(Map.class)
                .block();

        if (response == null || !response.containsKey("Hash")) {
            throw new IpfsException("IPFS add returned no CID");
        }
        String cid = response.get("Hash");
        log.info("Uploaded {} bytes to IPFS CID={}", ciphertextBytes.length, cid);
        return cid;
    }

    /**
     * Fetches raw ciphertext bytes from IPFS by CID.
     * The caller (browser, via gateway endpoint) decrypts with WebCrypto.
     */
    public byte[] cat(String cid) {
        byte[] bytes = client.post()
                .uri("/api/v0/cat?arg={cid}", cid)
                .retrieve()
                .bodyToMono(byte[].class)
                .block();
        if (bytes == null) throw new IpfsException("IPFS cat returned null for CID=" + cid);
        log.info("Fetched {} bytes from IPFS CID={}", bytes.length, cid);
        return bytes;
    }
}
