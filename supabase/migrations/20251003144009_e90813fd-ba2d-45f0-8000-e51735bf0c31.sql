-- Atualiza a função update_business_clients para usar appointment_date em vez de created_at
-- e considerar apenas agendamentos concluídos para last_appointment_date
CREATE OR REPLACE FUNCTION public.update_business_clients()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Se o agendamento está sendo criado
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.business_clients (business_id, client_id, first_appointment_date, last_appointment_date, total_appointments)
    VALUES (NEW.business_id, NEW.client_id, NEW.created_at, NULL, 1)
    ON CONFLICT (business_id, client_id)
    DO UPDATE SET
      total_appointments = business_clients.total_appointments + 1;
    RETURN NEW;
  END IF;

  -- Se o agendamento está sendo atualizado para 'completed' e a data já passou
  IF (TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status != 'completed') THEN
    IF (NEW.appointment_date <= CURRENT_DATE) THEN
      UPDATE public.business_clients
      SET last_appointment_date = NEW.appointment_date::timestamp with time zone
      WHERE business_id = NEW.business_id 
        AND client_id = NEW.client_id
        AND (last_appointment_date IS NULL OR NEW.appointment_date::timestamp with time zone > last_appointment_date);
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$function$;

-- Remove o trigger antigo se existir
DROP TRIGGER IF EXISTS update_business_clients_trigger ON public.appointments;

-- Recria o trigger para INSERT e UPDATE
CREATE TRIGGER update_business_clients_trigger
AFTER INSERT OR UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.update_business_clients();

-- Backfill: Atualiza last_appointment_date com base nos agendamentos concluídos existentes
UPDATE public.business_clients bc
SET last_appointment_date = (
  SELECT MAX(a.appointment_date)::timestamp with time zone
  FROM public.appointments a
  WHERE a.business_id = bc.business_id
    AND a.client_id = bc.client_id
    AND a.status = 'completed'
    AND a.appointment_date <= CURRENT_DATE
)
WHERE EXISTS (
  SELECT 1
  FROM public.appointments a
  WHERE a.business_id = bc.business_id
    AND a.client_id = bc.client_id
    AND a.status = 'completed'
    AND a.appointment_date <= CURRENT_DATE
);