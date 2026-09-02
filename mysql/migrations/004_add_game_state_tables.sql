-- =============================================================
-- WriteIt - Tabelas de estado de jogo em tempo real
-- =============================================================

CREATE TABLE IF NOT EXISTS game_states (
  id          CHAR(36)  NOT NULL DEFAULT (UUID()),
  session_id  CHAR(36)  NOT NULL,
  available_words JSON  DEFAULT NULL,
  last_update DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_gs_session (session_id),
  CONSTRAINT fk_gst_session FOREIGN KEY (session_id) REFERENCES game_sessions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS player_states (
  id                      CHAR(36)     NOT NULL DEFAULT (UUID()),
  session_id              CHAR(36)     NOT NULL,
  participant_id          CHAR(36)     NOT NULL,
  current_words           JSON         DEFAULT NULL,
  current_classification  VARCHAR(100) DEFAULT NULL,
  last_update             DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ps_session_participant (session_id, participant_id),
  CONSTRAINT fk_pst_session     FOREIGN KEY (session_id)     REFERENCES game_sessions        (id) ON DELETE CASCADE,
  CONSTRAINT fk_pst_participant FOREIGN KEY (participant_id) REFERENCES session_participants  (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
