-- AetherNotes – PostgreSQL initialisation
-- Runs once when the container is first created.

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Confirm initialisation
DO $$ BEGIN
    RAISE NOTICE 'AetherNotes PostgreSQL initialised successfully';
END $$;
