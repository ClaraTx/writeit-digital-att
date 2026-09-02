-- Mark specific PoneyZap requirements as invalid (false requirements)
-- These requirements are not actually valid for a messaging system like WhatsApp
-- and are added to confuse players

-- Mark the invalid functional requirements
UPDATE public.requirements
SET is_valid_requirement = false
WHERE scenario_id = 1
AND requirement_text IN (
  'O sistema deve permitir que o interlocutor envie mensagens anônimas quando ele ativar o modo anônimo na conversa.',
  'O sistema deve disponibilizar um meio de pagamento utilizando Blockchain completo.',
  'O sistema deve permitir ao interlocutor postar fotos em formato de stories.',
  'O sistema deve permitir criar grupos de usuários para envio de mensagens a vários interlocutores de uma única vez.'
);

-- Mark the invalid non-functional requirements
UPDATE public.requirements
SET is_valid_requirement = false
WHERE scenario_id = 1
AND requirement_text IN (
  'O sistema deve ser desenvolvido utilizando linguagem de programação python.',
  'O sistema deve funcionar em plataformas com sistema operacional IOS e Android.'
);

-- Verify the update
-- This should show 6 requirements marked as invalid for PoneyZap scenario
SELECT
  requirement_text,
  classification,
  is_valid_requirement
FROM public.requirements
WHERE scenario_id = 1
AND is_valid_requirement = false
ORDER BY classification, requirement_text;