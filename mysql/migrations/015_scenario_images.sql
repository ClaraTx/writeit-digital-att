SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS scenario_images (
  id           CHAR(36)  NOT NULL DEFAULT (UUID()),
  scenario_id  INT       NOT NULL,
  image_url    TEXT      NOT NULL,
  order_index  INT       NOT NULL DEFAULT 0,
  created_at   DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_scenario_images_scenario_order (scenario_id, order_index),
  CONSTRAINT fk_si_scenario FOREIGN KEY (scenario_id) REFERENCES scenarios (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO scenario_images (scenario_id, image_url, order_index)
SELECT id, image_url, 0
FROM scenarios
WHERE image_url IS NOT NULL AND image_url <> '';

SET FOREIGN_KEY_CHECKS = 1;