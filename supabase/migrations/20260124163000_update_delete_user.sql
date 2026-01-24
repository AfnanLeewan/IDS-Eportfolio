-- Add policy for admins to update profiles
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Function to allow admins to delete users manually
-- Requires security definer to bypass RLS and delete from auth.users
CREATE OR REPLACE FUNCTION public.delete_user(
  p_user_id UUID
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Check if admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can delete users';
  END IF;

  -- Delete from user_roles and profiles will happen via ON DELETE CASCADE 
  -- but we delete from auth.users which is the source of truth
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;
