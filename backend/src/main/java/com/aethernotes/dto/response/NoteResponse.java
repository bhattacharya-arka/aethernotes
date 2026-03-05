package com.aethernotes.dto.response;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

@Data
public class NoteResponse {

    private UUID id;
    private UUID userId;
    private String title;

    /**
     * Decrypted note content - populated by the service layer after
     * AES-256-GCM decryption using the user's session key.
     */
    private String content;

    private boolean favorite;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Set<String> tags;
}
