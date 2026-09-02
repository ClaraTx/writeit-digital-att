-- =============================================================
-- WriteIt - Migration 010
-- Cria tabela word_bank com palavras categorizadas.
-- Substitui o sistema de extração de palavras de requisitos.
-- =============================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS word_bank (
  id         CHAR(36)     NOT NULL DEFAULT (UUID()),
  word       VARCHAR(255) NOT NULL,
  category   ENUM('prefixo','verbo','objeto','complemento','metrica','condicao') NOT NULL,
  scenario_id INT         DEFAULT NULL,
  active     TINYINT(1)   NOT NULL DEFAULT 1,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_wb_category (category),
  KEY idx_wb_scenario (scenario_id),
  KEY idx_wb_active (active),
  CONSTRAINT fk_wb_scenario FOREIGN KEY (scenario_id) REFERENCES scenarios (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;