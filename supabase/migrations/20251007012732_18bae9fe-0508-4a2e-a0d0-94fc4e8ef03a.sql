-- Remover valores padrão em inglês da coluna payment_methods
ALTER TABLE businesses 
ALTER COLUMN payment_methods SET DEFAULT '{}';

-- Limpar valores em inglês existentes de todos os negócios
UPDATE businesses
SET payment_methods = ARRAY[]::text[]
WHERE payment_methods && ARRAY['debit', 'credit', 'cash', 'pix'];