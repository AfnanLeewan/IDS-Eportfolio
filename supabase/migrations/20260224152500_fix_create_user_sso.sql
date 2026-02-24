-- This scripts reverts the bad update and fixes the login error safely

-- 1. Replace create_new_user to ensure we provide empty strings for completely necessary columns
-- which prevents "Database error querying schema" on login due to NULL constraints in the pgcrypto compare function.

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

  -- Get instance_id from current user or use default
  SELECT instance_id INTO v_instance_id FROM auth.users WHERE id = auth.uid();
  IF v_instance_id IS NULL THEN
    v_instance_id := '00000000-0000-0000-0000-000000000000'::uuid;
  END IF;
  
  -- Generate ID
  v_user_id := gen_random_uuid();
  
  -- Create auth user safely, matching only the columns guaranteed to exist
  -- Adding empty strings for token columns to prevent schema errors during GoTrue's login hashing check
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
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    v_user_id,
    v_instance_id,
    lower(p_email),
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', p_full_name),
    now(),
    now(),
    'authenticated',
    'authenticated',
    '',
    '',
    '',
    ''
  );
  
  -- Create profile
  INSERT INTO public.profiles (user_id, email, full_name, created_at, updated_at)
  VALUES (v_user_id, lower(p_email), p_full_name, now(), now())
  ON CONFLICT (user_id) 
  DO UPDATE SET full_name = EXCLUDED.full_name, updated_at = now();
  
  -- Assign role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, p_role::app_role)
  ON CONFLICT (user_id) 
  DO UPDATE SET role = EXCLUDED.role;
  
  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;

-- 2. Fix the previously corrupted users (if they were broken by is_anonymous)
-- Some Supabase environments don't support `is_anonymous` etc., but this will reset them 
-- purely based on what is guaranteed:
UPDATE auth.users
  SET 
    recovery_token = COALESCE(recovery_token, ''),
    email_change_token_new = COALESCE(email_change_token_new, ''),
    email_change = COALESCE(email_change, '')
  WHERE 
    recovery_token IS NULL OR
    email_change_token_new IS NULL OR
    email_change IS NULL;
