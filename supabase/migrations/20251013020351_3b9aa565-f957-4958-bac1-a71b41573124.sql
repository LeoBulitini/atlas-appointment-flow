-- Adicionar coluna is_temporary à tabela profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_temporary BOOLEAN DEFAULT FALSE;

-- Atualizar a trigger update_business_clients para não inserir clientes temporários
CREATE OR REPLACE FUNCTION public.update_business_clients()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_is_temporary BOOLEAN;
BEGIN
  -- Se o agendamento está sendo criado
  IF (TG_OP = 'INSERT') THEN
    -- Verificar se o cliente é temporário
    SELECT COALESCE(is_temporary, false) INTO v_is_temporary
    FROM profiles
    WHERE id = NEW.client_id;
    
    -- Não inserir clientes temporários em business_clients
    IF NOT v_is_temporary THEN
      INSERT INTO public.business_clients (business_id, client_id, first_appointment_date, last_appointment_date, total_appointments)
      VALUES (NEW.business_id, NEW.client_id, NEW.created_at, NULL, 1)
      ON CONFLICT (business_id, client_id)
      DO UPDATE SET
        total_appointments = business_clients.total_appointments + 1;
    END IF;
    RETURN NEW;
  END IF;

  -- Se o agendamento está sendo atualizado para 'completed' e a data já passou
  IF (TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status != 'completed') THEN
    -- Verificar se o cliente é temporário
    SELECT COALESCE(is_temporary, false) INTO v_is_temporary
    FROM profiles
    WHERE id = NEW.client_id;
    
    -- Não atualizar última data de agendamento para clientes temporários
    IF NOT v_is_temporary THEN
      IF (NEW.appointment_date <= CURRENT_DATE) THEN
        UPDATE public.business_clients
        SET last_appointment_date = NEW.appointment_date::timestamp with time zone
        WHERE business_id = NEW.business_id 
          AND client_id = NEW.client_id
          AND (last_appointment_date IS NULL OR NEW.appointment_date::timestamp with time zone > last_appointment_date);
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$function$;