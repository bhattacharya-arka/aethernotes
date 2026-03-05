package com.aethernotes.websocket;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;

/**
 * Handles STOMP messages from connected clients.
 *
 * <p>Clients subscribe to {@code /topic/notes/{userId}} to receive live updates.
 * This controller handles client-initiated events (e.g. ping / cursor position).
 */
@Slf4j
@Controller
@RequiredArgsConstructor
public class NoteWebSocketController {

    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Client can send a ping to keep the session alive.
     * Maps to STOMP SEND /app/notes.ping
     */
    @MessageMapping("/notes.ping")
    public void ping(Principal principal) {
        if (principal != null) {
            log.debug("WebSocket ping from {}", principal.getName());
        }
    }

    /**
     * Client notifies others that it's editing a note.
     * Maps to STOMP SEND /app/notes.editing/{noteId}
     */
    @MessageMapping("/notes.editing/{noteId}")
    public void notifyEditing(
            @DestinationVariable String noteId,
            Principal principal
    ) {
        if (principal == null) return;
        // Broadcast editing indicator to all subscribers of this note's topic
        messagingTemplate.convertAndSend(
                "/topic/editing/" + noteId,
                java.util.Map.of("user", principal.getName(), "noteId", noteId)
        );
    }
}
