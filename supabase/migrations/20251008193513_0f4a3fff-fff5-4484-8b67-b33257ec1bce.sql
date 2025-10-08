-- Atualizar função add_loyalty_points_on_completion para respeitar allow_points_accumulation
CREATE OR REPLACE FUNCTION public.add_loyalty_points_on_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  program RECORD;
  total_amount DECIMAL(10,2);
  points_to_add INTEGER;
  current_points INTEGER;
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    SELECT * INTO program 
    FROM loyalty_programs 
    WHERE business_id = NEW.business_id AND is_active = true;
    
    IF FOUND THEN
      IF program.program_type = 'pontos' THEN
        SELECT COALESCE(SUM(services.price), 0) INTO total_amount
        FROM appointment_services
        JOIN services ON services.id = appointment_services.service_id
        WHERE appointment_services.appointment_id = NEW.id;
        
        points_to_add := FLOOR(total_amount * program.points_per_real);
        
        -- Se allow_points_accumulation é false, verifica se ultrapassaria o limite
        IF NOT program.allow_points_accumulation THEN
          -- Buscar pontos atuais do cliente
          SELECT COALESCE(points, 0) INTO current_points
          FROM loyalty_balances
          WHERE business_id = NEW.business_id AND client_id = NEW.client_id;
          
          -- Limitar os pontos ao máximo necessário
          IF current_points + points_to_add > program.points_required THEN
            points_to_add := GREATEST(0, program.points_required - current_points);
          END IF;
        END IF;
        
        -- Só adicionar se houver pontos a adicionar
        IF points_to_add > 0 THEN
          INSERT INTO loyalty_balances (business_id, client_id, points)
          VALUES (NEW.business_id, NEW.client_id, points_to_add)
          ON CONFLICT (business_id, client_id) 
          DO UPDATE SET 
            points = loyalty_balances.points + points_to_add,
            updated_at = NOW();
          
          INSERT INTO loyalty_transactions (
            business_id, client_id, type, points_change, 
            description, appointment_id, expires_at
          ) VALUES (
            NEW.business_id, NEW.client_id, 'ganho', points_to_add,
            'Pontos ganhos no agendamento', NEW.id,
            CASE WHEN program.points_validity_days IS NOT NULL 
              THEN NOW() + (program.points_validity_days || ' days')::INTERVAL 
              ELSE NULL END
          );
        END IF;
        
      ELSIF program.program_type = 'visitas' THEN
        IF program.qualifying_services IS NULL OR 
           EXISTS (
             SELECT 1 FROM appointment_services
             WHERE appointment_id = NEW.id 
             AND service_id = ANY(program.qualifying_services)
           ) THEN
          
          INSERT INTO loyalty_balances (business_id, client_id, visits)
          VALUES (NEW.business_id, NEW.client_id, 1)
          ON CONFLICT (business_id, client_id) 
          DO UPDATE SET 
            visits = loyalty_balances.visits + 1,
            updated_at = NOW();
          
          INSERT INTO loyalty_transactions (
            business_id, client_id, type, visits_change, 
            description, appointment_id
          ) VALUES (
            NEW.business_id, NEW.client_id, 'ganho', 1,
            'Visita registrada', NEW.id
          );
        END IF;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;