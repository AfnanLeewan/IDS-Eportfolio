-- Recreate assessments table to ensure correct schema (title, date) matching the codebase
-- Fixes foreign key violation by re-mapping existing scores to a new default assessment

-- 1. Drop existing table and cascade constraints
DROP TABLE IF EXISTS public.assessments CASCADE;

-- 2. Create new table with correct schema
CREATE TABLE public.assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL, 
    type TEXT DEFAULT 'exam', 
    date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    academic_year_id TEXT REFERENCES public.academic_years(id) ON DELETE CASCADE,
    program_id TEXT, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public read access for assessments" ON public.assessments
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and Teachers can manage assessments" ON public.assessments
    FOR ALL TO authenticated 
    USING (
        public.has_role(auth.uid(), 'admin') OR 
        public.has_role(auth.uid(), 'teacher')
    );

-- 3. Handle orphaned scores
-- Create a default assessment to hold existing scores so they are not lost/invalid
DO $$
DECLARE
    default_assessment_id UUID;
BEGIN
    INSERT INTO public.assessments (title, type)
    VALUES ('Restored Assessment (Legacy)', 'migration')
    RETURNING id INTO default_assessment_id;

    -- Update orphaned scores to point to this new assessment
    -- We update ALL scores that have an assessment_id (which refer to the deleted table)
    -- to the new valid ID.
    UPDATE public.student_scores 
    SET assessment_id = default_assessment_id 
    WHERE assessment_id IS NOT NULL;
END $$;

-- 4. Restore Foreign Key
-- Ensure validation passes now
ALTER TABLE public.student_scores 
DROP CONSTRAINT IF EXISTS student_scores_assessment_id_fkey;

ALTER TABLE public.student_scores
ADD CONSTRAINT student_scores_assessment_id_fkey
FOREIGN KEY (assessment_id) REFERENCES public.assessments(id) ON DELETE CASCADE;

-- 5. Restore Unique Constraint
ALTER TABLE public.student_scores DROP CONSTRAINT IF EXISTS student_scores_student_id_sub_topic_id_assessment_id_key;

ALTER TABLE public.student_scores 
ADD CONSTRAINT student_scores_student_id_sub_topic_id_assessment_id_key 
UNIQUE (student_id, sub_topic_id, assessment_id);

-- 6. Reload Schema Cache
NOTIFY pgrst, 'reload schema';
