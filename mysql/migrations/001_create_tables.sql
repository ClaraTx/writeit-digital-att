-- =============================================================
-- WriteIt - Schema MySQL
-- Requer MySQL 8.0.13+ (suporte a DEFAULT com expressões)
-- Executar com: mysql -u root -p writeit_sandbox < 001_create_tables.sql
-- =============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -------------------------------------------------------------
-- 1. scenarios
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scenarios (
  id         INT          NOT NULL AUTO_INCREMENT,
  name       VARCHAR(255) NOT NULL,
  description TEXT,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 2. game_configurations
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS game_configurations (
  id                   CHAR(36)     NOT NULL DEFAULT (UUID()),
  name                 VARCHAR(255) NOT NULL DEFAULT 'Default Configuration',
  description          TEXT,
  phase1_duration      INT          NOT NULL DEFAULT 1200,
  phase2_duration      INT          NOT NULL DEFAULT 900,
  max_team_members     INT          NOT NULL DEFAULT 6,
  min_team_members     INT          NOT NULL DEFAULT 2,
  min_individual_players INT        NOT NULL DEFAULT 2,
  lobby_duration       INT          NOT NULL DEFAULT 300,
  is_active            TINYINT(1)   NOT NULL DEFAULT 0,
  created_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT chk_gc_team_members    CHECK (max_team_members >= min_team_members),
  CONSTRAINT chk_gc_min_team        CHECK (min_team_members >= 1),
  CONSTRAINT chk_gc_min_individual  CHECK (min_individual_players >= 2),
  CONSTRAINT chk_gc_phase1          CHECK (phase1_duration > 0),
  CONSTRAINT chk_gc_phase2          CHECK (phase2_duration > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 3. game_sessions
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS game_sessions (
  id                          CHAR(36)     NOT NULL DEFAULT (UUID()),
  room_code                   VARCHAR(255) NOT NULL,
  requirement                 TEXT         NOT NULL,
  classification              VARCHAR(100) NOT NULL,
  initial_score               INT          NOT NULL DEFAULT 0,
  status                      ENUM('waiting','judging','completed','evaluating') NOT NULL DEFAULT 'waiting',
  mode                        VARCHAR(50)  NOT NULL DEFAULT 'team',
  player_name                 VARCHAR(255) DEFAULT NULL,
  prototype_image_url         TEXT         DEFAULT NULL,
  prototype_description       TEXT         DEFAULT NULL,
  evaluation_phase_started_at DATETIME     DEFAULT NULL,
  phase1_duration             INT          DEFAULT 1200,
  phase2_duration             INT          DEFAULT 900,
  phase1_started_at           DATETIME     DEFAULT NULL,
  phase2_started_at           DATETIME     DEFAULT NULL,
  phase1_completed_at         DATETIME     DEFAULT NULL,
  created_by                  CHAR(36)     DEFAULT NULL,
  created_at                  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_room_code (room_code),
  KEY idx_gs_status (status),
  KEY idx_gs_timing (phase1_started_at, phase2_started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 4. individual_sessions
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS individual_sessions (
  id                  CHAR(36)    NOT NULL DEFAULT (UUID()),
  player_name         VARCHAR(255) NOT NULL,
  status              ENUM('phase1','phase2','completed') NOT NULL DEFAULT 'phase1',
  phase1_completed_at DATETIME    DEFAULT NULL,
  phase2_completed_at DATETIME    DEFAULT NULL,
  requirements_count  INT         NOT NULL DEFAULT 0,
  evaluations_count   INT         NOT NULL DEFAULT 0,
  score               INT         NOT NULL DEFAULT 0,
  phase1_duration     INT         NOT NULL DEFAULT 1200,
  phase2_duration     INT         NOT NULL DEFAULT 900,
  phase1_started_at   DATETIME    DEFAULT NULL,
  phase2_started_at   DATETIME    DEFAULT NULL,
  created_at          DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_is_status (status),
  KEY idx_is_created_at (created_at),
  KEY idx_is_timing (phase1_started_at, phase2_started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 5. session_participants
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS session_participants (
  id          CHAR(36)     NOT NULL DEFAULT (UUID()),
  session_id  CHAR(36)     NOT NULL,
  user_id     CHAR(36)     DEFAULT NULL,
  player_name VARCHAR(255) NOT NULL,
  joined_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_session_player (session_id, player_name),
  CONSTRAINT fk_sp_session FOREIGN KEY (session_id) REFERENCES game_sessions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 6. requirements
-- Nota: session_id não tem FK para suportar requisitos do sistema
--       (seeding de cenários sem sessão de jogo real)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS requirements (
  id                   CHAR(36)     NOT NULL DEFAULT (UUID()),
  session_id           CHAR(36)     DEFAULT NULL,
  individual_session_id CHAR(36)    DEFAULT NULL,
  requirement_text     TEXT         NOT NULL,
  classification       VARCHAR(100) NOT NULL,
  scenario_id          INT          NOT NULL DEFAULT 1,
  score                INT          NOT NULL DEFAULT 0,
  is_valid_requirement TINYINT(1)   NOT NULL DEFAULT 1,
  created_by           CHAR(36)     DEFAULT NULL,
  created_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_req_session_id (session_id),
  KEY idx_req_individual_session_id (individual_session_id),
  KEY idx_req_scenario_id (scenario_id),
  KEY idx_req_validity (is_valid_requirement),
  CONSTRAINT fk_req_individual_session FOREIGN KEY (individual_session_id) REFERENCES individual_sessions (id) ON DELETE CASCADE,
  CONSTRAINT fk_req_scenario           FOREIGN KEY (scenario_id)           REFERENCES scenarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 7. stored_requirements (banco de palavras)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stored_requirements (
  id               CHAR(36)  NOT NULL DEFAULT (UUID()),
  requirement_text TEXT      NOT NULL,
  classification   ENUM('functional','non-functional','business','constraint') NOT NULL,
  words            JSON      DEFAULT NULL,
  created_at       DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_sr_classification (classification),
  KEY idx_sr_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 8. judgments
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS judgments (
  id             CHAR(36) NOT NULL DEFAULT (UUID()),
  session_id     CHAR(36) NOT NULL,
  participant_id CHAR(36) NOT NULL,
  criteria       ENUM('clarity','completeness','testability','feasibility') NOT NULL,
  score          INT      NOT NULL,
  feedback       TEXT     DEFAULT NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_judgment (session_id, participant_id, criteria),
  CONSTRAINT chk_j_score  CHECK (score >= 1 AND score <= 5),
  CONSTRAINT fk_j_session     FOREIGN KEY (session_id)     REFERENCES game_sessions        (id) ON DELETE CASCADE,
  CONSTRAINT fk_j_participant FOREIGN KEY (participant_id) REFERENCES session_participants (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 9. requirement_assignments
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS requirement_assignments (
  id             CHAR(36) NOT NULL DEFAULT (UUID()),
  session_id     CHAR(36) NOT NULL,
  requirement_id CHAR(36) NOT NULL,
  evaluator_id   CHAR(36) NOT NULL,
  creator_id     CHAR(36) NOT NULL,
  assigned_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ra_requirement_evaluator (requirement_id, evaluator_id),
  KEY idx_ra_session_id     (session_id),
  KEY idx_ra_evaluator_id   (evaluator_id),
  KEY idx_ra_requirement_id (requirement_id),
  CONSTRAINT fk_ra_session     FOREIGN KEY (session_id)     REFERENCES game_sessions (id) ON DELETE CASCADE,
  CONSTRAINT fk_ra_requirement FOREIGN KEY (requirement_id) REFERENCES requirements  (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 10. requirement_evaluations
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS requirement_evaluations (
  id                    CHAR(36)   NOT NULL DEFAULT (UUID()),
  assignment_id         CHAR(36)   NOT NULL,
  session_id            CHAR(36)   NOT NULL,
  requirement_id        CHAR(36)   NOT NULL,
  evaluator_id          CHAR(36)   NOT NULL,
  individual_session_id CHAR(36)   DEFAULT NULL,
  is_correct            TINYINT(1) NOT NULL,
  justification         TEXT       NOT NULL,
  evaluated_at          DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_re_assignment (assignment_id),
  KEY idx_re_session_id            (session_id),
  KEY idx_re_evaluator_id          (evaluator_id),
  KEY idx_re_individual_session_id (individual_session_id),
  CONSTRAINT fk_re_assignment        FOREIGN KEY (assignment_id)         REFERENCES requirement_assignments (id) ON DELETE CASCADE,
  CONSTRAINT fk_re_session           FOREIGN KEY (session_id)            REFERENCES game_sessions          (id) ON DELETE CASCADE,
  CONSTRAINT fk_re_requirement       FOREIGN KEY (requirement_id)        REFERENCES requirements           (id) ON DELETE CASCADE,
  CONSTRAINT fk_re_individual_session FOREIGN KEY (individual_session_id) REFERENCES individual_sessions   (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 11. individual_cross_assignments
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS individual_cross_assignments (
  id                   CHAR(36) NOT NULL DEFAULT (UUID()),
  source_session_id    CHAR(36) NOT NULL,
  evaluator_session_id CHAR(36) NOT NULL,
  assigned_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at         DATETIME DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ica_evaluator (evaluator_session_id),
  KEY idx_ica_source    (source_session_id),
  KEY idx_ica_evaluator (evaluator_session_id),
  CONSTRAINT fk_ica_source    FOREIGN KEY (source_session_id)    REFERENCES individual_sessions (id) ON DELETE CASCADE,
  CONSTRAINT fk_ica_evaluator FOREIGN KEY (evaluator_session_id) REFERENCES individual_sessions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 12. individual_requirement_evaluations
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS individual_requirement_evaluations (
  id                   CHAR(36)   NOT NULL DEFAULT (UUID()),
  individual_session_id CHAR(36)  NOT NULL,
  requirement_id       CHAR(36)   NOT NULL,
  evaluator_session_id CHAR(36)   NOT NULL,
  is_correct           TINYINT(1) NOT NULL,
  justification        TEXT       NOT NULL,
  evaluated_at         DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ire_requirement_evaluator (requirement_id, evaluator_session_id),
  KEY idx_ire_individual_session_id  (individual_session_id),
  KEY idx_ire_requirement_id         (requirement_id),
  KEY idx_ire_evaluator_session_id   (evaluator_session_id),
  CONSTRAINT fk_ire_individual_session FOREIGN KEY (individual_session_id) REFERENCES individual_sessions (id) ON DELETE CASCADE,
  CONSTRAINT fk_ire_requirement        FOREIGN KEY (requirement_id)        REFERENCES requirements        (id) ON DELETE CASCADE,
  CONSTRAINT fk_ire_evaluator          FOREIGN KEY (evaluator_session_id)  REFERENCES individual_sessions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 13. ai_evaluations
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_evaluations (
  id                       CHAR(36)     NOT NULL DEFAULT (UUID()),
  requirement_text         TEXT         NOT NULL,
  classification           VARCHAR(50)  NOT NULL,
  scenario_id              INT          DEFAULT NULL,
  player_name              VARCHAR(255) DEFAULT NULL,
  session_id               CHAR(36)     DEFAULT NULL,
  total_score              INT          NOT NULL DEFAULT 0,
  structure_score          INT          NOT NULL DEFAULT 0,
  clarity_score            INT          NOT NULL DEFAULT 0,
  scenario_alignment_score INT          NOT NULL DEFAULT 0,
  classification_score     INT          NOT NULL DEFAULT 0,
  classification_correct   TINYINT(1)   NOT NULL DEFAULT 0,
  ai_feedback              TEXT         DEFAULT NULL,
  improvements             JSON         DEFAULT NULL,
  ai_model                 VARCHAR(100) DEFAULT 'gpt-4',
  bonus_points             INT          DEFAULT 0,
  evaluation_time          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ae_scenario_id  (scenario_id),
  KEY idx_ae_session_id   (session_id),
  KEY idx_ae_player_name  (player_name),
  KEY idx_ae_total_score  (total_score),
  CONSTRAINT fk_ae_scenario FOREIGN KEY (scenario_id) REFERENCES scenarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 14. ai_training_contexts
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_training_contexts (
  id                       INT      NOT NULL AUTO_INCREMENT,
  scenario_id              INT      NOT NULL,
  training_context         TEXT     NOT NULL,
  evaluation_criteria      TEXT     NOT NULL,
  example_good_requirements JSON    DEFAULT NULL,
  example_bad_requirements  JSON    DEFAULT NULL,
  created_at               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_atc_scenario (scenario_id),
  KEY idx_atc_scenario_id (scenario_id),
  KEY idx_atc_created_at  (created_at),
  CONSTRAINT fk_atc_scenario FOREIGN KEY (scenario_id) REFERENCES scenarios (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
