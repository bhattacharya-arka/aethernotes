package com.aethernotes.repository;

import com.aethernotes.entity.Tag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TagRepository extends JpaRepository<Tag, Long> {

    Optional<Tag> findByName(String name);

    Optional<Tag> findByNameIgnoreCase(String name);

    /**
     * Find all tags used by notes belonging to a specific user.
     */
    @Query("""
            SELECT DISTINCT t FROM Tag t
            JOIN t.notes n
            WHERE n.user.id = :userId
            ORDER BY t.name ASC
            """)
    List<Tag> findByUserId(@Param("userId") UUID userId);
}
