-- Fix create_new_user function to find pgcrypto functions (gen_salt, crypt)
-- by adding 'extensions' to the search_path

CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.create_new_user(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_role TEXT
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_user_id UUID;
  v_instance_id UUID;
BEGIN
  -- Check if admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can create users';
  END IF;

  -- Get instance_id from current user
  SELECT instance_id INTO v_instance_id FROM auth.users WHERE id = auth.uid();
  
  -- Generate ID
  v_user_id := gen_random_uuid();
  
  -- Create auth user
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    role,
    aud,
    confirmation_token
  ) VALUES (
    v_user_id,
    v_instance_id,
    p_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', p_full_name),
    now(),
    now(),
    'authenticated',
    'authenticated',
    ''
  );
  
  -- Create profile (handle case where trigger already created it)
  INSERT INTO public.profiles (user_id, email, full_name, created_at, updated_at)
  VALUES (v_user_id, p_email, p_full_name, now(), now())
  ON CONFLICT (user_id) 
  DO UPDATE SET full_name = EXCLUDED.full_name, updated_at = now();
  
  -- Assign role (handle case where trigger already added it)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, p_role::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;
