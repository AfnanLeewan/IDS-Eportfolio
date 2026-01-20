-- ============ CLASS SUBJECTS JUNCTION TABLE ===========
-- Migration: 20260120170736_class_subjects.sql
-- Purpose: Allow many-to-many relationship between classes and subjects
-- Each class can have multiple subjects, and subjects can be shared across classes

-- Create the junction table
CREATE TABLE IF NOT EXISTS public.class_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id TEXT NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(class_id, subject_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_class_subjects_class ON public.class_subjects(class_id);
CREATE INDEX IF NOT EXISTS idx_class_subjects_subject ON public.class_subjects(subject_id);
CREATE INDEX IF NOT EXISTS idx_class_subjects_active ON public.class_subjects(is_active);

-- Add updated_at trigger
CREATE TRIGGER update_class_subjects_updated_at
  BEFORE UPDATE ON public.class_subjects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============ ROW LEVEL SECURITY ===========

ALTER TABLE public.class_subjects ENABLE ROW LEVEL SECURITY;

-- Everyone can view class subjects
CREATE POLICY "Anyone can view class subjects"
  ON public.class_subjects FOR SELECT
  TO authenticated
  USING (true);

-- Teachers and admins can manage class subjects
CREATE POLICY "Teachers and admins can insert class subjects"
  ON public.class_subjects FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'teacher')
  );

CREATE POLICY "Teachers and admins can update class subjects"
  ON public.class_subjects FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'teacher')
  );

CREATE POLICY "Teachers and admins can delete class subjects"
  ON public.class_subjects FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'teacher')
  );

-- ============ HELPER FUNCTIONS ===========

-- Function to get subjects for a specific class
CREATE OR REPLACE FUNCTION public.get_class_subjects(p_class_id TEXT)
RETURNS TABLE (
  subject_id TEXT,
  subject_name TEXT,
  subject_code TEXT,
  sub_topic_count BIGINT,
  total_max_score BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as subject_id,
    s.name as subject_name,
    s.code as subject_code,
    COUNT(DISTINCT st.id) as sub_topic_count,
    COALESCE(SUM(st.max_score), 0) as total_max_score
  FROM public.subjects s
  INNER JOIN public.class_subjects cs ON cs.subject_id = s.id
  LEFT JOIN public.sub_topics st ON st.subject_id = s.id
  WHERE cs.class_id = p_class_id 
    AND cs.is_active = true
  GROUP BY s.id, s.name, s.code
  ORDER BY cs.display_order, s.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to assign subject to class
CREATE OR REPLACE FUNCTION public.assign_subject_to_class(
  p_class_id TEXT,
  p_subject_id TEXT
)
RETURNS public.class_subjects AS $$
DECLARE
  v_result public.class_subjects;
BEGIN
  INSERT INTO public.class_subjects (class_id, subject_id, created_by)
  VALUES (p_class_id, p_subject_id, auth.uid())
  ON CONFLICT (class_id, subject_id) 
  DO UPDATE SET is_active = true, updated_at = now()
  RETURNING * INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============ SEED DEFAULT CLASS SUBJECTS ===========
-- Assign all existing subjects to all existing classes as a starting point

INSERT INTO public.class_subjects (class_id, subject_id)
SELECT c.id, s.id
FROM public.classes c
CROSS JOIN public.subjects s
WHERE s.program_id = 'pre-a-level'
ON CONFLICT (class_id, subject_id) DO NOTHING;

-- Add comment
COMMENT ON TABLE public.class_subjects IS 'Junction table for many-to-many relationship between classes and subjects';
