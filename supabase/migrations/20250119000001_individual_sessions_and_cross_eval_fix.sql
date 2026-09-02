-- Individual player sessions and cross-evaluation fixes
-- This migration creates proper individual session support and fixes cross-evaluation

-- Table to store individual player sessions
CREATE TABLE public.individual_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'phase1', -- phase1, phase2, completed
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  phase1_completed_at TIMESTAMP WITH TIME ZONE,
  phase2_completed_at TIMESTAMP WITH TIME ZONE,

  -- Session metadata
  requirements_count INTEGER DEFAULT 0,
  evaluations_count INTEGER DEFAULT 0,
  score INTEGER DEFAULT 0
);

-- Add foreign key to requirements table for individual sessions
ALTER TABLE public.requirements
ADD COLUMN individual_session_id UUID REFERENCES public.individual_sessions(id) ON DELETE CASCADE;

-- Add foreign key to requirement_evaluations for individual sessions
ALTER TABLE public.requirement_evaluations
ADD COLUMN individual_session_id UUID REFERENCES public.individual_sessions(id) ON DELETE CASCADE;

-- Table to manage cross-evaluation assignments for individual players
CREATE TABLE public.individual_cross_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,

  -- The individual session that contains requirements to be evaluated
  source_session_id UUID NOT NULL REFERENCES public.individual_sessions(id) ON DELETE CASCADE,

  -- The individual session that will do the evaluation
  evaluator_session_id UUID NOT NULL REFERENCES public.individual_sessions(id) ON DELETE CASCADE,

  -- Assignment metadata
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Ensure each session evaluates exactly one other session
  UNIQUE(evaluator_session_id),
  -- Prevent self-evaluation
  CHECK (source_session_id != evaluator_session_id)
);

-- Enable RLS on new tables
ALTER TABLE public.individual_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.individual_cross_assignments ENABLE ROW LEVEL SECURITY;

-- Policies for individual_sessions
CREATE POLICY "Anyone can view individual sessions"
ON public.individual_sessions
FOR SELECT
USING (true);

CREATE POLICY "Anyone can create individual sessions"
ON public.individual_sessions
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update individual sessions"
ON public.individual_sessions
FOR UPDATE
USING (true);

-- Policies for individual_cross_assignments
CREATE POLICY "Anyone can view individual cross assignments"
ON public.individual_cross_assignments
FOR SELECT
USING (true);

CREATE POLICY "System can create individual cross assignments"
ON public.individual_cross_assignments
FOR INSERT
WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_individual_sessions_status ON public.individual_sessions(status);
CREATE INDEX idx_individual_sessions_created_at ON public.individual_sessions(created_at);
CREATE INDEX idx_requirements_individual_session_id ON public.requirements(individual_session_id);
CREATE INDEX idx_requirement_evaluations_individual_session_id ON public.requirement_evaluations(individual_session_id);
CREATE INDEX idx_individual_cross_assignments_evaluator ON public.individual_cross_assignments(evaluator_session_id);
CREATE INDEX idx_individual_cross_assignments_source ON public.individual_cross_assignments(source_session_id);

-- Enable realtime for new tables
ALTER TABLE public.individual_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.individual_cross_assignments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.individual_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.individual_cross_assignments;

-- Function to create cross-evaluation assignments for individual players
-- This creates a circular evaluation pattern: Player 1 → Player 2 → Player 3 → Player 1
CREATE OR REPLACE FUNCTION assign_individual_cross_evaluation()
RETURNS VOID AS $$
DECLARE
  session_record RECORD;
  sessions_array UUID[];
  sessions_count INTEGER;
  i INTEGER;
  next_index INTEGER;
BEGIN
  -- Get all individual sessions that completed phase 1 but haven't been assigned yet
  SELECT ARRAY_AGG(id ORDER BY created_at) INTO sessions_array
  FROM public.individual_sessions
  WHERE status = 'phase1'
    AND phase1_completed_at IS NOT NULL
    AND id NOT IN (
      SELECT evaluator_session_id
      FROM public.individual_cross_assignments
    );

  sessions_count := array_length(sessions_array, 1);

  -- Need at least 2 sessions for cross-evaluation
  IF sessions_count IS NULL OR sessions_count < 2 THEN
    RAISE NOTICE 'Not enough sessions for cross-evaluation. Found: %', COALESCE(sessions_count, 0);
    RETURN;
  END IF;

  -- Delete existing assignments for these sessions (in case of re-assignment)
  DELETE FROM public.individual_cross_assignments
  WHERE evaluator_session_id = ANY(sessions_array);

  -- Create circular assignments: each session evaluates the next one
  FOR i IN 1..sessions_count LOOP
    -- Calculate next index (circular)
    IF i = sessions_count THEN
      next_index := 1;
    ELSE
      next_index := i + 1;
    END IF;

    -- Create assignment
    INSERT INTO public.individual_cross_assignments (
      source_session_id,
      evaluator_session_id
    ) VALUES (
      sessions_array[next_index], -- Session to be evaluated
      sessions_array[i]           -- Session that will evaluate
    );

    -- Update session status to phase2
    UPDATE public.individual_sessions
    SET status = 'phase2'
    WHERE id = sessions_array[i];
  END LOOP;

  RAISE NOTICE 'Created % cross-evaluation assignments', sessions_count;
END;
$$ LANGUAGE plpgsql;

-- Modified function for team cross-evaluation (teams evaluate other teams)
CREATE OR REPLACE FUNCTION assign_team_cross_evaluation()
RETURNS VOID AS $$
DECLARE
  team_record RECORD;
  teams_array UUID[];
  teams_count INTEGER;
  i INTEGER;
  next_index INTEGER;
BEGIN
  -- Get all team sessions that completed phase 1
  SELECT ARRAY_AGG(id ORDER BY created_at) INTO teams_array
  FROM public.game_sessions
  WHERE mode = 'team'
    AND status = 'completed'
    AND evaluation_phase_started_at IS NOT NULL;

  teams_count := array_length(teams_array, 1);

  -- Need at least 2 teams for cross-evaluation
  IF teams_count IS NULL OR teams_count < 2 THEN
    RAISE NOTICE 'Not enough teams for cross-evaluation. Found: %', COALESCE(teams_count, 0);
    RETURN;
  END IF;

  -- Delete existing assignments for team cross-evaluation
  DELETE FROM public.requirement_assignments
  WHERE session_id = ANY(teams_array);

  -- For team cross-evaluation: Team A evaluates Team B's requirements
  FOR i IN 1..teams_count LOOP
    -- Calculate next team index (circular)
    IF i = teams_count THEN
      next_index := 1;
    ELSE
      next_index := i + 1;
    END IF;

    -- Get requirements from team to be evaluated
    FOR team_record IN
      SELECT r.id as requirement_id, r.created_by, sp.id as evaluator_participant_id
      FROM public.requirements r
      CROSS JOIN public.session_participants sp
      WHERE r.session_id = teams_array[next_index]  -- Requirements from next team
        AND sp.session_id = teams_array[i]          -- Evaluators from current team
    LOOP
      -- Create assignment: participants from team i evaluate requirements from team next_index
      INSERT INTO public.requirement_assignments (
        session_id,
        requirement_id,
        evaluator_id,
        creator_id
      ) VALUES (
        teams_array[i],                              -- Evaluating team session
        team_record.requirement_id,                  -- Requirement to evaluate
        team_record.evaluator_participant_id,        -- Who will evaluate
        team_record.created_by                       -- Who created the requirement
      );
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Created team cross-evaluation assignments for % teams', teams_count;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically trigger cross-evaluation when enough sessions/teams are ready
CREATE OR REPLACE FUNCTION auto_assign_cross_evaluations()
RETURNS VOID AS $$
BEGIN
  -- Handle individual cross-evaluation
  PERFORM assign_individual_cross_evaluation();

  -- Handle team cross-evaluation
  PERFORM assign_team_cross_evaluation();
END;
$$ LANGUAGE plpgsql;

-- Add mode column to game_sessions if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_sessions' AND column_name = 'mode') THEN
    ALTER TABLE public.game_sessions ADD COLUMN mode TEXT DEFAULT 'team';
  END IF;
END $$;

-- Add player_name column to game_sessions for individual mode
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_sessions' AND column_name = 'player_name') THEN
    ALTER TABLE public.game_sessions ADD COLUMN player_name TEXT;
  END IF;
END $$;

COMMENT ON TABLE public.individual_sessions IS 'Stores individual player game sessions separate from team sessions';
COMMENT ON TABLE public.individual_cross_assignments IS 'Manages cross-evaluation assignments for individual players (circular evaluation)';
COMMENT ON FUNCTION assign_individual_cross_evaluation IS 'Creates circular cross-evaluation assignments for individual players';
COMMENT ON FUNCTION assign_team_cross_evaluation IS 'Creates cross-evaluation assignments between different teams';
COMMENT ON FUNCTION auto_assign_cross_evaluations IS 'Automatically triggers both individual and team cross-evaluation when ready';