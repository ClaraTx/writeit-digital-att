-- Create scenarios table
CREATE TABLE public.scenarios (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert initial scenario PoneyZap
INSERT INTO public.scenarios (id, name, description) VALUES
(1, 'PoneyZap', 'Sistema de mensagens instantâneas com funcionalidades avançadas');

-- Add scenario_id column to requirements table
ALTER TABLE public.requirements
ADD COLUMN scenario_id INTEGER REFERENCES public.scenarios(id) DEFAULT 1;

-- Update existing requirements to use PoneyZap scenario
UPDATE public.requirements
SET scenario_id = 1
WHERE scenario_id IS NULL;

-- Make scenario_id NOT NULL after setting default values
ALTER TABLE public.requirements
ALTER COLUMN scenario_id SET NOT NULL;

-- Enable RLS for scenarios table
ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;

-- Policies for scenarios table
CREATE POLICY "Anyone can view scenarios"
ON public.scenarios
FOR SELECT
USING (true);

CREATE POLICY "Anyone can create scenarios"
ON public.scenarios
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update scenarios"
ON public.scenarios
FOR UPDATE
USING (true);

-- Create index for performance
CREATE INDEX idx_requirements_scenario_id ON public.requirements(scenario_id);

-- Enable realtime for scenarios
ALTER TABLE public.scenarios REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.scenarios;

COMMENT ON TABLE public.scenarios IS 'Stores different game scenarios/contexts for requirements';
COMMENT ON COLUMN public.requirements.scenario_id IS 'References the scenario this requirement belongs to';