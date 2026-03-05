package com.aethernotes.cache;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Base64;
import java.util.Optional;
import java.util.UUID;

/**
 * Centralised Redis cache operations for AetherNotes.
 *
 * <p>Key namespaces:
 * <ul>
 *   <li>{@code user:{userId}:enc_key}   – PBKDF2-derived AES key for the session</li>
 *   <li>{@code user:{userId}:notes}      – Cached serialised note list</li>
 *   <li>{@code note:{noteId}}            – Individual note cache</li>
 *   <li>{@code blacklist:{tokenHash}}    – Revoked JWT tokens</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CacheService {

    private final RedisTemplate<String, String> redisTemplate;
    private final ObjectMapper                  objectMapper;

    private static final Duration ENC_KEY_TTL  = Duration.ofHours(24);
    private static final Duration NOTES_TTL    = Duration.ofMinutes(15);
    private static final Duration NOTE_TTL     = Duration.ofMinutes(15);

    // ──────────────────────────────────────────────────────────────────────────
    //  Encryption key
    // ──────────────────────────────────────────────────────────────────────────

    /** Stores the user's AES-256 session key in Redis. */
    public void storeEncryptionKey(UUID userId, byte[] key) {
        String redisKey = encKeyKey(userId);
        redisTemplate.opsForValue().set(
                redisKey,
                Base64.getEncoder().encodeToString(key),
                ENC_KEY_TTL
        );
        log.debug("Stored encryption key for user {}", userId);
    }

    /** Retrieves and Base64-decodes the stored AES key. Empty if expired/absent. */
    public Optional<byte[]> getEncryptionKey(UUID userId) {
        String encoded = redisTemplate.opsForValue().get(encKeyKey(userId));
        if (encoded == null) return Optional.empty();
        return Optional.of(Base64.getDecoder().decode(encoded));
    }

    /** Removes the encryption key on logout. */
    public void deleteEncryptionKey(UUID userId) {
        redisTemplate.delete(encKeyKey(userId));
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Note list cache
    // ──────────────────────────────────────────────────────────────────────────

    public <T> void cacheValue(String key, T value) {
        try {
            redisTemplate.opsForValue().set(key, objectMapper.writeValueAsString(value), NOTES_TTL);
        } catch (Exception e) {
            log.warn("Failed to cache value for key {}: {}", key, e.getMessage());
        }
    }

    public <T> Optional<T> getCachedValue(String key, TypeReference<T> type) {
        try {
            String json = redisTemplate.opsForValue().get(key);
            if (json == null) return Optional.empty();
            return Optional.of(objectMapper.readValue(json, type));
        } catch (Exception e) {
            log.warn("Failed to deserialise cached value for key {}: {}", key, e.getMessage());
            return Optional.empty();
        }
    }

    /** Invalidates all cached note data for a user. */
    public void invalidateUserNotes(UUID userId) {
        redisTemplate.delete(notesKey(userId));
        log.debug("Invalidated note cache for user {}", userId);
    }

    /** Invalidates a single cached note. */
    public void invalidateNote(UUID noteId) {
        redisTemplate.delete(noteKey(noteId));
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Token blacklist (logout / revocation)
    // ──────────────────────────────────────────────────────────────────────────

    public void blacklistToken(String token, Duration ttl) {
        // Store a hash of the token to save space
        String hash = Integer.toHexString(token.hashCode());
        redisTemplate.opsForValue().set("blacklist:" + hash, "1", ttl);
    }

    public boolean isTokenBlacklisted(String token) {
        String hash = Integer.toHexString(token.hashCode());
        return Boolean.TRUE.equals(redisTemplate.hasKey("blacklist:" + hash));
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Key builders
    // ──────────────────────────────────────────────────────────────────────────

    public String notesKey(UUID userId)  { return "user:" + userId + ":notes"; }
    public String noteKey(UUID noteId)   { return "note:" + noteId; }

    private String encKeyKey(UUID userId) { return "user:" + userId + ":enc_key"; }
}
