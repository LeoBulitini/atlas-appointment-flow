-- Remover a versão antiga da função sem o parâmetro de resgate
DROP FUNCTION IF EXISTS public.create_appointment_if_available(uuid, uuid, uuid, date, time, time, text, boolean);

-- Garantir que apenas a versão com o parâmetro de resgate existe
-- (a versão já foi criada na migração anterior)