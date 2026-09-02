SET NAMES utf8mb4;

ALTER TABLE matches
  ADD COLUMN phase1_ended_at DATETIME DEFAULT NULL AFTER phase1_started_at;