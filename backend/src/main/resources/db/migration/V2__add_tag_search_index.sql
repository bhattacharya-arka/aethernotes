-- ============================================================
-- AetherNotes - Extended search indexes
-- V2__add_tag_search_index.sql
-- ============================================================

-- Tag name index for fast lookup
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags (name);

-- Composite index for common note queries
CREATE INDEX IF NOT EXISTS idx_notes_active_user
    ON notes (user_id, updated_at DESC);

-- Partial index for favorites
CREATE INDEX IF NOT EXISTS idx_notes_favorites
    ON notes (user_id, updated_at DESC)
    WHERE favorite = true;
