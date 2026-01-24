-- Change students.user_id foreign key to CASCADE deletion
ALTER TABLE public.students
DROP CONSTRAINT IF EXISTS students_user_id_fkey;

ALTER TABLE public.students
ADD CONSTRAINT students_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;
