-- Create teacher assignments table to link teachers to subjects
CREATE TABLE IF NOT EXISTS public.teacher_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id TEXT NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(teacher_id, subject_id)
);

-- Enable RLS
ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;

-- Policies for teacher_assignments
CREATE POLICY "Admins can manage assignments" ON public.teacher_assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Teachers can view their own assignments" ON public.teacher_assignments
    FOR SELECT USING (
        teacher_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Update student_scores policies to enforce assignment restrictions
-- First drop existing policies that allow broad teacher access
DROP POLICY IF EXISTS "Teachers and admins can insert scores" ON public.student_scores;
DROP POLICY IF EXISTS "Teachers and admins can update scores" ON public.student_scores;
DROP POLICY IF EXISTS "Teachers and admins can delete scores" ON public.student_scores;

-- Create new restrictive policies
-- INSERT
CREATE POLICY "Admins and Assigned Teachers can insert scores" ON public.student_scores
FOR INSERT WITH CHECK (
    -- Admin check
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR
    -- Assigned Teacher check
    (
        EXISTS (
            SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'teacher'
        )
        AND
        EXISTS (
            SELECT 1 
            FROM public.sub_topics st
            JOIN public.teacher_assignments ta ON ta.subject_id = st.subject_id
            WHERE st.id = sub_topic_id -- matches the new row's sub_topic_id
            AND ta.teacher_id = auth.uid()
        )
    )
);

-- UPDATE
CREATE POLICY "Admins and Assigned Teachers can update scores" ON public.student_scores
FOR UPDATE USING (
    -- Admin
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    OR
    -- Teacher
    (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'teacher')
        AND
        EXISTS (
            SELECT 1 
            FROM public.sub_topics st
            JOIN public.teacher_assignments ta ON ta.subject_id = st.subject_id
            WHERE st.id = sub_topic_id 
            AND ta.teacher_id = auth.uid()
        )
    )
);

-- DELETE
CREATE POLICY "Admins and Assigned Teachers can delete scores" ON public.student_scores
FOR DELETE USING (
    -- Admin
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    OR
    -- Teacher
    (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'teacher')
        AND
        EXISTS (
            SELECT 1 
            FROM public.sub_topics st
            JOIN public.teacher_assignments ta ON ta.subject_id = st.subject_id
            WHERE st.id = sub_topic_id 
            AND ta.teacher_id = auth.uid()
        )
    )
);
