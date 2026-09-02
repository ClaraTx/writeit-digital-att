SET NAMES utf8mb4;

ALTER TABLE requirement_evaluations
  ADD COLUMN can_be_extracted         TINYINT(1) DEFAULT NULL AFTER is_correct,
  ADD COLUMN correctly_classified     TINYINT(1) DEFAULT NULL AFTER can_be_extracted,
  ADD COLUMN is_complete              TINYINT(1) DEFAULT NULL AFTER correctly_classified,
  ADD COLUMN can_be_extracted_note     TEXT       DEFAULT NULL AFTER is_complete,
  ADD COLUMN correctly_classified_note TEXT       DEFAULT NULL AFTER can_be_extracted_note,
  ADD COLUMN is_complete_note          TEXT       DEFAULT NULL AFTER correctly_classified_note,
  ADD COLUMN total_points             INT        DEFAULT NULL AFTER is_complete_note;


ALTER TABLE individual_requirement_evaluations
  ADD COLUMN can_be_extracted         TINYINT(1) DEFAULT NULL AFTER is_correct,
  ADD COLUMN correctly_classified     TINYINT(1) DEFAULT NULL AFTER can_be_extracted,
  ADD COLUMN is_complete              TINYINT(1) DEFAULT NULL AFTER correctly_classified,
  ADD COLUMN can_be_extracted_note     TEXT       DEFAULT NULL AFTER is_complete,
  ADD COLUMN correctly_classified_note TEXT       DEFAULT NULL AFTER can_be_extracted_note,
  ADD COLUMN is_complete_note          TEXT       DEFAULT NULL AFTER correctly_classified_note,
  ADD COLUMN total_points             INT        DEFAULT NULL AFTER is_complete_note;