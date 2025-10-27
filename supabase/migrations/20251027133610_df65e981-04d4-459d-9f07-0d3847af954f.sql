-- Corrigir logo_url com base64 muito grande que causa timeout
-- Limitar logo_url para evitar problemas de performance

-- Primeiro, limpar os logo_url que são base64 e muito grandes (>50KB)
UPDATE businesses 
SET logo_url = NULL 
WHERE logo_url IS NOT NULL 
AND logo_url LIKE 'data:image/%'
AND LENGTH(logo_url) > 50000;

-- Adicionar constraint para prevenir futuros problemas
-- Limitar tamanho do logo_url para evitar base64 grandes
ALTER TABLE businesses 
ADD CONSTRAINT check_logo_url_length 
CHECK (logo_url IS NULL OR LENGTH(logo_url) <= 50000);