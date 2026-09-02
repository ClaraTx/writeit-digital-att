
SET NAMES utf8mb4;

ALTER TABLE session_participants
  ADD COLUMN pin CHAR(4) DEFAULT NULL AFTER player_name;

