SET NAMES utf8mb4;

ALTER TABLE matches
  ADD COLUMN phase1_started_at DATETIME DEFAULT NULL AFTER phase2_duration_minutes,
  ADD COLUMN phase2_started_at DATETIME DEFAULT NULL AFTER phase1_started_at;