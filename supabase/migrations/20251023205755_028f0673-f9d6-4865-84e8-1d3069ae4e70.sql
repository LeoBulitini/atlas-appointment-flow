-- Adicionar extensão unaccent para remover acentos
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Adicionar coluna slug na tabela businesses
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Adicionar coluna auto_redirect_to_calendar na tabela businesses
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS auto_redirect_to_calendar BOOLEAN DEFAULT false;

-- Criar índice único para performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_businesses_slug ON businesses(slug);

-- Função para gerar slug (remover acentos, espaços → hífens, lowercase)
CREATE OR REPLACE FUNCTION generate_slug(name TEXT) RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 1;
BEGIN
  -- Normalizar: remover acentos, converter para minúsculas, substituir espaços por hífens
  base_slug := lower(unaccent(name));
  base_slug := regexp_replace(base_slug, '[^a-z0-9]+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  
  -- Verificar se é um slug reservado
  IF base_slug IN ('auth', 'dashboard', 'business', 'booking', 'complete-profile', 'api', 'admin', 'login', 'signup') THEN
    base_slug := base_slug || '-company';
  END IF;
  
  final_slug := base_slug;
  
  -- Se slug já existe, adicionar número incremental
  WHILE EXISTS (SELECT 1 FROM businesses WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Trigger para gerar slug automaticamente ao inserir/atualizar
CREATE OR REPLACE FUNCTION auto_generate_slug() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_slug(NEW.name);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_generate_slug ON businesses;
CREATE TRIGGER trigger_auto_generate_slug
  BEFORE INSERT OR UPDATE ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_slug();

-- Gerar slugs para empresas existentes que não têm
UPDATE businesses SET slug = generate_slug(name) WHERE slug IS NULL;