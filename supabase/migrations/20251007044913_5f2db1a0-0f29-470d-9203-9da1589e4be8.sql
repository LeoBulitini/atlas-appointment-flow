-- Atualizar a função create_appointment_if_available para incluir o parâmetro de resgate
CREATE OR REPLACE FUNCTION public.create_appointment_if_available(
  p_business_id uuid,
  p_service_id uuid,
  p_client_id uuid,
  p_appointment_date date,
  p_appointment_time time without time zone,
  p_end_time time without time zone,
  p_notes text,
  p_auto_confirm boolean DEFAULT false,
  p_used_loyalty_redemption boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_conflict_count integer;
  v_appointment_id uuid;
  v_status appointment_status;
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
  
  -- Determine status based on auto_confirm parameter
  v_status := CASE 
    WHEN p_auto_confirm THEN 'confirmed'::appointment_status 
    ELSE 'pending'::appointment_status 
  END;
  
  -- Insert the appointment with the appropriate status and loyalty redemption flag
  INSERT INTO appointments (
    business_id, service_id, client_id,
    appointment_date, appointment_time, end_time,
    notes, status, used_loyalty_redemption
  ) VALUES (
    p_business_id, p_service_id, p_client_id,
    p_appointment_date, p_appointment_time, p_end_time,
    p_notes, v_status, p_used_loyalty_redemption
  )
  RETURNING id INTO v_appointment_id;
  
  RETURN json_build_object(
    'success', true,
    'appointment_id', v_appointment_id
  );
END;
$function$;