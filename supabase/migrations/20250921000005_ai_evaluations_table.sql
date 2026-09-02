-- Create table for AI evaluations and feedback
CREATE TABLE public.ai_evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Requirement info
  requirement_text TEXT NOT NULL,
  classification VARCHAR(50) NOT NULL,
  scenario_id INTEGER REFERENCES public.scenarios(id),

  -- Player info
  player_name VARCHAR(255),
  session_id UUID,

  -- AI Evaluation Results
  total_score INTEGER NOT NULL DEFAULT 0,
  structure_score INTEGER NOT NULL DEFAULT 0,
  clarity_score INTEGER NOT NULL DEFAULT 0,
  scenario_alignment_score INTEGER NOT NULL DEFAULT 0,
  classification_score INTEGER NOT NULL DEFAULT 0,
  classification_correct BOOLEAN NOT NULL DEFAULT false,

  -- AI Feedback
  ai_feedback TEXT,
  improvements JSONB, -- Array of improvement suggestions

  -- Metadata
  ai_model VARCHAR(100) DEFAULT 'gpt-4',
  evaluation_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  -- Additional scoring (10 points per correct requirement as mentioned)
  bonus_points INTEGER DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.ai_evaluations ENABLE ROW LEVEL SECURITY;

-- Policies for ai_evaluations table
CREATE POLICY "Anyone can view AI evaluations"
ON public.ai_evaluations
FOR SELECT
USING (true);

CREATE POLICY "Anyone can create AI evaluations"
ON public.ai_evaluations
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update AI evaluations"
ON public.ai_evaluations
FOR UPDATE
USING (true);

-- Indexes for performance
CREATE INDEX idx_ai_evaluations_scenario_id ON public.ai_evaluations(scenario_id);
CREATE INDEX idx_ai_evaluations_session_id ON public.ai_evaluations(session_id);
CREATE INDEX idx_ai_evaluations_player_name ON public.ai_evaluations(player_name);
CREATE INDEX idx_ai_evaluations_total_score ON public.ai_evaluations(total_score);

-- Enable realtime
ALTER TABLE public.ai_evaluations REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_evaluations;

COMMENT ON TABLE public.ai_evaluations IS 'Stores AI evaluation results and feedback for requirement analysis';