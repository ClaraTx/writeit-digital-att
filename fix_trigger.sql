DROP TRIGGER IF EXISTS trg_ra_no_self_evaluation;

DELIMITER $$
CREATE TRIGGER trg_ra_no_self_evaluation
BEFORE INSERT ON requirement_assignments
FOR EACH ROW
BEGIN
  IF NEW.evaluator_id = NEW.creator_id AND NEW.counts_for_score = 1 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Auto-avaliação não é permitida quando a avaliação conta para a nota';
  END IF;
END$$
DELIMITER ;