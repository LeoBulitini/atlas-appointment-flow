-- Adicionar colunas de geolocalização à tabela businesses
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 8),
ADD COLUMN IF NOT EXISTS longitude NUMERIC(11, 8),
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0 NOT NULL;

-- Criar índice para otimizar consultas espaciais
CREATE INDEX IF NOT EXISTS idx_businesses_location ON businesses(latitude, longitude);

-- Função para incrementar visualizações
CREATE OR REPLACE FUNCTION increment_business_views(business_uuid uuid)
RETURNS void AS $$
BEGIN
  UPDATE businesses 
  SET view_count = COALESCE(view_count, 0) + 1 
  WHERE id = business_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION increment_business_views TO authenticated, anon;