SET NAMES utf8mb4;

DROP PROCEDURE IF EXISTS assign_team_cross_evaluation;

DELIMITER $$

CREATE PROCEDURE assign_team_cross_evaluation(IN p_match_id CHAR(36))
BEGIN
  DECLARE v_count          INT DEFAULT 0;
  DECLARE v_i              INT DEFAULT 1;
  DECLARE v_team_id        CHAR(36);
  DECLARE v_next_team_id   CHAR(36);
  DECLARE v_next_idx       INT;
  DECLARE v_next_req_count INT DEFAULT 0;

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

    INSERT INTO requirement_assignments (id, session_id, requirement_id, evaluator_id, creator_id, counts_for_score)
    SELECT UUID(), v_team_id, r.id, leader.id, r.created_by, 0
    FROM requirements r
    CROSS JOIN (
      SELECT id FROM session_participants
      WHERE session_id = v_team_id
      ORDER BY joined_at ASC
      LIMIT 1
    ) leader
    WHERE r.session_id = v_team_id
      AND (
        r.created_by IS NULL
        OR r.created_by != leader.id
        OR NOT EXISTS (
          SELECT 1 FROM requirements r2
          WHERE r2.session_id = v_team_id
            AND (r2.created_by IS NULL OR r2.created_by != leader.id)
        )
      );

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

      SELECT COUNT(*) INTO v_next_req_count
      FROM requirements
      WHERE session_id = v_next_team_id;

      IF v_next_req_count > 0 THEN
        INSERT INTO requirement_assignments (id, session_id, requirement_id, evaluator_id, creator_id, counts_for_score)
        SELECT UUID(), v_team_id, r.id, leader.id, r.created_by, 1
        FROM requirements r
        CROSS JOIN (
          SELECT id FROM session_participants
          WHERE session_id = v_team_id
          ORDER BY joined_at ASC
          LIMIT 1
        ) leader
        WHERE r.session_id = v_next_team_id;
      ELSE
        INSERT INTO requirement_assignments (id, session_id, requirement_id, evaluator_id, creator_id, counts_for_score)
        SELECT UUID(), v_team_id, r.id, leader.id, r.created_by, 0
        FROM requirements r
        CROSS JOIN (
          SELECT id FROM session_participants
          WHERE session_id = v_team_id
          ORDER BY joined_at ASC
          LIMIT 1
        ) leader
        WHERE r.session_id = v_team_id
          AND (
            r.created_by IS NULL
            OR r.created_by != leader.id
            OR NOT EXISTS (
              SELECT 1 FROM requirements r2
              WHERE r2.session_id = v_team_id
                AND (r2.created_by IS NULL OR r2.created_by != leader.id)
            )
          );
      END IF;

      SET v_i = v_i + 1;
    END WHILE;
  END IF;

  DROP TEMPORARY TABLE IF EXISTS _tmp_teams;
END$$

DELIMITER ;