package com.aethernotes.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(
    name = "notes",
    indexes = {
        @Index(name = "idx_notes_user_id",    columnList = "user_id"),
        @Index(name = "idx_notes_updated_at", columnList = "updated_at")
    }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Note {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 500)
    private String title;

    /**
     * AES-256-GCM encrypted note content (Base64 encoded ciphertext).
     * The IV (initialization vector) is stored separately in {@code iv}.
     */
    @Column(name = "encrypted_content", columnDefinition = "TEXT")
    private String encryptedContent;

    /**
     * Base64-encoded 12-byte GCM initialization vector.
     */
    @Column(name = "iv", length = 255)
    private String iv;

    @Column(name = "favorite", nullable = false)
    @Builder.Default
    private boolean favorite = false;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /**
     * PostgreSQL tsvector for full-text search on title.
     * Maintained automatically by a DB trigger.
     */
    @Column(name = "search_vector", insertable = false, updatable = false)
    private String searchVector;

    @ManyToMany(cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @JoinTable(
        name = "note_tags",
        joinColumns = @JoinColumn(name = "note_id"),
        inverseJoinColumns = @JoinColumn(name = "tag_id")
    )
    @Builder.Default
    private Set<Tag> tags = new HashSet<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
