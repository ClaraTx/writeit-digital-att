SET NAMES utf8mb4;


ALTER TABLE requirement_evaluations
  MODIFY COLUMN is_correct    TINYINT(1) DEFAULT NULL,
  MODIFY COLUMN justification TEXT       DEFAULT NULL;

ALTER TABLE individual_requirement_evaluations
  MODIFY COLUMN is_correct    TINYINT(1) DEFAULT NULL,
  MODIFY COLUMN justification TEXT       DEFAULT NULL;