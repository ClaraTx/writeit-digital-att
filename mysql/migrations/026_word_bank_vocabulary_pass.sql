SET NAMES utf8mb4;

DELETE FROM word_bank
WHERE scenario_id = 1 AND category = 'objeto' AND word = 'o histórico completo das mensagens';

INSERT INTO word_bank (id, word, category, scenario_id, active) VALUES
(UUID(), 'histórico completo', 'objeto', 1, 1),
(UUID(), 'histórico completo', 'objeto', 1, 1);

INSERT INTO word_bank (id, word, category, scenario_id, active) VALUES
(UUID(), 'mensagens', 'objeto', 1, 1),
(UUID(), 'mensagens', 'objeto', 1, 1);

INSERT INTO word_bank (id, word, category, scenario_id, active)
SELECT UUID(), word, category, scenario_id, active
FROM word_bank
WHERE scenario_id = 1 AND category IN ('verbo', 'objeto', 'complemento', 'metrica');

INSERT INTO word_bank (id, word, category, scenario_id, active) VALUES
(UUID(), 'O sistema deve', 'prefixo', 1, 1),
(UUID(), 'O sistema deve', 'prefixo', 1, 1),
(UUID(), 'O sistema deve', 'prefixo', 1, 1),
(UUID(), 'O sistema deve', 'prefixo', 1, 1),
(UUID(), 'O sistema deve', 'prefixo', 1, 1),
(UUID(), 'O sistema deve', 'prefixo', 1, 1),
(UUID(), 'O sistema deve', 'prefixo', 1, 1),
(UUID(), 'O sistema deve', 'prefixo', 1, 1),
(UUID(), 'O sistema deve', 'prefixo', 1, 1),
(UUID(), 'O sistema não pode', 'prefixo', 1, 1),
(UUID(), 'O sistema não pode', 'prefixo', 1, 1),
(UUID(), 'O sistema não pode', 'prefixo', 1, 1),
(UUID(), 'O sistema não pode', 'prefixo', 1, 1),
(UUID(), 'O sistema não pode', 'prefixo', 1, 1);

INSERT INTO word_bank (id, word, category, scenario_id, active) VALUES
(UUID(), 'que o Interlocutor', 'complemento', 1, 1),
(UUID(), 'que o Interlocutor', 'complemento', 1, 1),
(UUID(), 'que o Interlocutor', 'complemento', 1, 1),
(UUID(), 'que o Interlocutor', 'complemento', 1, 1),
(UUID(), 'ao Interlocutor', 'complemento', 1, 1),
(UUID(), 'ao Interlocutor', 'complemento', 1, 1),
(UUID(), 'ao Interlocutor', 'complemento', 1, 1),
(UUID(), 'do Interlocutor', 'complemento', 1, 1),
(UUID(), 'do Interlocutor', 'complemento', 1, 1),
(UUID(), 'do Interlocutor', 'complemento', 1, 1),
(UUID(), 'quando o Interlocutor', 'complemento', 1, 1),
(UUID(), 'quando o Interlocutor', 'complemento', 1, 1),
(UUID(), 'quando o Interlocutor', 'complemento', 1, 1),
(UUID(), 'quando o Interlocutor', 'complemento', 1, 1);
-- -------------------------------------------------------------
-- Parte 2: ajustes com base na conferência do baralho físico
-- -------------------------------------------------------------



DELETE FROM word_bank
WHERE scenario_id = 1 AND category = 'objeto' AND word = 'histórico completo';

INSERT INTO word_bank (id, word, category, scenario_id, active) VALUES
(UUID(), 'o histórico completo', 'objeto', 1, 1),
(UUID(), 'o histórico completo', 'objeto', 1, 1);

INSERT INTO word_bank (id, word, category, scenario_id, active) VALUES
(UUID(), 'de mensagens feitas', 'complemento', 1, 1),
(UUID(), 'de mensagens feitas', 'complemento', 1, 1);

INSERT INTO word_bank (id, word, category, scenario_id, active) VALUES
(UUID(), 'envio / recebimento / visualização', 'complemento', 1, 1),
(UUID(), 'envio', 'complemento', 1, 1),
(UUID(), 'recebimento', 'complemento', 1, 1),
(UUID(), 'visualização', 'complemento', 1, 1);
-- -------------------------------------------------------------
-- Parte 3: mais termos do físico + distratores sutis fora do cenário
-- -------------------------------------------------------------



-- -------------------------------------------------------------
-- Termos do baralho físico que faltavam no digital
-- -------------------------------------------------------------

INSERT INTO word_bank (id, word, category, scenario_id, active)
SELECT UUID(), 'a segurança das mensagens', 'complemento', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM word_bank WHERE scenario_id=1 AND category='complemento' AND word='a segurança das mensagens');

INSERT INTO word_bank (id, word, category, scenario_id, active)
SELECT UUID(), 'um chatbot que', 'objeto', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM word_bank WHERE scenario_id=1 AND category='objeto' AND word='um chatbot que');

INSERT INTO word_bank (id, word, category, scenario_id, active)
SELECT UUID(), 'atenda clientes de lojas', 'verbo', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM word_bank WHERE scenario_id=1 AND category='verbo' AND word='atenda clientes de lojas');

INSERT INTO word_bank (id, word, category, scenario_id, active)
SELECT UUID(), 'que utilizam', 'condicao', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM word_bank WHERE scenario_id=1 AND category='condicao' AND word='que utilizam');

INSERT INTO word_bank (id, word, category, scenario_id, active)
SELECT UUID(), 'o sistema poneyzap', 'objeto', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM word_bank WHERE scenario_id=1 AND category='objeto' AND word='o sistema poneyzap');

INSERT INTO word_bank (id, word, category, scenario_id, active)
SELECT UUID(), 'recebimento de pedidos', 'condicao', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM word_bank WHERE scenario_id=1 AND category='condicao' AND word='recebimento de pedidos');

INSERT INTO word_bank (id, word, category, scenario_id, active)
SELECT UUID(), 'autorizar consulta', 'verbo', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM word_bank WHERE scenario_id=1 AND category='verbo' AND word='autorizar consulta');

INSERT INTO word_bank (id, word, category, scenario_id, active)
SELECT UUID(), 'ou dados do Interlocutor', 'objeto', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM word_bank WHERE scenario_id=1 AND category='objeto' AND word='ou dados do Interlocutor');

INSERT INTO word_bank (id, word, category, scenario_id, active)
SELECT UUID(), 'confirmação', 'objeto', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM word_bank WHERE scenario_id=1 AND category='objeto' AND word='confirmação');

INSERT INTO word_bank (id, word, category, scenario_id, active)
SELECT UUID(), 'recebidas', 'objeto', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM word_bank WHERE scenario_id=1 AND category='objeto' AND word='recebidas');

INSERT INTO word_bank (id, word, category, scenario_id, active)
SELECT UUID(), 'que responda mensagens', 'verbo', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM word_bank WHERE scenario_id=1 AND category='verbo' AND word='que responda mensagens');

INSERT INTO word_bank (id, word, category, scenario_id, active)
SELECT UUID(), 'clicar no ícone', 'condicao', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM word_bank WHERE scenario_id=1 AND category='condicao' AND word='clicar no ícone');

INSERT INTO word_bank (id, word, category, scenario_id, active)
SELECT UUID(), 'de chamada de telefone convencional', 'condicao', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM word_bank WHERE scenario_id=1 AND category='condicao' AND word='de chamada de telefone convencional');

INSERT INTO word_bank (id, word, category, scenario_id, active)
SELECT UUID(), 'o status', 'objeto', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM word_bank WHERE scenario_id=1 AND category='objeto' AND word='o status');

INSERT INTO word_bank (id, word, category, scenario_id, active)
SELECT UUID(), 'quando o contato', 'complemento', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM word_bank WHERE scenario_id=1 AND category='complemento' AND word='quando o contato');

INSERT INTO word_bank (id, word, category, scenario_id, active)
SELECT UUID(), 'estiver ativo', 'condicao', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM word_bank WHERE scenario_id=1 AND category='condicao' AND word='estiver ativo');

INSERT INTO word_bank (id, word, category, scenario_id, active)
SELECT UUID(), 'diretamente na', 'complemento', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM word_bank WHERE scenario_id=1 AND category='complemento' AND word='diretamente na');

INSERT INTO word_bank (id, word, category, scenario_id, active)
SELECT UUID(), 'das mensagens', 'complemento', 1, 1
WHERE (SELECT COUNT(*) FROM word_bank WHERE scenario_id=1 AND category='complemento' AND word='das mensagens') < 2;

INSERT INTO word_bank (id, word, category, scenario_id, active)
SELECT UUID(), 'das mensagens', 'complemento', 1, 1
WHERE (SELECT COUNT(*) FROM word_bank WHERE scenario_id=1 AND category='complemento' AND word='das mensagens') < 2;

INSERT INTO word_bank (id, word, category, scenario_id, active)
SELECT UUID(), 'com base nas', 'complemento', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM word_bank WHERE scenario_id=1 AND category='complemento' AND word='com base nas');

INSERT INTO word_bank (id, word, category, scenario_id, active)
SELECT UUID(), 'ações do interlocutor', 'complemento', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM word_bank WHERE scenario_id=1 AND category='complemento' AND word='ações do interlocutor');

INSERT INTO word_bank (id, word, category, scenario_id, active)
SELECT UUID(), 'a opção de gravação de áudio', 'objeto', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM word_bank WHERE scenario_id=1 AND category='objeto' AND word='a opção de gravação de áudio');

INSERT INTO word_bank (id, word, category, scenario_id, active)
SELECT UUID(), 'acionar por um', 'verbo', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM word_bank WHERE scenario_id=1 AND category='verbo' AND word='acionar por um');

INSERT INTO word_bank (id, word, category, scenario_id, active)
SELECT UUID(), 'arquivos nos formatos', 'objeto', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM word_bank WHERE scenario_id=1 AND category='objeto' AND word='arquivos nos formatos');

INSERT INTO word_bank (id, word, category, scenario_id, active)
SELECT UUID(), 'PDF, JPG, PNG, Excel e Word', 'objeto', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM word_bank WHERE scenario_id=1 AND category='objeto' AND word='PDF, JPG, PNG, Excel e Word');

INSERT INTO word_bank (id, word, category, scenario_id, active)
SELECT UUID(), 'fotos tiradas', 'objeto', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM word_bank WHERE scenario_id=1 AND category='objeto' AND word='fotos tiradas');

INSERT INTO word_bank (id, word, category, scenario_id, active)
SELECT UUID(), 'com a câmera do celular', 'complemento', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM word_bank WHERE scenario_id=1 AND category='complemento' AND word='com a câmera do celular');

-- -------------------------------------------------------------
-- Distratores sutis: soam de app de mensagens, mas não fazem
-- parte do cenário PoneyZap validado (não viram requisito esperado)
-- -------------------------------------------------------------

INSERT INTO word_bank (id, word, category, scenario_id, active)
SELECT UUID(), 'gifs animados', 'objeto', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM word_bank WHERE scenario_id=1 AND category='objeto' AND word='gifs animados');

INSERT INTO word_bank (id, word, category, scenario_id, active)
SELECT UUID(), 'chamadas em grupo', 'objeto', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM word_bank WHERE scenario_id=1 AND category='objeto' AND word='chamadas em grupo');

INSERT INTO word_bank (id, word, category, scenario_id, active)
SELECT UUID(), 'mensagens programadas', 'objeto', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM word_bank WHERE scenario_id=1 AND category='objeto' AND word='mensagens programadas');

INSERT INTO word_bank (id, word, category, scenario_id, active)
SELECT UUID(), 'backup na nuvem', 'objeto', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM word_bank WHERE scenario_id=1 AND category='objeto' AND word='backup na nuvem');

INSERT INTO word_bank (id, word, category, scenario_id, active)
SELECT UUID(), 'traduzir', 'verbo', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM word_bank WHERE scenario_id=1 AND category='verbo' AND word='traduzir');

INSERT INTO word_bank (id, word, category, scenario_id, active)
SELECT UUID(), 'silenciar', 'verbo', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM word_bank WHERE scenario_id=1 AND category='verbo' AND word='silenciar');

INSERT INTO word_bank (id, word, category, scenario_id, active)
SELECT UUID(), 'com marca d''água', 'complemento', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM word_bank WHERE scenario_id=1 AND category='complemento' AND word='com marca d''água');

INSERT INTO word_bank (id, word, category, scenario_id, active)
SELECT UUID(), 'em modo escuro', 'complemento', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM word_bank WHERE scenario_id=1 AND category='complemento' AND word='em modo escuro');

INSERT INTO word_bank (id, word, category, scenario_id, active)
SELECT UUID(), 'em até 24 horas', 'metrica', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM word_bank WHERE scenario_id=1 AND category='metrica' AND word='em até 24 horas');

INSERT INTO word_bank (id, word, category, scenario_id, active)
SELECT UUID(), 'quando a bateria estiver baixa', 'condicao', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM word_bank WHERE scenario_id=1 AND category='condicao' AND word='quando a bateria estiver baixa');