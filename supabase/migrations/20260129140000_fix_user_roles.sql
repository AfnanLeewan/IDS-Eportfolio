-- Fix user roles to strictly enforce one role per user

-- 1. Data Cleanup: Remove 'student' roles for users who also have 'teacher' or 'admin' roles
-- We keep the highest privilege role
DELETE FROM public.user_roles 
WHERE role = 'student' 
AND user_id IN (
    SELECT user_id FROM public.user_roles WHERE role IN ('teacher', 'admin')
);

-- Also handle edge case: if someone has both admin and teacher (unlikely but possible), keep admin
DELETE FROM public.user_roles 
WHERE role = 'teacher' 
AND user_id IN (
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
);

-- 2. Drop the old composite unique constraint
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;

-- 3. Add new unique constraint on user_id only
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);

-- 4. Update create_new_user function to handle the unified constraint
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
    lower(p_email),
    extensions.crypt(p_password, extensions.gen_salt('bf', 10)),
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
  
  -- Assign role (override default student role from trigger)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, p_role::app_role)
  ON CONFLICT (user_id) 
  DO UPDATE SET role = EXCLUDED.role;
  
  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;
