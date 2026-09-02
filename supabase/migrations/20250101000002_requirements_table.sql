-- Add requirements table for multiple requirements per session
CREATE TABLE public.requirements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL,
  requirement_text TEXT NOT NULL,
  classification TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.requirements ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view requirements" 
ON public.requirements 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create requirements" 
ON public.requirements 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Requirements can be updated by session participants" 
ON public.requirements 
FOR UPDATE 
USING (true);

-- Add prototype fields to game_sessions
ALTER TABLE public.game_sessions 
ADD COLUMN prototype_image_url TEXT,
ADD COLUMN prototype_description TEXT;

-- Create trigger for requirements timestamps
CREATE TRIGGER update_requirements_updated_at
BEFORE UPDATE ON public.requirements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for requirements
ALTER TABLE public.requirements REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.requirements;