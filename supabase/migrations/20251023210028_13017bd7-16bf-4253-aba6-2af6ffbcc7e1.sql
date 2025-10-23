-- Corrigir função generate_slug com search_path
CREATE OR REPLACE FUNCTION generate_slug(name TEXT) 
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

-- Corrigir função auto_generate_slug com search_path
CREATE OR REPLACE FUNCTION auto_generate_slug() 
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_slug(NEW.name);
  END IF;
  RETURN NEW;
END;
$$;