-- Adicionar campo para permitir acúmulo de pontos além do necessário
ALTER TABLE loyalty_programs 
ADD COLUMN allow_points_accumulation boolean DEFAULT true;

COMMENT ON COLUMN loyalty_programs.allow_points_accumulation IS 'Se verdadeiro, permite que clientes acumulem pontos além do necessário para resgate. Se falso, bloqueia acúmulo ao atingir o limite.';