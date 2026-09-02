-- Fix activation function for game configurations
-- This migration creates a function to properly handle the unique constraint

-- Function to activate a configuration and deactivate all others
CREATE OR REPLACE FUNCTION activate_game_configuration(config_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Deactivate all configurations first
  UPDATE public.game_configurations
  SET is_active = false
  WHERE id != config_id;

  -- Then activate the selected one
  UPDATE public.game_configurations
  SET is_active = true
  WHERE id = config_id;

  -- Verify the configuration exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Configuration with id % not found', config_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Grant execution permission
GRANT EXECUTE ON FUNCTION activate_game_configuration(UUID) TO anon, authenticated;