-- Add is_valid_requirement column to requirements table
-- This column marks whether a requirement is actually valid for the scenario
-- or if it's a "false" requirement added to confuse players

ALTER TABLE public.requirements
ADD COLUMN is_valid_requirement BOOLEAN DEFAULT true;

-- Add index for better query performance
CREATE INDEX idx_requirements_validity ON public.requirements(is_valid_requirement);

-- Comment explaining the column
COMMENT ON COLUMN public.requirements.is_valid_requirement IS 'Indicates if the requirement is genuinely valid for the scenario (true) or a false requirement added for confusion (false)';