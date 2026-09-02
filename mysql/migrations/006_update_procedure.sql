-- =============================================================
-- WriteIt - Atualiza assign_team_cross_evaluation para suportar 1 equipe
-- =============================================================

DELIMITER $$

CREATE PROCEDURE assign_team_cross_evaluation()
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

  INSERT INTO _tmp_teams (session_id)
  SELECT id
  FROM game_sessions
  WHERE mode = 'team'
    AND status = 'completed'
  ORDER BY created_at;

  SELECT COUNT(*) INTO v_count FROM _tmp_teams;

  IF v_count = 1 THEN
    -- Única equipe: cada participante avalia os requisitos dos outros membros
    SELECT session_id INTO v_team_id FROM _tmp_teams WHERE idx = 1;

    DELETE FROM requirement_assignments WHERE session_id = v_team_id;

    INSERT INTO requirement_assignments (id, session_id, requirement_id, evaluator_id, creator_id)
    SELECT UUID(), v_team_id, r.id, sp.id, r.created_by
    FROM requirements r
    CROSS JOIN session_participants sp
    WHERE r.session_id = v_team_id
      AND (r.created_by IS NULL OR r.created_by != sp.id);

  ELSEIF v_count >= 2 THEN
    -- Múltiplas equipes: avaliação circular cruzada
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
