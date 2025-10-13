-- Atualizar a função handle_new_user para incluir is_temporary do user_metadata
-- Primeiro, precisamos verificar se a função existe e atualizá-la

-- Recriar a função para incluir is_temporary
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    full_name, 
    phone, 
    user_type, 
    is_temporary
  )
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone',
    COALESCE((NEW.raw_user_meta_data->>'user_type')::user_type, 'client'::user_type),
    COALESCE((NEW.raw_user_meta_data->>'is_temporary')::boolean, false)
  );
  RETURN NEW;
END;
$$;