-- Cross-evaluation system for requirements
-- This migration creates tables to support cross-evaluation where users evaluate requirements created by others

-- Table to store requirement assignments (who evaluates what)
CREATE TABLE public.requirement_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  requirement_id UUID NOT NULL REFERENCES public.requirements(id) ON DELETE CASCADE,
  evaluator_id UUID NOT NULL, -- participant who will evaluate this requirement
  creator_id UUID NOT NULL,   -- participant who created the requirement
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  -- Ensure one evaluator per requirement
  UNIQUE(requirement_id, evaluator_id),
  -- Prevent self-evaluation
  CHECK (evaluator_id != creator_id)
);

-- Table to store requirement evaluations (Phase 2 results)
CREATE TABLE public.requirement_evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES public.requirement_assignments(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  requirement_id UUID NOT NULL REFERENCES public.requirements(id) ON DELETE CASCADE,
  evaluator_id UUID NOT NULL, -- participant who made the evaluation

  -- Evaluation fields
  is_correct BOOLEAN NOT NULL,
  justification TEXT NOT NULL,

  -- Timestamps
  evaluated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  -- Ensure one evaluation per assignment
  UNIQUE(assignment_id)
);

-- Enable RLS on new tables
ALTER TABLE public.requirement_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requirement_evaluations ENABLE ROW LEVEL SECURITY;

-- Policies for requirement_assignments
CREATE POLICY "Anyone can view requirement assignments"
ON public.requirement_assignments
FOR SELECT
USING (true);

CREATE POLICY "System can create requirement assignments"
ON public.requirement_assignments
FOR INSERT
WITH CHECK (true);

-- Policies for requirement_evaluations
CREATE POLICY "Anyone can view requirement evaluations"
ON public.requirement_evaluations
FOR SELECT
USING (true);

CREATE POLICY "Evaluators can create evaluations"
ON public.requirement_evaluations
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Evaluators can update their evaluations"
ON public.requirement_evaluations
FOR UPDATE
USING (true);

-- Indexes for performance
CREATE INDEX idx_requirement_assignments_session_id ON public.requirement_assignments(session_id);
CREATE INDEX idx_requirement_assignments_evaluator_id ON public.requirement_assignments(evaluator_id);
CREATE INDEX idx_requirement_assignments_requirement_id ON public.requirement_assignments(requirement_id);

CREATE INDEX idx_requirement_evaluations_session_id ON public.requirement_evaluations(session_id);
CREATE INDEX idx_requirement_evaluations_evaluator_id ON public.requirement_evaluations(evaluator_id);
CREATE INDEX idx_requirement_evaluations_assignment_id ON public.requirement_evaluations(assignment_id);

-- Enable realtime for new tables
ALTER TABLE public.requirement_assignments REPLICA IDENTITY FULL;
ALTER TABLE public.requirement_evaluations REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.requirement_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.requirement_evaluations;

-- Function to automatically create cross-evaluation assignments when phase advances
-- This will be called when the host advances from Phase 1 to Phase 2
CREATE OR REPLACE FUNCTION assign_requirements_for_cross_evaluation(session_uuid UUID)
RETURNS VOID AS $$
DECLARE
  participant_record RECORD;
  requirement_record RECORD;
  participants UUID[];
  participant_count INTEGER;
  current_evaluator_index INTEGER := 0;
BEGIN
  -- Get all participants for this session
  SELECT ARRAY_AGG(id ORDER BY joined_at) INTO participants
  FROM public.session_participants
  WHERE session_id = session_uuid;

  participant_count := array_length(participants, 1);

  -- If less than 2 participants, cannot do cross-evaluation
  IF participant_count < 2 THEN
    RAISE EXCEPTION 'Need at least 2 participants for cross-evaluation';
  END IF;

  -- Delete existing assignments for this session (in case of re-assignment)
  DELETE FROM public.requirement_assignments WHERE session_id = session_uuid;

  -- For each requirement, assign it to the next participant in rotation
  FOR requirement_record IN
    SELECT id, created_by
    FROM public.requirements
    WHERE session_id = session_uuid
    ORDER BY created_at
  LOOP
    -- Find next evaluator (not the creator)
    LOOP
      current_evaluator_index := (current_evaluator_index % participant_count) + 1;
      EXIT WHEN participants[current_evaluator_index] != requirement_record.created_by;
    END LOOP;

    -- Create assignment
    INSERT INTO public.requirement_assignments (
      session_id,
      requirement_id,
      evaluator_id,
      creator_id
    ) VALUES (
      session_uuid,
      requirement_record.id,
      participants[current_evaluator_index],
      requirement_record.created_by
    );
  END LOOP;

END;
$$ LANGUAGE plpgsql;

-- Add new status to game_sessions for evaluation phase
-- We'll add a new status 'evaluating' between 'completed' and final results
ALTER TABLE public.game_sessions
ADD COLUMN IF NOT EXISTS evaluation_phase_started_at TIMESTAMP WITH TIME ZONE;

COMMENT ON TABLE public.requirement_assignments IS 'Defines which participant evaluates which requirement (cross-evaluation)';
COMMENT ON TABLE public.requirement_evaluations IS 'Stores the evaluation results from Phase 2 (correct/incorrect + justification)';
COMMENT ON FUNCTION assign_requirements_for_cross_evaluation IS 'Automatically assigns requirements to different participants for cross-evaluation';