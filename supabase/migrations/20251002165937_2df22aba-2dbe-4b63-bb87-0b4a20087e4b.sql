-- Add 'completed' status to appointment_status enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'appointment_status' AND e.enumlabel = 'completed') THEN
    ALTER TYPE appointment_status ADD VALUE 'completed';
  END IF;
END $$;

-- Create function to auto-complete past appointments
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
  AND (appointment_date + end_time)::timestamp < NOW();
END;
$$;

-- Add unique constraint to reviews table (one review per appointment per client)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_review_per_appointment'
  ) THEN
    ALTER TABLE reviews ADD CONSTRAINT unique_review_per_appointment UNIQUE (appointment_id, client_id);
  END IF;
END $$;

-- Add RLS policy for clients to view their own reviews
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'reviews' AND policyname = 'Clients can view their own reviews'
  ) THEN
    CREATE POLICY "Clients can view their own reviews"
    ON reviews FOR SELECT
    USING (client_id = auth.uid());
  END IF;
END $$;