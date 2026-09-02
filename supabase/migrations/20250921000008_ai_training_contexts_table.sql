-- Create ai_training_contexts table to store AI training data for each scenario
CREATE TABLE public.ai_training_contexts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scenario_id INTEGER NOT NULL REFERENCES public.scenarios(id) ON DELETE CASCADE,
  training_context TEXT NOT NULL,
  evaluation_criteria TEXT NOT NULL,
  example_good_requirements TEXT[] DEFAULT '{}',
  example_bad_requirements TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add unique constraint - one training context per scenario
ALTER TABLE public.ai_training_contexts
ADD CONSTRAINT unique_scenario_training UNIQUE (scenario_id);

-- Enable RLS
ALTER TABLE public.ai_training_contexts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view ai training contexts"
ON public.ai_training_contexts
FOR SELECT
USING (true);

CREATE POLICY "Anyone can create ai training contexts"
ON public.ai_training_contexts
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update ai training contexts"
ON public.ai_training_contexts
FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete ai training contexts"
ON public.ai_training_contexts
FOR DELETE
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_ai_training_contexts_updated_at
  BEFORE UPDATE ON public.ai_training_contexts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_ai_training_contexts_scenario_id ON public.ai_training_contexts(scenario_id);
CREATE INDEX idx_ai_training_contexts_created_at ON public.ai_training_contexts(created_at DESC);

-- Enable realtime
ALTER TABLE public.ai_training_contexts REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_training_contexts;

-- Add comments
COMMENT ON TABLE public.ai_training_contexts IS 'Stores AI training contexts and examples for each game scenario';
COMMENT ON COLUMN public.ai_training_contexts.scenario_id IS 'References the scenario this training context belongs to';
COMMENT ON COLUMN public.ai_training_contexts.training_context IS 'Detailed description of the scenario for AI training';
COMMENT ON COLUMN public.ai_training_contexts.evaluation_criteria IS 'Specific criteria the AI should use to evaluate requirements';
COMMENT ON COLUMN public.ai_training_contexts.example_good_requirements IS 'Array of good requirement examples for this scenario';
COMMENT ON COLUMN public.ai_training_contexts.example_bad_requirements IS 'Array of bad requirement examples for this scenario';