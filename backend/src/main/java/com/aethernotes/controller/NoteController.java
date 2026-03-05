package com.aethernotes.controller;

import com.aethernotes.dto.request.CreateNoteRequest;
import com.aethernotes.dto.request.UpdateNoteRequest;
import com.aethernotes.dto.response.NoteResponse;
import com.aethernotes.dto.response.PagedResponse;
import com.aethernotes.repository.UserRepository;
import com.aethernotes.service.NoteService;
import com.aethernotes.service.SearchService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/notes")
@RequiredArgsConstructor
public class NoteController {

    private final NoteService    noteService;
    private final SearchService  searchService;
    private final UserRepository userRepository;

    // ──────────────────────────────────────────────────────────────────────────
    //  CRUD
    // ──────────────────────────────────────────────────────────────────────────

    @GetMapping
    public ResponseEntity<PagedResponse<NoteResponse>> getNotes(
            @AuthenticationPrincipal UserDetails principal,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        UUID userId  = resolveUserId(principal);
        Pageable pageable = PageRequest.of(page, size, Sort.by("updatedAt").descending());
        return ResponseEntity.ok(noteService.getNotes(userId, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<NoteResponse> getNote(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails principal
    ) {
        return ResponseEntity.ok(noteService.getNoteById(id, resolveUserId(principal)));
    }

    @PostMapping
    public ResponseEntity<NoteResponse> createNote(
            @Valid @RequestBody CreateNoteRequest req,
            @AuthenticationPrincipal UserDetails principal
    ) {
        NoteResponse created = noteService.createNote(resolveUserId(principal), req);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<NoteResponse> updateNote(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateNoteRequest req,
            @AuthenticationPrincipal UserDetails principal
    ) {
        return ResponseEntity.ok(noteService.updateNote(id, resolveUserId(principal), req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNote(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails principal
    ) {
        noteService.deleteNote(id, resolveUserId(principal));
        return ResponseEntity.noContent().build();
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Search & Favorites
    // ──────────────────────────────────────────────────────────────────────────

    @GetMapping("/search")
    public ResponseEntity<List<NoteResponse>> search(
            @RequestParam String q,
            @AuthenticationPrincipal UserDetails principal
    ) {
        return ResponseEntity.ok(searchService.search(resolveUserId(principal), q));
    }

    @GetMapping("/favorites")
    public ResponseEntity<List<NoteResponse>> getFavorites(
            @AuthenticationPrincipal UserDetails principal
    ) {
        return ResponseEntity.ok(noteService.getFavorites(resolveUserId(principal)));
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Helpers
    // ──────────────────────────────────────────────────────────────────────────

    private UUID resolveUserId(UserDetails principal) {
        return userRepository.findByEmail(principal.getUsername())
                .map(u -> u.getId())
                .orElseThrow(() -> new com.aethernotes.exception.ResourceNotFoundException(
                        "User not found: " + principal.getUsername()));
    }
}
