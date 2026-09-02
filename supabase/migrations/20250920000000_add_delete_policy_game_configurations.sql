-- Add missing DELETE policy for game_configurations table
CREATE POLICY "Anyone can delete game configurations"
ON public.game_configurations
FOR DELETE
USING (true);