-- =============================================================
-- WriteIt - Fix: requisitos de admin (session_id NULL → UUID especial)
-- Os requisitos do seed foram inseridos com session_id = NULL,
-- mas o admin os busca por session_id = '00000000-0000-0000-0000-000000000000'.
-- Esta migration corrige os registros existentes.
-- =============================================================

UPDATE requirements
SET session_id = '00000000-0000-0000-0000-000000000000'
WHERE session_id IS NULL
  AND individual_session_id IS NULL;
