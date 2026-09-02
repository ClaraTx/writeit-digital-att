-- Create tables for team-based game sessions
CREATE TABLE public.game_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code TEXT NOT NULL UNIQUE,
  requirement TEXT NOT NULL,
  classification TEXT NOT NULL,
  initial_score INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'judging', 'completed')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for team members in sessions
CREATE TABLE public.session_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  player_name TEXT NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(session_id, player_name)
);

-- Create table for individual judgments
CREATE TABLE public.judgments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.session_participants(id) ON DELETE CASCADE,
  criteria TEXT NOT NULL CHECK (criteria IN ('clarity', 'completeness', 'testability', 'feasibility')),
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(session_id, participant_id, criteria)
);

-- Enable Row Level Security
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.judgments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for game_sessions
CREATE POLICY "Anyone can view game sessions"
ON public.game_sessions
FOR SELECT
USING (true);

CREATE POLICY "Anyone can create game sessions"
ON public.game_sessions
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Session creator can update"
ON public.game_sessions
FOR UPDATE
USING (created_by = auth.uid() OR auth.uid() IS NULL);

-- RLS Policies for session_participants
CREATE POLICY "Anyone can view participants"
ON public.session_participants
FOR SELECT
USING (true);

CREATE POLICY "Anyone can join sessions"
ON public.session_participants
FOR INSERT
WITH CHECK (true);

-- RLS Policies for judgments
CREATE POLICY "Anyone can view judgments"
ON public.judgments
FOR SELECT
USING (true);

CREATE POLICY "Participants can create judgments"
ON public.judgments
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Participants can update their judgments"
ON public.judgments
FOR UPDATE
USING (participant_id IN (
  SELECT id FROM public.session_participants WHERE user_id = auth.uid() OR auth.uid() IS NULL
));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_game_sessions_updated_at
  BEFORE UPDATE ON public.game_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for real-time collaboration
ALTER TABLE public.game_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.session_participants REPLICA IDENTITY FULL;
ALTER TABLE public.judgments REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.game_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.judgments;