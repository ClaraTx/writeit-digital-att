-- Add lobby duration configuration to game_configurations table
ALTER TABLE public.game_configurations
ADD COLUMN lobby_duration INTEGER NOT NULL DEFAULT 300; -- 5 minutes default

-- Update existing configurations to have lobby duration
UPDATE public.game_configurations
SET lobby_duration = 300
WHERE lobby_duration IS NULL;