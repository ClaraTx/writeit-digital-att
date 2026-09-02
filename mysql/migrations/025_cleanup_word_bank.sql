SET NAMES utf8mb4;

DELETE wb FROM word_bank wb
JOIN (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY scenario_id, category, LOWER(TRIM(word)) ORDER BY id) AS rn
  FROM word_bank
) ranked ON wb.id = ranked.id
WHERE ranked.rn > 1;

INSERT INTO word_bank (id, word, category, scenario_id, active)
SELECT UUID(), 'quando o Interlocutor', 'complemento', 1, 1
WHERE NOT EXISTS (
  SELECT 1 FROM word_bank
  WHERE scenario_id = 1 AND category = 'complemento' AND LOWER(TRIM(word)) = 'quando o interlocutor'
);

UPDATE word_bank
SET word = 'estiver online'
WHERE scenario_id = 1 AND category = 'condicao' AND word = 'quando o Interlocutor estiver online';

UPDATE word_bank
SET word = 'ao clicar no ícone'
WHERE scenario_id = 1 AND category = 'condicao' AND word = 'quando o Interlocutor clicar no ícone';

UPDATE word_bank
SET word = 'ao ativar'
WHERE scenario_id = 1 AND category = 'condicao' AND word = 'quando ele ativar';

UPDATE word_bank
SET word = 'ao sair'
WHERE scenario_id = 1 AND category = 'condicao' AND word = 'quando ele sair';

DELETE wb FROM word_bank wb
JOIN (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY scenario_id, category, LOWER(TRIM(word)) ORDER BY id) AS rn
  FROM word_bank
) ranked ON wb.id = ranked.id
WHERE ranked.rn > 1;