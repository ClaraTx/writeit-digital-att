SET NAMES utf8mb4;

ALTER TABLE game_sessions
  ADD COLUMN phase3_started_at DATETIME DEFAULT NULL AFTER phase3_submitted_at,
  ADD COLUMN phase3_duration   INT      DEFAULT 300   AFTER phase3_started_at;
  