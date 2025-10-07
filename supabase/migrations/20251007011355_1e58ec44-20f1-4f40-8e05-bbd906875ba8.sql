-- Fix timezone issue in complete_past_appointments function
-- Use Brazil timezone (America/Sao_Paulo) instead of UTC

CREATE OR REPLACE FUNCTION public.complete_past_appointments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE appointments
  SET status = 'completed'
  WHERE status IN ('confirmed', 'pending')
  AND (appointment_date + end_time)::timestamp < (NOW() AT TIME ZONE 'America/Sao_Paulo')::timestamp;
END;
$$;