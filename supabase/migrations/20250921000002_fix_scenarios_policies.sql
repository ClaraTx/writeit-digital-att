-- Drop existing policies for scenarios
DROP POLICY IF EXISTS "Anyone can view scenarios" ON public.scenarios;
DROP POLICY IF EXISTS "Anyone can create scenarios" ON public.scenarios;
DROP POLICY IF EXISTS "Anyone can update scenarios" ON public.scenarios;

-- Create new policies that work with anonymous access
CREATE POLICY "Enable read access for all users" ON public.scenarios
FOR SELECT
USING (true);

CREATE POLICY "Enable insert access for all users" ON public.scenarios
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON public.scenarios
FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable delete access for all users" ON public.scenarios
FOR DELETE
USING (true);