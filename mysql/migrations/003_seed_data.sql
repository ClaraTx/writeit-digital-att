-- =============================================================
-- WriteIt - Dados Iniciais (Seed)
-- =============================================================

-- -------------------------------------------------------------
-- Cenário: PoneyZap
-- -------------------------------------------------------------
INSERT INTO scenarios (id, name, description) VALUES
(1, 'PoneyZap', 'Sistema de mensagens instantâneas com funcionalidades avançadas');

-- -------------------------------------------------------------
-- Configuração padrão de jogo
-- -------------------------------------------------------------
INSERT INTO game_configurations (
  id, name, description,
  phase1_duration, phase2_duration,
  max_team_members, min_team_members, min_individual_players,
  lobby_duration, is_active
) VALUES (
  UUID(),
  'Configuração Padrão',
  'Configuração padrão do jogo: 20min Fase 1, 15min Fase 2, 2-6 membros por equipe',
  1200, 900, 6, 2, 2, 300, 0
);
UPDATE game_configurations SET is_active = 1 WHERE name = 'Configuração Padrão' LIMIT 1;

-- -------------------------------------------------------------
-- Requisitos do cenário PoneyZap
-- session_id = NULL indica requisito de sistema (sem sessão de jogo)
-- is_valid_requirement: 1 = válido, 0 = falso (para confundir)
-- -------------------------------------------------------------

-- Requisitos Funcionais válidos (RF01-RF10)
INSERT INTO requirements (id, session_id, individual_session_id, requirement_text, classification, scenario_id, score, is_valid_requirement, created_by) VALUES
(UUID(), '00000000-0000-0000-0000-000000000000', NULL, 'O sistema deve permitir que o Interlocutor visualize o status online ou digitando quando o contato estiver ativo ou escrevendo mensagens.', 'funcional', 1, 0, 1, NULL),
(UUID(), '00000000-0000-0000-0000-000000000000', NULL, 'O sistema deve permitir realizar ligações por vídeo quando o Interlocutor clicar no ícone de chamada de vídeo.', 'funcional', 1, 0, 1, NULL),
(UUID(), '00000000-0000-0000-0000-000000000000', NULL, 'O sistema deve permitir realizar ligações por áudio quando o Interlocutor clicar no ícone de chamada de telefone convencional.', 'funcional', 1, 0, 1, NULL),
(UUID(), '00000000-0000-0000-0000-000000000000', NULL, 'O sistema deve exibir o histórico completo de mensagens feitas com o contato diretamente na tela de conversa quando o Interlocutor deslizar a tela para baixo.', 'funcional', 1, 0, 1, NULL),
(UUID(), '00000000-0000-0000-0000-000000000000', NULL, 'O sistema deve apresentar o status de envio / recebimento / visualização das mensagens com base nas ações do interlocutor.', 'funcional', 1, 0, 1, NULL),
(UUID(), '00000000-0000-0000-0000-000000000000', NULL, 'O sistema deve permitir o envio de mensagens de voz quando o Interlocutor acionar por um longo período a opção de gravação de áudio.', 'funcional', 1, 0, 1, NULL),
(UUID(), '00000000-0000-0000-0000-000000000000', NULL, 'O sistema deve permitir o envio de arquivos nos formatos PDF, JPG, PNG, Excel e Word.', 'funcional', 1, 0, 1, NULL),
(UUID(), '00000000-0000-0000-0000-000000000000', NULL, 'O sistema deve permitir o envio de emojis.', 'funcional', 1, 0, 1, NULL),
(UUID(), '00000000-0000-0000-0000-000000000000', NULL, 'O sistema deve permitir o envio de figurinhas.', 'funcional', 1, 0, 1, NULL),
(UUID(), '00000000-0000-0000-0000-000000000000', NULL, 'O sistema deve permitir o envio de fotos tiradas com a câmera do celular.', 'funcional', 1, 0, 1, NULL);

-- Requisitos Não-Funcionais válidos (RNF01-RNF02)
INSERT INTO requirements (id, session_id, individual_session_id, requirement_text, classification, scenario_id, score, is_valid_requirement, created_by) VALUES
(UUID(), '00000000-0000-0000-0000-000000000000', NULL, 'O sistema deve manter a segurança das mensagens com criptografia utilizando o Signal Protocol.', 'nao-funcional', 1, 0, 1, NULL),
(UUID(), '00000000-0000-0000-0000-000000000000', NULL, 'O sistema deve disponibilizar um chatbot que atenda clientes de lojas que utilizem o sistema para recebimento de pedidos.', 'nao-funcional', 1, 0, 1, NULL);

-- Requisitos Inversos válidos (RI01-RI02)
INSERT INTO requirements (id, session_id, individual_session_id, requirement_text, classification, scenario_id, score, is_valid_requirement, created_by) VALUES
(UUID(), '00000000-0000-0000-0000-000000000000', NULL, 'O sistema não pode perder as mensagens enviadas ou dados do interlocutor.', 'inverso', 1, 0, 1, NULL),
(UUID(), '00000000-0000-0000-0000-000000000000', NULL, 'O sistema não pode permitir tirar print de imagens íntimas recebidas.', 'inverso', 1, 0, 1, NULL);

-- Requisitos INVÁLIDOS / falsos (is_valid_requirement = 0) — para confundir os jogadores
INSERT INTO requirements (id, session_id, individual_session_id, requirement_text, classification, scenario_id, score, is_valid_requirement, created_by) VALUES
(UUID(), '00000000-0000-0000-0000-000000000000', NULL, 'O sistema deve permitir que o interlocutor envie mensagens anônimas quando ele ativar o modo anônimo na conversa.', 'funcional', 1, 0, 0, NULL),
(UUID(), '00000000-0000-0000-0000-000000000000', NULL, 'O sistema deve disponibilizar um meio de pagamento utilizando Blockchain completo.', 'funcional', 1, 0, 0, NULL),
(UUID(), '00000000-0000-0000-0000-000000000000', NULL, 'O sistema deve permitir ao interlocutor postar fotos em formato de stories.', 'funcional', 1, 0, 0, NULL),
(UUID(), '00000000-0000-0000-0000-000000000000', NULL, 'O sistema deve permitir criar grupos de usuários para envio de mensagens a vários interlocutores de uma única vez.', 'funcional', 1, 0, 0, NULL),
(UUID(), '00000000-0000-0000-0000-000000000000', NULL, 'O sistema deve ser desenvolvido utilizando linguagem de programação python.', 'nao-funcional', 1, 0, 0, NULL),
(UUID(), '00000000-0000-0000-0000-000000000000', NULL, 'O sistema deve funcionar em plataformas com sistema operacional IOS e Android.', 'nao-funcional', 1, 0, 0, NULL),
-- RNF inválido da primeira lista
(UUID(), '00000000-0000-0000-0000-000000000000', NULL, 'O sistema deve permitir o envio de mensagens em no máximo 1 milissegundo.', 'nao-funcional', 1, 0, 0, NULL);
