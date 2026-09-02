-- Create function for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create table for storing requirements for word bank generation
CREATE TABLE public.stored_requirements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requirement_text TEXT NOT NULL,
  classification TEXT NOT NULL CHECK (classification IN ('functional', 'non-functional', 'business', 'constraint')),
  words TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stored_requirements ENABLE ROW LEVEL SECURITY;

-- Create policies (open for admin purposes)
CREATE POLICY "Anyone can view stored requirements"
ON public.stored_requirements
FOR SELECT
USING (true);

CREATE POLICY "Anyone can create stored requirements"
ON public.stored_requirements
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update stored requirements"
ON public.stored_requirements
FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete stored requirements"
ON public.stored_requirements
FOR DELETE
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_stored_requirements_updated_at
  BEFORE UPDATE ON public.stored_requirements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_stored_requirements_classification ON public.stored_requirements(classification);
CREATE INDEX idx_stored_requirements_created_at ON public.stored_requirements(created_at DESC);

-- Enable realtime (optional, for live updates)
ALTER TABLE public.stored_requirements REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stored_requirements;