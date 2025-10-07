-- Melhorar a função de conclusão automática de agendamentos
DROP FUNCTION IF EXISTS public.complete_past_appointments();

CREATE OR REPLACE FUNCTION public.complete_past_appointments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  completed_count INTEGER;
  current_timestamp_br TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Obter timestamp atual no timezone do Brasil
  current_timestamp_br := NOW() AT TIME ZONE 'America/Sao_Paulo';
  
  -- Log para debug
  RAISE NOTICE 'Running complete_past_appointments at %', current_timestamp_br;
  
  -- Atualizar agendamentos que já passaram do horário de término
  WITH updated_appointments AS (
    UPDATE appointments
    SET status = 'completed'
    WHERE status IN ('confirmed', 'pending')
    AND (
      -- Comparação mais robusta: converter tudo para timestamp
      (appointment_date + appointment_time)::timestamp < current_timestamp_br::timestamp
      OR
      -- Também completar se a data + end_time já passou
      (appointment_date + end_time)::timestamp < current_timestamp_br::timestamp
    )
    RETURNING id, appointment_date, appointment_time, end_time
  )
  SELECT COUNT(*) INTO completed_count FROM updated_appointments;
  
  -- Log do resultado
  RAISE NOTICE 'Completed % appointments', completed_count;
  
END;
$function$;