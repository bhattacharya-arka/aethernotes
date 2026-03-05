package com.aethernotes.websocket;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NoteUpdateMessage {

    public enum Action { CREATED, UPDATED, DELETED }

    private Action        action;
    private UUID          noteId;
    private UUID          userId;
    private String        title;
    private LocalDateTime updatedAt;
}
