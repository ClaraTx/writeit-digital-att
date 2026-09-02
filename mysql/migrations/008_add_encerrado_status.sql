-- =============================================================
-- WriteIt - Adiciona status 'encerrado' ao ENUM de game_sessions
-- Usado quando o professor encerra a partida manualmente
-- =============================================================

ALTER TABLE game_sessions
  MODIFY COLUMN status
    ENUM('waiting','judging','completed','evaluating','encerrado')
    NOT NULL DEFAULT 'waiting';
