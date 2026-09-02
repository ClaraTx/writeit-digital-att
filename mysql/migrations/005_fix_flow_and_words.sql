-- =============================================================
-- WriteIt - Corrige session_id dos requisitos do banco de palavras
--           e adiciona mais requisitos "O sistema deve/não pode"
-- =============================================================

-- Atualiza session_id NULL → UUID admin para o hook useWordBank encontrar
UPDATE requirements
SET session_id = '00000000-0000-0000-0000-000000000000'
WHERE session_id IS NULL;

-- Mais "O sistema deve" (chegar a ~20 no total)
INSERT INTO requirements (id, session_id, individual_session_id, requirement_text, classification, scenario_id, score, is_valid_requirement, created_by) VALUES
(UUID(), '00000000-0000-0000-0000-000000000000', NULL, 'O sistema deve permitir que o Interlocutor crie grupos de contatos para organizar suas conversas.', 'funcional', 1, 0, 1, NULL),
(UUID(), '00000000-0000-0000-0000-000000000000', NULL, 'O sistema deve notificar o Interlocutor quando uma nova mensagem for recebida mesmo com o aplicativo minimizado.', 'funcional', 1, 0, 1, NULL),
(UUID(), '00000000-0000-0000-0000-000000000000', NULL, 'O sistema deve permitir que o Interlocutor fixe conversas importantes no topo da lista de chats.', 'funcional', 1, 0, 1, NULL),
(UUID(), '00000000-0000-0000-0000-000000000000', NULL, 'O sistema deve permitir que o Interlocutor arquive conversas antigas sem excluí-las permanentemente.', 'funcional', 1, 0, 1, NULL),
(UUID(), '00000000-0000-0000-0000-000000000000', NULL, 'O sistema deve exibir confirmação de leitura apenas quando o Interlocutor destinatário abrir a mensagem.', 'funcional', 1, 0, 1, NULL),
(UUID(), '00000000-0000-0000-0000-000000000000', NULL, 'O sistema deve permitir que o Interlocutor reencaminhe mensagens para outros contatos ou grupos.', 'funcional', 1, 0, 1, NULL),
(UUID(), '00000000-0000-0000-0000-000000000000', NULL, 'O sistema deve possibilitar a edição de mensagens enviadas dentro de um prazo de 15 minutos.', 'funcional', 1, 0, 1, NULL),
(UUID(), '00000000-0000-0000-0000-000000000000', NULL, 'O sistema deve responder a requisições de envio de mensagem em no máximo 2 segundos em condições normais de uso.', 'nao-funcional', 1, 0, 1, NULL);

-- Mais "O sistema não pode" (chegar a ~10 no total)
INSERT INTO requirements (id, session_id, individual_session_id, requirement_text, classification, scenario_id, score, is_valid_requirement, created_by) VALUES
(UUID(), '00000000-0000-0000-0000-000000000000', NULL, 'O sistema não pode armazenar mensagens descriptografadas nos servidores após entrega.', 'inverso', 1, 0, 1, NULL),
(UUID(), '00000000-0000-0000-0000-000000000000', NULL, 'O sistema não pode permitir que terceiros leiam conversas privadas sem autorização expressa do usuário.', 'inverso', 1, 0, 1, NULL),
(UUID(), '00000000-0000-0000-0000-000000000000', NULL, 'O sistema não pode bloquear o envio de mensagens de texto mesmo sem conexão com a internet, devendo enfileirá-las.', 'inverso', 1, 0, 1, NULL),
(UUID(), '00000000-0000-0000-0000-000000000000', NULL, 'O sistema não pode excluir o histórico de mensagens do dispositivo sem confirmação explícita do Interlocutor.', 'inverso', 1, 0, 1, NULL),
(UUID(), '00000000-0000-0000-0000-000000000000', NULL, 'O sistema não pode expor o número de telefone do Interlocutor a outros usuários sem autorização.', 'inverso', 1, 0, 1, NULL),
(UUID(), '00000000-0000-0000-0000-000000000000', NULL, 'O sistema não pode exibir o status "online" do Interlocutor quando ele estiver com a privacidade ativada.', 'inverso', 1, 0, 1, NULL),
(UUID(), '00000000-0000-0000-0000-000000000000', NULL, 'O sistema não pode encaminhar mensagens marcadas como confidenciais pelo remetente.', 'inverso', 1, 0, 1, NULL),
(UUID(), '00000000-0000-0000-0000-000000000000', NULL, 'O sistema não pode reproduzir automaticamente áudios ou vídeos recebidos sem ação do Interlocutor.', 'inverso', 1, 0, 1, NULL);

-- Atualiza o stored procedure para suportar 1 equipe (auto-avaliação cruzada interna)
DROP PROCEDURE IF EXISTS assign_team_cross_evaluation;
