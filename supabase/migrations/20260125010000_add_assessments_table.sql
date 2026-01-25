CREATE TABLE IF NOT EXISTS public.assessments (
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

-- Policies for assessments (Drop first to be idempotent)
DROP POLICY IF EXISTS "Public read access for assessments" ON public.assessments;
CREATE POLICY "Public read access for assessments" ON public.assessments
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins and Teachers can manage assessments" ON public.assessments;
CREATE POLICY "Admins and Teachers can manage assessments" ON public.assessments
    FOR ALL TO authenticated 
    USING (
        public.has_role(auth.uid(), 'admin') OR 
        public.has_role(auth.uid(), 'teacher')
    );

-- Modify student_scores to link to assessments
-- Add column if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_scores' AND column_name = 'assessment_id') THEN
        ALTER TABLE public.student_scores ADD COLUMN assessment_id UUID REFERENCES public.assessments(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Drop old constraints safely
ALTER TABLE public.student_scores DROP CONSTRAINT IF EXISTS student_scores_student_id_sub_topic_id_key;

-- Add new constraint safely
ALTER TABLE public.student_scores DROP CONSTRAINT IF EXISTS student_scores_student_id_sub_topic_id_assessment_id_key;
ALTER TABLE public.student_scores 
ADD CONSTRAINT student_scores_student_id_sub_topic_id_assessment_id_key 
UNIQUE (student_id, sub_topic_id, assessment_id);

-- Add index safely
DROP INDEX IF EXISTS idx_student_scores_assessment_id;
CREATE INDEX idx_student_scores_assessment_id ON public.student_scores(assessment_id);
