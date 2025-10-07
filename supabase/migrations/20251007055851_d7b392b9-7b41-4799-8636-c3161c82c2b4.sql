-- Update the handle_new_user function to include birth_date
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, user_type, phone, birth_date)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    (NEW.raw_user_meta_data->>'user_type')::user_type,
    NEW.raw_user_meta_data->>'phone',
    (NEW.raw_user_meta_data->>'birth_date')::date
  );
  RETURN NEW;
END;
$$;