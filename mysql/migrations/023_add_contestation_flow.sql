SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

ALTER TABLE matches
  ADD COLUMN phase2_ended_at          DATETIME DEFAULT NULL AFTER phase2_started_at,
  ADD COLUMN phase3_started_at        DATETIME DEFAULT NULL AFTER phase2_ended_at,
  ADD COLUMN phase3_duration_minutes  INT      NOT NULL DEFAULT 5 AFTER phase3_started_at,
  ADD COLUMN phase3_ended_at          DATETIME DEFAULT NULL AFTER phase3_duration_minutes,
  ADD COLUMN results_released_at      DATETIME DEFAULT NULL AFTER phase3_ended_at;

ALTER TABLE game_sessions
  ADD COLUMN phase2_submitted_at  DATETIME DEFAULT NULL AFTER phase2_started_at,
  ADD COLUMN phase3_submitted_at  DATETIME DEFAULT NULL AFTER phase2_submitted_at;

CREATE TABLE IF NOT EXISTS requirement_contestations (
  id                 CHAR(36)     NOT NULL DEFAULT (UUID()),
  evaluation_id      CHAR(36)     NOT NULL,
  session_id         CHAR(36)     NOT NULL,
  requirement_id     CHAR(36)     NOT NULL,
  criterion          ENUM('can_be_extracted','correctly_classified','is_complete') NOT NULL,
  team_justification TEXT         NOT NULL,
  status             ENUM('pendente','aceita','recusada') NOT NULL DEFAULT 'pendente',
  professor_response TEXT         DEFAULT NULL,
  created_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at        DATETIME     DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_rc_evaluation_criterion (evaluation_id, criterion),
  KEY idx_rc_session_id (session_id),
  KEY idx_rc_status (status),
  CONSTRAINT fk_rc_evaluation  FOREIGN KEY (evaluation_id)  REFERENCES requirement_evaluations (id) ON DELETE CASCADE,
  CONSTRAINT fk_rc_session     FOREIGN KEY (session_id)     REFERENCES game_sessions (id) ON DELETE CASCADE,
  CONSTRAINT fk_rc_requirement FOREIGN KEY (requirement_id) REFERENCES requirements (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;