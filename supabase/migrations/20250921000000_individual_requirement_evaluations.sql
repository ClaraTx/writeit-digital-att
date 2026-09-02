-- Create a separate table for individual session requirement evaluations
-- This avoids conflicts with the team-based assignment system

CREATE TABLE public.individual_requirement_evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  individual_session_id UUID NOT NULL REFERENCES public.individual_sessions(id) ON DELETE CASCADE,
  requirement_id UUID NOT NULL REFERENCES public.requirements(id) ON DELETE CASCADE,
  evaluator_session_id UUID NOT NULL REFERENCES public.individual_sessions(id) ON DELETE CASCADE,

  -- Evaluation fields
  is_correct BOOLEAN NOT NULL,
  justification TEXT NOT NULL,

  -- Timestamps
  evaluated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  -- Ensure one evaluation per requirement per evaluator
  UNIQUE(requirement_id, evaluator_session_id)
);

-- Enable RLS
ALTER TABLE public.individual_requirement_evaluations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view individual requirement evaluations"
ON public.individual_requirement_evaluations
FOR SELECT
USING (true);

CREATE POLICY "Evaluators can create individual evaluations"
ON public.individual_requirement_evaluations
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Evaluators can update their individual evaluations"
ON public.individual_requirement_evaluations
FOR UPDATE
USING (true);

-- Indexes for performance
CREATE INDEX idx_individual_requirement_evaluations_individual_session_id
ON public.individual_requirement_evaluations(individual_session_id);

CREATE INDEX idx_individual_requirement_evaluations_requirement_id
ON public.individual_requirement_evaluations(requirement_id);

CREATE INDEX idx_individual_requirement_evaluations_evaluator_session_id
ON public.individual_requirement_evaluations(evaluator_session_id);

-- Enable realtime
ALTER TABLE public.individual_requirement_evaluations REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.individual_requirement_evaluations;

COMMENT ON TABLE public.individual_requirement_evaluations IS 'Stores evaluation results for individual session cross-evaluations (separate from team assignments)';