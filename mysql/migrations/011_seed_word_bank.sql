-- =============================================================
-- WriteIt - Migration 011
-- Popula word_bank com palavras categorizadas do cenário PoneyZap.
-- =============================================================

SET NAMES utf8mb4;

-- Prefixos (início do requisito - frases de abertura)
INSERT INTO word_bank (id, word, category, scenario_id) VALUES
(UUID(), 'O sistema deve', 'prefixo', 1),
(UUID(), 'O sistema não pode', 'prefixo', 1),
(UUID(), 'O sistema permite', 'prefixo', 1),
(UUID(), 'O sistema precisa', 'prefixo', 1),
(UUID(), 'O sistema é responsável por', 'prefixo', 1),
(UUID(), 'O aplicativo deve', 'prefixo', 1),
(UUID(), 'O aplicativo não pode', 'prefixo', 1),
(UUID(), 'A plataforma deve', 'prefixo', 1);

-- Verbos (ação principal do requisito)
INSERT INTO word_bank (id, word, category, scenario_id) VALUES
(UUID(), 'permitir', 'verbo', 1),
(UUID(), 'exibir', 'verbo', 1),
(UUID(), 'enviar', 'verbo', 1),
(UUID(), 'receber', 'verbo', 1),
(UUID(), 'notificar', 'verbo', 1),
(UUID(), 'bloquear', 'verbo', 1),
(UUID(), 'armazenar', 'verbo', 1),
(UUID(), 'criptografar', 'verbo', 1),
(UUID(), 'autenticar', 'verbo', 1),
(UUID(), 'validar', 'verbo', 1),
(UUID(), 'registrar', 'verbo', 1),
(UUID(), 'excluir', 'verbo', 1),
(UUID(), 'editar', 'verbo', 1),
(UUID(), 'encaminhar', 'verbo', 1),
(UUID(), 'arquivar', 'verbo', 1),
(UUID(), 'fixar', 'verbo', 1),
(UUID(), 'reproduzir', 'verbo', 1),
(UUID(), 'atualizar', 'verbo', 1),
(UUID(), 'sincronizar', 'verbo', 1),
(UUID(), 'baixar', 'verbo', 1);

-- Objetos (sobre o que o verbo age)
INSERT INTO word_bank (id, word, category, scenario_id) VALUES
(UUID(), 'mensagens de texto', 'objeto', 1),
(UUID(), 'mensagens de voz', 'objeto', 1),
(UUID(), 'mensagens de vídeo', 'objeto', 1),
(UUID(), 'figurinhas', 'objeto', 1),
(UUID(), 'emojis', 'objeto', 1),
(UUID(), 'arquivos PDF', 'objeto', 1),
(UUID(), 'imagens JPG', 'objeto', 1),
(UUID(), 'fotos da câmera', 'objeto', 1),
(UUID(), 'áudios gravados', 'objeto', 1),
(UUID(), 'o histórico de conversas', 'objeto', 1),
(UUID(), 'o status do contato', 'objeto', 1),
(UUID(), 'o número de telefone', 'objeto', 1),
(UUID(), 'a confirmação de leitura', 'objeto', 1),
(UUID(), 'o conteúdo íntimo', 'objeto', 1),
(UUID(), 'dados do usuário', 'objeto', 1),
(UUID(), 'grupos de contatos', 'objeto', 1),
(UUID(), 'conversas arquivadas', 'objeto', 1),
(UUID(), 'notificações', 'objeto', 1),
(UUID(), 'chamadas de vídeo', 'objeto', 1),
(UUID(), 'chamadas de áudio', 'objeto', 1);

-- Complementos (quem realiza / contexto)
INSERT INTO word_bank (id, word, category, scenario_id) VALUES
(UUID(), 'que o Interlocutor', 'complemento', 1),
(UUID(), 'que o usuário', 'complemento', 1),
(UUID(), 'que o contato', 'complemento', 1),
(UUID(), 'quando o Interlocutor', 'complemento', 1),
(UUID(), 'quando o usuário', 'complemento', 1),
(UUID(), 'para o Interlocutor', 'complemento', 1),
(UUID(), 'para o contato', 'complemento', 1),
(UUID(), 'de outros usuários', 'complemento', 1),
(UUID(), 'sem autorização', 'complemento', 1),
(UUID(), 'com confirmação explícita', 'complemento', 1),
(UUID(), 'nos servidores', 'complemento', 1),
(UUID(), 'no dispositivo', 'complemento', 1),
(UUID(), 'em tempo real', 'complemento', 1),
(UUID(), 'de forma automática', 'complemento', 1),
(UUID(), 'após entrega', 'complemento', 1);

-- Métricas (quantificações e limites)
INSERT INTO word_bank (id, word, category, scenario_id) VALUES
(UUID(), 'em no máximo 2 segundos', 'metrica', 1),
(UUID(), 'em no máximo 1 milissegundo', 'metrica', 1),
(UUID(), 'em até 15 minutos', 'metrica', 1),
(UUID(), 'com no mínimo 128 bits', 'metrica', 1),
(UUID(), 'por até 30 dias', 'metrica', 1),
(UUID(), 'com 99,9% de disponibilidade', 'metrica', 1),
(UUID(), 'em menos de 5MB', 'metrica', 1),
(UUID(), 'para até 256 participantes', 'metrica', 1);

-- Condições (gatilhos e situações)
INSERT INTO word_bank (id, word, category, scenario_id) VALUES
(UUID(), 'quando o app estiver minimizado', 'condicao', 1),
(UUID(), 'quando a privacidade estiver ativa', 'condicao', 1),
(UUID(), 'quando estiver sem internet', 'condicao', 1),
(UUID(), 'ao clicar no ícone de chamada', 'condicao', 1),
(UUID(), 'ao acionar por longo período', 'condicao', 1),
(UUID(), 'ao abrir a mensagem', 'condicao', 1),
(UUID(), 'ao deslizar a tela para baixo', 'condicao', 1),
(UUID(), 'se o remetente marcar como confidencial', 'condicao', 1),
(UUID(), 'se o modo anônimo estiver ativo', 'condicao', 1),
(UUID(), 'após confirmação do usuário', 'condicao', 1);