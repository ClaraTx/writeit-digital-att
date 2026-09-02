-- Game time configuration system
-- This migration creates a table to store configurable game timing settings

-- Table to store game configuration settings
CREATE TABLE public.game_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Time settings in seconds
  phase1_duration INTEGER NOT NULL DEFAULT 1200, -- 20 minutes = 1200 seconds
  phase2_duration INTEGER NOT NULL DEFAULT 900,  -- 15 minutes = 900 seconds

  -- Team settings
  max_team_members INTEGER NOT NULL DEFAULT 6, -- Maximum members per team
  min_team_members INTEGER NOT NULL DEFAULT 2, -- Minimum members to start

  -- Individual settings
  min_individual_players INTEGER NOT NULL DEFAULT 2, -- Minimum individual players for cross-evaluation

  -- Configuration metadata
  name TEXT NOT NULL DEFAULT 'Default Configuration',
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  -- Only one active configuration at a time
  UNIQUE(is_active) DEFERRABLE INITIALLY DEFERRED,

  -- Validation constraints
  CHECK (max_team_members >= min_team_members),
  CHECK (min_team_members >= 1),
  CHECK (min_individual_players >= 2),
  CHECK (phase1_duration > 0),
  CHECK (phase2_duration > 0)
);

-- Enable RLS
ALTER TABLE public.game_configurations ENABLE ROW LEVEL SECURITY;

-- Policies for game_configurations
CREATE POLICY "Anyone can view game configurations"
ON public.game_configurations
FOR SELECT
USING (true);

CREATE POLICY "Anyone can create game configurations"
ON public.game_configurations
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update game configurations"
ON public.game_configurations
FOR UPDATE
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_game_configurations_updated_at
BEFORE UPDATE ON public.game_configurations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default configuration
INSERT INTO public.game_configurations (
  name,
  description,
  phase1_duration,
  phase2_duration,
  max_team_members,
  min_team_members,
  min_individual_players,
  is_active
) VALUES (
  'Configuração Padrão',
  'Configuração padrão do jogo: 20min Fase 1, 15min Fase 2, 2-6 membros por equipe',
  1200, -- 20 minutes
  900,  -- 15 minutes
  6,    -- max team members
  2,    -- min team members
  2,    -- min individual players
  true
);

-- Add timing fields to existing tables
ALTER TABLE public.game_sessions
ADD COLUMN IF NOT EXISTS phase1_duration INTEGER DEFAULT 1200,
ADD COLUMN IF NOT EXISTS phase2_duration INTEGER DEFAULT 900,
ADD COLUMN IF NOT EXISTS phase1_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS phase2_started_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.individual_sessions
ADD COLUMN IF NOT EXISTS phase1_duration INTEGER DEFAULT 1200,
ADD COLUMN IF NOT EXISTS phase2_duration INTEGER DEFAULT 900,
ADD COLUMN IF NOT EXISTS phase1_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS phase2_started_at TIMESTAMP WITH TIME ZONE;

-- Function to get active game configuration
CREATE OR REPLACE FUNCTION get_active_game_configuration()
RETURNS TABLE (
  phase1_duration INTEGER,
  phase2_duration INTEGER,
  max_team_members INTEGER,
  min_team_members INTEGER,
  min_individual_players INTEGER,
  configuration_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    gc.phase1_duration,
    gc.phase2_duration,
    gc.max_team_members,
    gc.min_team_members,
    gc.min_individual_players,
    gc.name as configuration_name
  FROM public.game_configurations gc
  WHERE gc.is_active = true
  LIMIT 1;

  -- If no active configuration found, return defaults
  IF NOT FOUND THEN
    RETURN QUERY SELECT 1200::INTEGER, 900::INTEGER, 6::INTEGER, 2::INTEGER, 2::INTEGER, 'Default'::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to apply configuration to a new session
CREATE OR REPLACE FUNCTION apply_game_configuration_to_session(session_uuid UUID, session_type TEXT DEFAULT 'team')
RETURNS VOID AS $$
DECLARE
  config_record RECORD;
BEGIN
  -- Get active configuration
  SELECT * INTO config_record FROM get_active_game_configuration();

  -- Apply to appropriate table
  IF session_type = 'team' THEN
    UPDATE public.game_sessions
    SET
      phase1_duration = config_record.phase1_duration,
      phase2_duration = config_record.phase2_duration
    WHERE id = session_uuid;
  ELSE
    UPDATE public.individual_sessions
    SET
      phase1_duration = config_record.phase1_duration,
      phase2_duration = config_record.phase2_duration
    WHERE id = session_uuid;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Indexes for performance
CREATE INDEX idx_game_configurations_active ON public.game_configurations(is_active);
CREATE INDEX idx_game_sessions_timing ON public.game_sessions(phase1_started_at, phase2_started_at);
CREATE INDEX idx_individual_sessions_timing ON public.individual_sessions(phase1_started_at, phase2_started_at);

-- Enable realtime for configurations
ALTER TABLE public.game_configurations REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_configurations;

COMMENT ON TABLE public.game_configurations IS 'Stores configurable timing settings for game phases';
COMMENT ON FUNCTION get_active_game_configuration IS 'Returns the currently active game configuration settings';
COMMENT ON FUNCTION apply_game_configuration_to_session IS 'Applies active game configuration to a new game session';