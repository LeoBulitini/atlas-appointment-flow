-- Enable btree_gist extension for exclusion constraints
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Create atomic function to check and insert appointments
CREATE OR REPLACE FUNCTION create_appointment_if_available(
  p_business_id uuid,
  p_service_id uuid,
  p_client_id uuid,
  p_appointment_date date,
  p_appointment_time time,
  p_end_time time,
  p_notes text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conflict_count integer;
  v_appointment_id uuid;
BEGIN
  -- Lock the table to prevent race conditions
  LOCK TABLE appointments IN SHARE ROW EXCLUSIVE MODE;
  
  -- Check for conflicts with existing appointments
  SELECT COUNT(*) INTO v_conflict_count
  FROM appointments
  WHERE business_id = p_business_id
    AND appointment_date = p_appointment_date
    AND status IN ('pending', 'confirmed')
    AND (
      -- Check if times overlap using tsrange
      tsrange(
        (p_appointment_date + appointment_time)::timestamp,
        (p_appointment_date + end_time)::timestamp,
        '[)'
      ) && tsrange(
        (p_appointment_date + p_appointment_time)::timestamp,
        (p_appointment_date + p_end_time)::timestamp,
        '[)'
      )
    );
  
  IF v_conflict_count > 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'conflict',
      'message', 'Horário não disponível'
    );
  END IF;
  
  -- Insert the appointment
  INSERT INTO appointments (
    business_id, service_id, client_id,
    appointment_date, appointment_time, end_time,
    notes, status
  ) VALUES (
    p_business_id, p_service_id, p_client_id,
    p_appointment_date, p_appointment_time, p_end_time,
    p_notes, 'pending'
  )
  RETURNING id INTO v_appointment_id;
  
  RETURN json_build_object(
    'success', true,
    'appointment_id', v_appointment_id
  );
END;
$$;

-- Add exclusion constraint to prevent overlapping appointments at database level
ALTER TABLE appointments 
ADD CONSTRAINT no_overlapping_appointments 
EXCLUDE USING gist (
  business_id WITH =,
  appointment_date WITH =,
  tsrange(
    (appointment_date + appointment_time)::timestamp,
    (appointment_date + end_time)::timestamp,
    '[)'
  ) WITH &&
) WHERE (status IN ('pending', 'confirmed'));