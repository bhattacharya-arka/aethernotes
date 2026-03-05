package com.aethernotes;

import com.aethernotes.encryption.EncryptionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(classes = AetherNotesApplication.class)
@ActiveProfiles("test")
class AetherNotesApplicationTests {

    @Autowired
    private EncryptionService encryptionService;

    @Test
    void contextLoads() {
        // Verifies that the application context starts without errors
    }

    @Test
    void encryptionRoundTrip() throws Exception {
        String plaintext = "# My Secret Note\n\nThis is a **test** note with markdown.";
        byte[] salt   = encryptionService.generateSalt();
        byte[] key    = encryptionService.deriveKey("TestPassword123!", salt);

        String encrypted = encryptionService.encryptNote(plaintext, key);
        assertThat(encrypted).contains(":");

        String decrypted = encryptionService.decryptNote(encrypted, key);
        assertThat(decrypted).isEqualTo(plaintext);
    }

    @Test
    void differentIvsProduceDifferentCiphertexts() {
        byte[] salt = encryptionService.generateSalt();
        byte[] key  = encryptionService.deriveKey("Password123!", salt);

        String enc1 = encryptionService.encryptNote("same content", key);
        String enc2 = encryptionService.encryptNote("same content", key);

        // Different IVs should produce different ciphertexts
        assertThat(enc1).isNotEqualTo(enc2);
    }
}
