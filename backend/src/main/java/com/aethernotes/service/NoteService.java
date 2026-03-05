package com.aethernotes.service;

import com.aethernotes.cache.CacheService;
import com.aethernotes.dto.request.CreateNoteRequest;
import com.aethernotes.dto.request.UpdateNoteRequest;
import com.aethernotes.dto.response.NoteResponse;
import com.aethernotes.dto.response.PagedResponse;
import com.aethernotes.encryption.EncryptionService;
import com.aethernotes.entity.Note;
import com.aethernotes.entity.Tag;
import com.aethernotes.entity.User;
import com.aethernotes.exception.ResourceNotFoundException;
import com.aethernotes.exception.UnauthorizedException;
import com.aethernotes.mapper.NoteMapper;
import com.aethernotes.repository.NoteRepository;
import com.aethernotes.repository.TagRepository;
import com.aethernotes.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class NoteService {

    private final NoteRepository         noteRepository;
    private final UserRepository         userRepository;
    private final TagRepository          tagRepository;
    private final EncryptionService      encryptionService;
    private final CacheService           cacheService;
    private final NoteMapper             noteMapper;
    private final SimpMessagingTemplate  messagingTemplate;

    // ──────────────────────────────────────────────────────────────────────────
    //  Read
    // ──────────────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public PagedResponse<NoteResponse> getNotes(UUID userId, Pageable pageable) {
        Page<NoteResponse> page = noteRepository
                .findByUserIdOrderByUpdatedAtDesc(userId, pageable)
                .map(note -> decryptAndMap(note, userId));
        return PagedResponse.from(page);
    }

    @Transactional(readOnly = true)
    public NoteResponse getNoteById(UUID noteId, UUID userId) {
        Note note = noteRepository.findByIdAndUserId(noteId, userId)
                .orElseThrow(() -> ResourceNotFoundException.note(noteId));
        return decryptAndMap(note, userId);
    }

    @Transactional(readOnly = true)
    public List<NoteResponse> getFavorites(UUID userId) {
        return noteRepository.findByUserIdAndFavoriteTrue(userId)
                .stream()
                .map(n -> decryptAndMap(n, userId))
                .collect(Collectors.toList());
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Create
    // ──────────────────────────────────────────────────────────────────────────

    @Transactional
    public NoteResponse createNote(UUID userId, CreateNoteRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> ResourceNotFoundException.user(userId));

        byte[] encKey = resolveKey(userId);

        String[] encParts = encrypt(req.getContent(), encKey);

        Note note = Note.builder()
                .user(user)
                .title(req.getTitle())
                .iv(encParts[0])
                .encryptedContent(encParts[1])
                .favorite(false)
                .tags(resolveTags(req.getTags()))
                .build();

        Note saved = noteRepository.save(note);
        cacheService.invalidateUserNotes(userId);

        NoteResponse response = decryptAndMap(saved, userId);
        broadcastUpdate(userId, response);
        log.info("Created note {} for user {}", saved.getId(), userId);
        return response;
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Update
    // ──────────────────────────────────────────────────────────────────────────

    @Transactional
    public NoteResponse updateNote(UUID noteId, UUID userId, UpdateNoteRequest req) {
        Note note = noteRepository.findByIdAndUserId(noteId, userId)
                .orElseThrow(() -> ResourceNotFoundException.note(noteId));

        if (req.getTitle() != null) {
            note.setTitle(req.getTitle());
        }

        if (req.getContent() != null) {
            byte[] encKey    = resolveKey(userId);
            String[] encParts = encrypt(req.getContent(), encKey);
            note.setIv(encParts[0]);
            note.setEncryptedContent(encParts[1]);
        }

        if (req.getFavorite() != null) {
            note.setFavorite(req.getFavorite());
        }

        if (req.getTags() != null) {
            note.setTags(resolveTags(req.getTags()));
        }

        Note saved = noteRepository.save(note);
        cacheService.invalidateUserNotes(userId);
        cacheService.invalidateNote(noteId);

        NoteResponse response = decryptAndMap(saved, userId);
        broadcastUpdate(userId, response);
        return response;
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Delete
    // ──────────────────────────────────────────────────────────────────────────

    @Transactional
    public void deleteNote(UUID noteId, UUID userId) {
        Note note = noteRepository.findByIdAndUserId(noteId, userId)
                .orElseThrow(() -> ResourceNotFoundException.note(noteId));
        noteRepository.delete(note);
        cacheService.invalidateUserNotes(userId);
        cacheService.invalidateNote(noteId);
        log.info("Deleted note {} for user {}", noteId, userId);
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Helpers
    // ──────────────────────────────────────────────────────────────────────────

    NoteResponse decryptAndMap(Note note, UUID userId) {
        NoteResponse response = noteMapper.toResponse(note);

        if (note.getIv() != null && note.getEncryptedContent() != null) {
            cacheService.getEncryptionKey(userId).ifPresentOrElse(key -> {
                try {
                    String plaintext = encryptionService.decryptNote(
                            note.getIv() + ":" + note.getEncryptedContent(), key);
                    response.setContent(plaintext);
                } catch (Exception e) {
                    log.warn("Failed to decrypt note {}: {}", note.getId(), e.getMessage());
                    response.setContent("");
                }
            }, () -> {
                log.debug("No encryption key in session for user {}; content omitted", userId);
                response.setContent("");
            });
        }

        return response;
    }

    private byte[] resolveKey(UUID userId) {
        return cacheService.getEncryptionKey(userId)
                .orElseThrow(() -> new UnauthorizedException(
                        "Session key not found. Please log in again."));
    }

    /** Encrypts content and returns [iv, ciphertext] both as Base64 strings. */
    String[] encrypt(String content, byte[] key) {
        String encoded = encryptionService.encryptNote(
                content == null ? "" : content, key);
        return encoded.split(":", 2);
    }

    private Set<Tag> resolveTags(Set<String> tagNames) {
        if (tagNames == null) return new HashSet<>();
        return tagNames.stream()
                .map(name -> tagRepository.findByNameIgnoreCase(name.trim())
                        .orElseGet(() -> tagRepository.save(
                                Tag.builder().name(name.trim().toLowerCase()).build())))
                .collect(Collectors.toSet());
    }

    private void broadcastUpdate(UUID userId, NoteResponse response) {
        try {
            messagingTemplate.convertAndSend("/topic/notes/" + userId, response);
        } catch (Exception e) {
            log.warn("WebSocket broadcast failed: {}", e.getMessage());
        }
    }
}
