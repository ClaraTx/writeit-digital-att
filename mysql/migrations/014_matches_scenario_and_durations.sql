

SET NAMES utf8mb4;

ALTER TABLE matches
  ADD COLUMN scenario_id INT DEFAULT NULL AFTER scenario_description,
  ADD COLUMN phase1_duration_minutes INT NOT NULL DEFAULT 10 AFTER scenario_id,
  ADD COLUMN phase2_duration_minutes INT NOT NULL DEFAULT 10 AFTER phase1_duration_minutes,
  ADD CONSTRAINT fk_matches_scenario FOREIGN KEY (scenario_id) REFERENCES scenarios (id) ON DELETE SET NULL;