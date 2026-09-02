-- =============================================================
-- WriteIt - Migration 009
-- =============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS matches (
  id                   CHAR(36)     NOT NULL DEFAULT (UUID()),
  match_code           VARCHAR(20)  NOT NULL,
  title                VARCHAR(255) NOT NULL DEFAULT 'Partida sem título',
  num_teams            INT          NOT NULL DEFAULT 2,
  status               ENUM('waiting','active','completed','encerrado') NOT NULL DEFAULT 'waiting',
  scenario_title       VARCHAR(255) DEFAULT NULL,
  scenario_description TEXT         DEFAULT NULL,
  created_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_match_code (match_code),
  CONSTRAINT chk_num_teams CHECK (num_teams >= 2)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS match_scenario_images (
  id          CHAR(36)     NOT NULL DEFAULT (UUID()),
  match_id    CHAR(36)     NOT NULL,
  url         TEXT         NOT NULL,
  alt         VARCHAR(255) DEFAULT NULL,
  caption     VARCHAR(255) DEFAULT NULL,
  sort_order  INT          NOT NULL DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_msi_match_id (match_id),
  CONSTRAINT fk_msi_match FOREIGN KEY (match_id) REFERENCES matches (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Adiciona match_id em game_sessions (só se não existir)
SET @col_match = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'game_sessions'
    AND COLUMN_NAME  = 'match_id'
);

SET @sql_match = IF(@col_match = 0,
  'ALTER TABLE game_sessions ADD COLUMN match_id CHAR(36) DEFAULT NULL AFTER id',
  'SELECT 1'
);
PREPARE stmt FROM @sql_match;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Adiciona team_number em game_sessions (só se não existir)
SET @col_team = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'game_sessions'
    AND COLUMN_NAME  = 'team_number'
);

SET @sql_team = IF(@col_team = 0,
  'ALTER TABLE game_sessions ADD COLUMN team_number INT DEFAULT NULL AFTER match_id',
  'SELECT 1'
);
PREPARE stmt FROM @sql_team;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK match_id → matches (só se não existir)
SET @fk_exists = (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA    = DATABASE()
    AND TABLE_NAME      = 'game_sessions'
    AND CONSTRAINT_NAME = 'fk_gs_match'
);

SET @sql_fk = IF(@fk_exists = 0,
  'ALTER TABLE game_sessions ADD CONSTRAINT fk_gs_match FOREIGN KEY (match_id) REFERENCES matches (id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Index match_id (só se não existir)
SET @idx_exists = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'game_sessions'
    AND INDEX_NAME   = 'idx_gs_match_id'
);

SET @sql_idx = IF(@idx_exists = 0,
  'CREATE INDEX idx_gs_match_id ON game_sessions (match_id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql_idx;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Atualiza procedure
DROP PROCEDURE IF EXISTS assign_team_cross_evaluation;

DELIMITER $$

CREATE PROCEDURE assign_team_cross_evaluation(IN p_match_id CHAR(36))
BEGIN
  DECLARE v_count        INT DEFAULT 0;
  DECLARE v_i            INT DEFAULT 1;
  DECLARE v_team_id      CHAR(36);
  DECLARE v_next_team_id CHAR(36);
  DECLARE v_next_idx     INT;

  DROP TEMPORARY TABLE IF EXISTS _tmp_teams;
  CREATE TEMPORARY TABLE _tmp_teams (
    idx        INT AUTO_INCREMENT PRIMARY KEY,
    session_id CHAR(36) NOT NULL
  );

  IF p_match_id IS NOT NULL THEN
    INSERT INTO _tmp_teams (session_id)
    SELECT id FROM game_sessions
    WHERE match_id = p_match_id
      AND mode = 'team'
      AND status = 'completed'
    ORDER BY team_number, created_at;
  ELSE
    INSERT INTO _tmp_teams (session_id)
    SELECT id FROM game_sessions
    WHERE mode = 'team'
      AND status = 'completed'
      AND match_id IS NULL
    ORDER BY created_at;
  END IF;

  SELECT COUNT(*) INTO v_count FROM _tmp_teams;

  IF v_count = 1 THEN
    SELECT session_id INTO v_team_id FROM _tmp_teams WHERE idx = 1;
    DELETE FROM requirement_assignments WHERE session_id = v_team_id;
    INSERT INTO requirement_assignments (id, session_id, requirement_id, evaluator_id, creator_id)
    SELECT UUID(), v_team_id, r.id, sp.id, r.created_by
    FROM requirements r
    CROSS JOIN session_participants sp
    WHERE r.session_id = v_team_id
      AND (r.created_by IS NULL OR r.created_by != sp.id);

  ELSEIF v_count >= 2 THEN
    DELETE ra FROM requirement_assignments ra
    INNER JOIN _tmp_teams t ON ra.session_id = t.session_id;

    WHILE v_i <= v_count DO
      SELECT session_id INTO v_team_id FROM _tmp_teams WHERE idx = v_i;
      IF v_i = v_count THEN
        SET v_next_idx = 1;
      ELSE
        SET v_next_idx = v_i + 1;
      END IF;
      SELECT session_id INTO v_next_team_id FROM _tmp_teams WHERE idx = v_next_idx;

      INSERT INTO requirement_assignments (id, session_id, requirement_id, evaluator_id, creator_id)
      SELECT UUID(), v_team_id, r.id, sp.id, r.created_by
      FROM requirements r
      CROSS JOIN session_participants sp
      WHERE r.session_id = v_next_team_id
        AND sp.session_id = v_team_id;

      SET v_i = v_i + 1;
    END WHILE;
  END IF;

  DROP TEMPORARY TABLE IF EXISTS _tmp_teams;
END$$

DELIMITER ;

SET FOREIGN_KEY_CHECKS = 1;