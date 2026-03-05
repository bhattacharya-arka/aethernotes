package com.aethernotes.repository;

import com.aethernotes.entity.Note;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface NoteRepository extends JpaRepository<Note, UUID> {

    Page<Note> findByUserIdOrderByUpdatedAtDesc(UUID userId, Pageable pageable);

    Optional<Note> findByIdAndUserId(UUID id, UUID userId);

    List<Note> findByUserIdAndFavoriteTrue(UUID userId);

    /**
     * PostgreSQL full-text search on notes title for a given user.
     * Uses the pre-built tsvector column maintained by a DB trigger.
     */
    @Query(value = """
            SELECT n.* FROM notes n
            WHERE n.user_id = :userId
              AND (
                n.search_vector @@ to_tsquery('english',
                  regexp_replace(trim(:query), '\\s+', ':* & ', 'g') || ':*')
                OR LOWER(n.title) LIKE LOWER(CONCAT('%', :query, '%'))
              )
            ORDER BY ts_rank(n.search_vector,
                             to_tsquery('english',
                               regexp_replace(trim(:query), '\\s+', ':* & ', 'g') || ':*')) DESC,
                     n.updated_at DESC
            LIMIT :limit
            """, nativeQuery = true)
    List<Note> fullTextSearch(
            @Param("userId") UUID userId,
            @Param("query") String query,
            @Param("limit") int limit);

    /**
     * Search notes by title containing a keyword (case-insensitive fallback).
     */
    @Query("""
            SELECT n FROM Note n
            WHERE n.user.id = :userId
              AND LOWER(n.title) LIKE LOWER(CONCAT('%', :keyword, '%'))
            ORDER BY n.updatedAt DESC
            """)
    Page<Note> findByTitleContainingIgnoreCase(
            @Param("userId") UUID userId,
            @Param("keyword") String keyword,
            Pageable pageable);

    /**
     * Find notes by tag name for a given user.
     */
    @Query("""
            SELECT n FROM Note n
            JOIN n.tags t
            WHERE n.user.id = :userId
              AND LOWER(t.name) = LOWER(:tagName)
            ORDER BY n.updatedAt DESC
            """)
    Page<Note> findByUserIdAndTagName(
            @Param("userId") UUID userId,
            @Param("tagName") String tagName,
            Pageable pageable);

    long countByUserId(UUID userId);
}
