-- Adicionar campo para auto-confirmação de agendamentos
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS auto_confirm_appointments BOOLEAN DEFAULT false;