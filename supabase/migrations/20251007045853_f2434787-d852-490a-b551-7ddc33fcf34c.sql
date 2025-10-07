-- Atualizar a constraint da tabela loyalty_transactions para incluir os novos tipos
ALTER TABLE loyalty_transactions 
DROP CONSTRAINT IF EXISTS loyalty_transactions_type_check;

ALTER TABLE loyalty_transactions
ADD CONSTRAINT loyalty_transactions_type_check 
CHECK (type IN ('ganho', 'uso', 'expiracao', 'ajuste', 'resgate', 'devolucao'));