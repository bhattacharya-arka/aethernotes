package com.aethernotes.encryption;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.security.spec.KeySpec;
import java.util.Base64;

/**
 * AES-256-GCM encryption service.
 *
 * <p>Encryption key derivation:
 * <pre>key = PBKDF2WithHmacSHA256(password, salt, iterations, 256 bits)</pre>
 *
 * <p>Ciphertext format stored in DB:
 * <pre>base64(iv) : base64(ciphertext+tag)</pre>
 *
 * <p>The IV (12 bytes / 96 bits) is unique per encryption operation.
 * The GCM authentication tag (128 bits) is appended by the JCE provider.
 */
@Slf4j
@Service
public class EncryptionService {

    private static final String AES_GCM_ALGO = "AES/GCM/NoPadding";
    private static final String PBKDF2_ALGO  = "PBKDF2WithHmacSHA256";
    private static final int    GCM_IV_LENGTH  = 12;   // 96-bit nonce (NIST recommended)
    private static final int    GCM_TAG_LENGTH = 128;  // authentication tag bits

    @Value("${app.encryption.pbkdf2-iterations:100000}")
    private int pbkdf2Iterations;

    @Value("${app.encryption.key-length:256}")
    private int keyLength;

    @Value("${app.encryption.salt-length:32}")
    private int saltLength;

    // ──────────────────────────────────────────────────────────────────────────
    //  Key derivation
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Generates a cryptographically random salt.
     *
     * @return raw salt bytes
     */
    public byte[] generateSalt() {
        byte[] salt = new byte[saltLength];
        new SecureRandom().nextBytes(salt);
        return salt;
    }

    /**
     * Derives an AES-256 key from the user's password and their stored salt.
     *
     * @param password plaintext password (cleared after derivation)
     * @param salt     raw salt bytes (from DB, Base64-decoded)
     * @return 256-bit AES key bytes
     */
    public byte[] deriveKey(String password, byte[] salt) {
        try {
            KeySpec spec = new PBEKeySpec(
                    password.toCharArray(), salt, pbkdf2Iterations, keyLength);
            SecretKeyFactory factory = SecretKeyFactory.getInstance(PBKDF2_ALGO);
            return factory.generateSecret(spec).getEncoded();
        } catch (Exception e) {
            throw new EncryptionException("Key derivation failed", e);
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Encryption / Decryption
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Encrypts {@code plaintext} with AES-256-GCM.
     *
     * @param plaintext note content
     * @param keyBytes  256-bit key derived from user's password
     * @return "base64(iv):base64(ciphertext)" stored in DB
     */
    public String encryptNote(String plaintext, byte[] keyBytes) {
        try {
            byte[] iv = new byte[GCM_IV_LENGTH];
            new SecureRandom().nextBytes(iv);

            SecretKey key = new SecretKeySpec(keyBytes, "AES");
            GCMParameterSpec params = new GCMParameterSpec(GCM_TAG_LENGTH, iv);

            Cipher cipher = Cipher.getInstance(AES_GCM_ALGO);
            cipher.init(Cipher.ENCRYPT_MODE, key, params);

            byte[] ciphertext = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));

            return Base64.getEncoder().encodeToString(iv) + ":"
                    + Base64.getEncoder().encodeToString(ciphertext);

        } catch (Exception e) {
            throw new EncryptionException("Encryption failed", e);
        }
    }

    /**
     * Decrypts a note previously encrypted by {@link #encryptNote}.
     *
     * @param encryptedData "base64(iv):base64(ciphertext)" as stored in DB
     * @param keyBytes      256-bit key derived from user's password
     * @return plaintext note content
     */
    public String decryptNote(String encryptedData, byte[] keyBytes) {
        try {
            String[] parts = encryptedData.split(":", 2);
            if (parts.length != 2) {
                throw new EncryptionException("Invalid ciphertext format – expected iv:ciphertext");
            }

            byte[] iv         = Base64.getDecoder().decode(parts[0]);
            byte[] ciphertext = Base64.getDecoder().decode(parts[1]);

            SecretKey key    = new SecretKeySpec(keyBytes, "AES");
            GCMParameterSpec params = new GCMParameterSpec(GCM_TAG_LENGTH, iv);

            Cipher cipher = Cipher.getInstance(AES_GCM_ALGO);
            cipher.init(Cipher.DECRYPT_MODE, key, params);

            byte[] plaintext = cipher.doFinal(ciphertext);
            return new String(plaintext, StandardCharsets.UTF_8);

        } catch (EncryptionException e) {
            throw e;
        } catch (Exception e) {
            throw new EncryptionException("Decryption failed", e);
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Exception
    // ──────────────────────────────────────────────────────────────────────────

    public static class EncryptionException extends RuntimeException {
        public EncryptionException(String message) { super(message); }
        public EncryptionException(String message, Throwable cause) { super(message, cause); }
    }
}
