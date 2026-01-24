-- Remove the unique constraint on user_id in students table to allow independent data per academic year.
-- This enables a single authenticated user to have multiple student records (histories) across different years/classes.

ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_user_id_key;

-- Ensure there is a normal index on user_id for lookups
CREATE INDEX IF NOT EXISTS idx_students_user_id_lookup ON public.students(user_id);
