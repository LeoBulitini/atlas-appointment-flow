-- Atualizar trigger para incluir telefone na criação de perfil
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
BEGIN
  INSERT INTO public.profiles (id, user_type, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'user_type')::user_type, 'client'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Novo Usuário'),
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL)
  );
  RETURN NEW;
END;
$$;

-- Sincronizar telefones existentes dos metadados para profiles
UPDATE public.profiles 
SET phone = (
  SELECT raw_user_meta_data->>'phone' 
  FROM auth.users 
  WHERE auth.users.id = profiles.id
)
WHERE phone IS NULL 
AND EXISTS (
  SELECT 1 
  FROM auth.users 
  WHERE auth.users.id = profiles.id 
  AND raw_user_meta_data->>'phone' IS NOT NULL
);