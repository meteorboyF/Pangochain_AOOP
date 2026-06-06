package com.pangochain.backend.chat;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

class ChatCryptoServiceTest {

    private ChatCryptoService crypto;

    @BeforeEach
    void setUp() throws Exception {
        crypto = new ChatCryptoService();
        ReflectionTestUtils.setField(crypto, "configuredKey", "unit-test-chat-key");
        ReflectionTestUtils.invokeMethod(crypto, "init");
    }

    @Test
    void encryptDecrypt_roundtrips() {
        String plain = "Counsel, please review the amended filing before Friday.";
        String ct = crypto.encrypt(plain);
        assertThat(ct).isNotEqualTo(plain);
        assertThat(crypto.decrypt(ct)).isEqualTo(plain);
    }

    @Test
    void encrypt_usesFreshIv_soCiphertextDiffersEachTime() {
        String plain = "same message";
        assertThat(crypto.encrypt(plain)).isNotEqualTo(crypto.encrypt(plain));
    }

    @Test
    void decrypt_tampered_returnsSafeFallback_doesNotThrow() {
        String result = crypto.decrypt("not-valid-base64-or-ciphertext!!");
        assertThat(result).isEqualTo("[unable to decrypt message]");
    }
}
