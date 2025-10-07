-- Add birth_date column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN birth_date DATE;

-- Create function to send birthday emails
CREATE OR REPLACE FUNCTION public.check_birthdays()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- This function will be called by the edge function
  -- It doesn't need to do anything here, just exists for structure
  RETURN;
END;
$$;