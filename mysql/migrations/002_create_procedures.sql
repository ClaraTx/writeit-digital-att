-- =============================================================
-- WriteIt - Triggers e Stored Procedures MySQL
-- =============================================================

-- -------------------------------------------------------------
-- TRIGGERS
-- -------------------------------------------------------------

DELIMITER $$

-- Impede auto-avaliação em requirement_assignments
CREATE TRIGGER trg_ra_no_self_evaluation
BEFORE INSERT ON requirement_assignments
FOR EACH ROW
BEGIN
  IF NEW.evaluator_id = NEW.creator_id THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Auto-avaliação não é permitida em requirement_assignments';
  END IF;
END$$

-- Impede auto-avaliação em individual_cross_assignments
CREATE TRIGGER trg_ica_no_self_evaluation
BEFORE INSERT ON individual_cross_assignments
FOR EACH ROW
BEGIN
  IF NEW.source_session_id = NEW.evaluator_session_id THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Auto-avaliação não é permitida em individual_cross_assignments';
  END IF;
END$$

-- Nota: a lógica de "apenas uma config ativa" é gerenciada pelo servidor
-- ao receber PATCH com is_active=1 (desativa as demais antes de ativar a nova)

DELIMITER ;

-- -------------------------------------------------------------
-- PROCEDURE: assign_individual_cross_evaluation
-- Cria avaliações cruzadas circulares para sessões individuais.
-- Jogador 1 → avalia Jogador 2 → avalia Jogador 3 → avalia Jogador 1
-- -------------------------------------------------------------

DELIMITER $$

CREATE PROCEDURE assign_individual_cross_evaluation()
BEGIN
  DECLARE v_count   INT  DEFAULT 0;
  DECLARE v_i       INT  DEFAULT 1;
  DECLARE v_evaluator_id CHAR(36);
  DECLARE v_source_id    CHAR(36);

  -- Tabela temporária com sessões elegíveis em ordem de criação
  DROP TEMPORARY TABLE IF EXISTS _tmp_ind_sessions;
  CREATE TEMPORARY TABLE _tmp_ind_sessions (
    idx        INT AUTO_INCREMENT PRIMARY KEY,
    session_id CHAR(36) NOT NULL
  );

  INSERT INTO _tmp_ind_sessions (session_id)
  SELECT id
  FROM individual_sessions
  WHERE status = 'phase1'
    AND phase1_completed_at IS NOT NULL
    AND id NOT IN (SELECT evaluator_session_id FROM individual_cross_assignments)
  ORDER BY created_at;

  SELECT COUNT(*) INTO v_count FROM _tmp_ind_sessions;

  IF v_count >= 2 THEN
    -- Remove atribuições anteriores para essas sessões
    DELETE FROM individual_cross_assignments
    WHERE evaluator_session_id IN (SELECT session_id FROM _tmp_ind_sessions);

    WHILE v_i <= v_count DO
      -- Quem vai avaliar
      SELECT session_id INTO v_evaluator_id
      FROM _tmp_ind_sessions WHERE idx = v_i;

      -- O que vai ser avaliado (próximo na fila circular)
      IF v_i = v_count THEN
        SELECT session_id INTO v_source_id FROM _tmp_ind_sessions WHERE idx = 1;
      ELSE
        SELECT session_id INTO v_source_id FROM _tmp_ind_sessions WHERE idx = v_i + 1;
      END IF;

      INSERT INTO individual_cross_assignments (id, source_session_id, evaluator_session_id)
      VALUES (UUID(), v_source_id, v_evaluator_id);

      UPDATE individual_sessions SET status = 'phase2' WHERE id = v_evaluator_id;

      SET v_i = v_i + 1;
    END WHILE;
  END IF;

  DROP TEMPORARY TABLE IF EXISTS _tmp_ind_sessions;
END$$

DELIMITER ;

-- -------------------------------------------------------------
-- PROCEDURE: assign_team_cross_evaluation
-- Cada equipe avalia os requisitos da próxima equipe (circular).
-- -------------------------------------------------------------

DELIMITER $$

CREATE PROCEDURE assign_team_cross_evaluation()
BEGIN
  DECLARE v_count       INT DEFAULT 0;
  DECLARE v_i           INT DEFAULT 1;
  DECLARE v_team_id     CHAR(36);
  DECLARE v_next_team_id CHAR(36);
  DECLARE v_next_idx    INT;

  DROP TEMPORARY TABLE IF EXISTS _tmp_teams;
  CREATE TEMPORARY TABLE _tmp_teams (
    idx        INT AUTO_INCREMENT PRIMARY KEY,
    session_id CHAR(36) NOT NULL
  );

  INSERT INTO _tmp_teams (session_id)
  SELECT id
  FROM game_sessions
  WHERE mode = 'team'
    AND status = 'completed'
    AND evaluation_phase_started_at IS NOT NULL
  ORDER BY created_at;

  SELECT COUNT(*) INTO v_count FROM _tmp_teams;

  IF v_count >= 2 THEN
    -- Remove atribuições existentes dessas equipes
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

      -- Participantes da equipe atual avaliam requisitos da próxima equipe
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

-- -------------------------------------------------------------
-- PROCEDURE: get_active_game_configuration
-- Retorna a configuração de jogo ativa.
-- -------------------------------------------------------------

DELIMITER $$

CREATE PROCEDURE get_active_game_configuration()
BEGIN
  SELECT
    phase1_duration,
    phase2_duration,
    max_team_members,
    min_team_members,
    min_individual_players,
    lobby_duration,
    name AS configuration_name
  FROM game_configurations
  WHERE is_active = 1
  LIMIT 1;
END$$

DELIMITER ;

-- -------------------------------------------------------------
-- PROCEDURE: apply_game_configuration_to_session
-- Aplica a configuração ativa a uma sessão recém-criada.
-- p_session_type: 'team' | 'individual'
-- -------------------------------------------------------------

DELIMITER $$

CREATE PROCEDURE apply_game_configuration_to_session(
  IN p_session_id   CHAR(36),
  IN p_session_type VARCHAR(20)
)
BEGIN
  DECLARE v_phase1 INT DEFAULT 1200;
  DECLARE v_phase2 INT DEFAULT 900;

  SELECT phase1_duration, phase2_duration
  INTO   v_phase1, v_phase2
  FROM   game_configurations
  WHERE  is_active = 1
  LIMIT  1;

  IF p_session_type = 'team' THEN
    UPDATE game_sessions
    SET    phase1_duration = v_phase1,
           phase2_duration = v_phase2
    WHERE  id = p_session_id;
  ELSE
    UPDATE individual_sessions
    SET    phase1_duration = v_phase1,
           phase2_duration = v_phase2
    WHERE  id = p_session_id;
  END IF;
END$$

DELIMITER ;
