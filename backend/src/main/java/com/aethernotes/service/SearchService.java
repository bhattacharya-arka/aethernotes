package com.aethernotes.service;

import com.aethernotes.dto.response.NoteResponse;
import com.aethernotes.entity.Note;
import com.aethernotes.repository.NoteRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SearchService {

    private static final int MAX_RESULTS = 50;

    private final NoteRepository noteRepository;
    private final NoteService    noteService;

    /**
     * Performs a full-text search using PostgreSQL {@code tsvector} when the
     * query is meaningful (>= 2 chars), or falls back to a simple ILIKE query.
     *
     * <p>Note: only the note <em>title</em> is indexed — content remains
     * encrypted and cannot be searched server-side. This is a deliberate
     * security trade-off.
     *
     * @param userId  authenticated user's UUID
     * @param query   search query string
     * @return decrypted note results ordered by relevance
     */
    @Transactional(readOnly = true)
    public List<NoteResponse> search(UUID userId, String query) {
        if (!StringUtils.hasText(query) || query.trim().length() < 2) {
            return List.of();
        }

        String sanitised = query.trim();
        List<Note> notes;

        try {
            // Attempt PostgreSQL full-text search first
            notes = noteRepository.fullTextSearch(userId, sanitised, MAX_RESULTS);
            log.debug("FTS search '{}' for user {} returned {} results", sanitised, userId, notes.size());
        } catch (Exception e) {
            // Fallback to ILIKE (e.g., if FTS index not yet ready)
            log.warn("FTS failed, falling back to ILIKE: {}", e.getMessage());
            notes = noteRepository
                    .findByTitleContainingIgnoreCase(userId, sanitised,
                            org.springframework.data.domain.PageRequest.of(0, MAX_RESULTS))
                    .getContent();
        }

        return notes.stream()
                .map(note -> noteService.decryptAndMap(note, userId))
                .collect(Collectors.toList());
    }
}
