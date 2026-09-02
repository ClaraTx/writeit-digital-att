-- Add phase1_completed_at column to game_sessions table
ALTER TABLE game_sessions
ADD COLUMN IF NOT EXISTS phase1_completed_at timestamp with time zone DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN game_sessions.phase1_completed_at IS 'Timestamp when phase 1 (requirement building) was completed';