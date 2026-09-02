-- Insert all PoneyZap requirements
-- This migration adds all the requirements for the PoneyZap scenario (ID: 1)

-- Functional Requirements (RF01-RF10)
INSERT INTO public.requirements (session_id, requirement_text, classification, score, created_by, scenario_id) VALUES
('00000000-0000-0000-0000-000000000000', 'O sistema deve permitir que o Interlocutor visualize o status online ou digitando quando o contato estiver ativo ou escrevendo mensagens.', 'funcional', 0, null, 1),
('00000000-0000-0000-0000-000000000000', 'O sistema deve permitir realizar ligações por vídeo quando o Interlocutor clicar no ícone de chamada de vídeo.', 'funcional', 0, null, 1),
('00000000-0000-0000-0000-000000000000', 'O sistema deve permitir realizar ligações por áudio quando o Interlocutor clicar no ícone de chamada de telefone convencional.', 'funcional', 0, null, 1),
('00000000-0000-0000-0000-000000000000', 'O sistema deve exibir o histórico completo de mensagens feitas com o contato diretamente na tela de conversa quando o Interlocutor deslizar a tela para baixo.', 'funcional', 0, null, 1),
('00000000-0000-0000-0000-000000000000', 'O sistema deve apresentar o status de envio / recebimento / visualização das mensagens com base nas ações do interlocutor.', 'funcional', 0, null, 1),
('00000000-0000-0000-0000-000000000000', 'O sistema deve permitir o envio de mensagens de voz quando o Interlocutor acionar por um longo período a opção de gravação de áudio.', 'funcional', 0, null, 1),
('00000000-0000-0000-0000-000000000000', 'O sistema deve permitir o envio de arquivos nos formatos PDF, JPG, PNG, Excel e Word.', 'funcional', 0, null, 1),
('00000000-0000-0000-0000-000000000000', 'O sistema deve permitir o envio de emojis.', 'funcional', 0, null, 1),
('00000000-0000-0000-0000-000000000000', 'O sistema deve permitir o envio de figurinhas.', 'funcional', 0, null, 1),
('00000000-0000-0000-0000-000000000000', 'O sistema deve permitir o envio de fotos tiradas com a câmera do celular.', 'funcional', 0, null, 1);

-- Non-Functional Requirements (RNF01-RNF03)
INSERT INTO public.requirements (session_id, requirement_text, classification, score, created_by, scenario_id) VALUES
('00000000-0000-0000-0000-000000000000', 'O sistema deve permitir o envio de mensagens em no máximo 1 milissegundo.', 'nao-funcional', 0, null, 1),
('00000000-0000-0000-0000-000000000000', 'O sistema deve manter a segurança das mensagens com criptografia utilizando o Signal Protocol.', 'nao-funcional', 0, null, 1),
('00000000-0000-0000-0000-000000000000', 'O sistema deve disponibilizar um chatbot que atenda clientes de lojas que utilizem o sistema para recebimento de pedidos.', 'nao-funcional', 0, null, 1);

-- Inverse Requirements (RI01-RI02)
INSERT INTO public.requirements (session_id, requirement_text, classification, score, created_by, scenario_id) VALUES
('00000000-0000-0000-0000-000000000000', 'O sistema não pode perder as mensagens enviadas ou dados do interlocutor.', 'inverso', 0, null, 1),
('00000000-0000-0000-0000-000000000000', 'O sistema não pode permitir tirar print de imagens íntimas recebidas.', 'inverso', 0, null, 1);

-- Additional Functional Requirements (RF01-RF04 second set)
INSERT INTO public.requirements (session_id, requirement_text, classification, score, created_by, scenario_id) VALUES
('00000000-0000-0000-0000-000000000000', 'O sistema deve permitir que o interlocutor envie mensagens anônimas quando ele ativar o modo anônimo na conversa.', 'funcional', 0, null, 1),
('00000000-0000-0000-0000-000000000000', 'O sistema deve disponibilizar um meio de pagamento utilizando Blockchain completo.', 'funcional', 0, null, 1),
('00000000-0000-0000-0000-000000000000', 'O sistema deve permitir ao interlocutor postar fotos em formato de stories.', 'funcional', 0, null, 1),
('00000000-0000-0000-0000-000000000000', 'O sistema deve permitir criar grupos de usuários para envio de mensagens a vários interlocutores de uma única vez.', 'funcional', 0, null, 1);

-- Additional Non-Functional Requirements (RNF01-RNF02 second set)
INSERT INTO public.requirements (session_id, requirement_text, classification, score, created_by, scenario_id) VALUES
('00000000-0000-0000-0000-000000000000', 'O sistema deve ser desenvolvido utilizando linguagem de programação python.', 'nao-funcional', 0, null, 1),
('00000000-0000-0000-0000-000000000000', 'O sistema deve funcionar em plataformas com sistema operacional IOS e Android.', 'nao-funcional', 0, null, 1);

-- Summary:
-- - 14 Functional Requirements
-- - 5 Non-Functional Requirements
-- - 2 Inverse Requirements
-- Total: 21 requirements for PoneyZap scenario