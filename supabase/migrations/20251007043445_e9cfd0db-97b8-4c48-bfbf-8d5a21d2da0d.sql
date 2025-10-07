-- Adicionar campos de controle de resgates na tabela loyalty_balances
ALTER TABLE loyalty_balances
ADD COLUMN IF NOT EXISTS redemptions_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_redemption_date timestamp with time zone;

-- Adicionar campo para indicar se o agendamento usou resgate de recompensa
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS used_loyalty_redemption boolean DEFAULT false;

-- Criar função para processar resgate de recompensa
CREATE OR REPLACE FUNCTION process_loyalty_redemption()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  program RECORD;
  current_points INTEGER;
  current_visits INTEGER;
BEGIN
  -- Se o agendamento usa resgate de recompensa
  IF NEW.used_loyalty_redemption = true THEN
    -- Buscar programa ativo
    SELECT * INTO program 
    FROM loyalty_programs 
    WHERE business_id = NEW.business_id AND is_active = true;
    
    IF FOUND THEN
      IF program.program_type = 'pontos' THEN
        -- Verificar se tem pontos suficientes
        SELECT points INTO current_points
        FROM loyalty_balances
        WHERE business_id = NEW.business_id AND client_id = NEW.client_id;
        
        IF current_points >= program.points_required THEN
          -- Descontar pontos e registrar resgate
          UPDATE loyalty_balances
          SET points = points - program.points_required,
              redemptions_count = redemptions_count + 1,
              last_redemption_date = NOW(),
              updated_at = NOW()
          WHERE business_id = NEW.business_id AND client_id = NEW.client_id;
          
          -- Registrar transação de resgate
          INSERT INTO loyalty_transactions (
            business_id, client_id, type, points_change,
            description, appointment_id
          ) VALUES (
            NEW.business_id, NEW.client_id, 'resgate', -program.points_required,
            'Resgate de recompensa no agendamento', NEW.id
          );
        END IF;
        
      ELSIF program.program_type = 'visitas' THEN
        -- Verificar se tem visitas suficientes
        SELECT visits INTO current_visits
        FROM loyalty_balances
        WHERE business_id = NEW.business_id AND client_id = NEW.client_id;
        
        IF current_visits >= program.visits_required THEN
          -- Descontar visitas e registrar resgate
          UPDATE loyalty_balances
          SET visits = visits - program.visits_required,
              redemptions_count = redemptions_count + 1,
              last_redemption_date = NOW(),
              updated_at = NOW()
          WHERE business_id = NEW.business_id AND client_id = NEW.client_id;
          
          -- Registrar transação de resgate
          INSERT INTO loyalty_transactions (
            business_id, client_id, type, visits_change,
            description, appointment_id
          ) VALUES (
            NEW.business_id, NEW.client_id, 'resgate', -program.visits_required,
            'Resgate de recompensa no agendamento', NEW.id
          );
        END IF;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para processar resgate ao criar agendamento
CREATE TRIGGER handle_loyalty_redemption
AFTER INSERT ON appointments
FOR EACH ROW
EXECUTE FUNCTION process_loyalty_redemption();

-- Criar função para devolver pontos ao cancelar
CREATE OR REPLACE FUNCTION refund_loyalty_on_cancel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  program RECORD;
BEGIN
  -- Se o agendamento foi cancelado e usava resgate
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' AND NEW.used_loyalty_redemption = true THEN
    -- Buscar programa ativo
    SELECT * INTO program 
    FROM loyalty_programs 
    WHERE business_id = NEW.business_id AND is_active = true;
    
    IF FOUND THEN
      IF program.program_type = 'pontos' THEN
        -- Devolver pontos
        UPDATE loyalty_balances
        SET points = points + program.points_required,
            updated_at = NOW()
        WHERE business_id = NEW.business_id AND client_id = NEW.client_id;
        
        -- Registrar transação de devolução
        INSERT INTO loyalty_transactions (
          business_id, client_id, type, points_change,
          description, appointment_id
        ) VALUES (
          NEW.business_id, NEW.client_id, 'devolucao', program.points_required,
          'Devolução por cancelamento de agendamento', NEW.id
        );
        
      ELSIF program.program_type = 'visitas' THEN
        -- Devolver visitas
        UPDATE loyalty_balances
        SET visits = visits + program.visits_required,
            updated_at = NOW()
        WHERE business_id = NEW.business_id AND client_id = NEW.client_id;
        
        -- Registrar transação de devolução
        INSERT INTO loyalty_transactions (
          business_id, client_id, type, visits_change,
          description, appointment_id
        ) VALUES (
          NEW.business_id, NEW.client_id, 'devolucao', program.visits_required,
          'Devolução por cancelamento de agendamento', NEW.id
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para devolver pontos ao cancelar
CREATE TRIGGER handle_loyalty_refund_on_cancel
AFTER UPDATE ON appointments
FOR EACH ROW
EXECUTE FUNCTION refund_loyalty_on_cancel();