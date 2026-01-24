-- =====================================================
-- HIERARCHICAL DATA STRUCTURE REFACTORING
-- Migration: 20260124135300_hierarchical_data_structure.sql
-- Description: Restructure to: AcademicYear -> Programs -> Subjects -> Topics
--              and AcademicYear -> Classes, with Program-Class assignments
-- =====================================================

-- ============ DROP EXISTING CONSTRAINTS ============

-- Drop existing foreign keys that will be restructured
ALTER TABLE public.subjects DROP CONSTRAINT IF EXISTS subjects_program_id_fkey;
ALTER TABLE public.classes DROP CONSTRAINT IF EXISTS classes_program_id_fkey;

-- ============ UPDATE EXAM_PROGRAMS TABLE ============

-- Add academic_year_id to link programs to specific years
ALTER TABLE public.exam_programs 
  ADD COLUMN IF NOT EXISTS academic_year_id TEXT REFERENCES public.academic_years(id) ON DELETE CASCADE;

-- Update existing programs to link to current academic year
UPDATE public.exam_programs 
SET academic_year_id = 'ay-2568' 
WHERE academic_year_id IS NULL;

-- Make academic_year_id required for future records
ALTER TABLE public.exam_programs 
  ALTER COLUMN academic_year_id SET NOT NULL;

-- Add index for year-based program queries
CREATE INDEX IF NOT EXISTS idx_programs_academic_year 
  ON public.exam_programs(academic_year_id);

-- ============ REMOVE PROGRAM_ID FROM CLASSES ============

-- Classes no longer directly belong to programs
-- Instead, they belong to academic years and can be assigned to multiple programs
ALTER TABLE public.classes DROP COLUMN IF EXISTS program_id CASCADE;

-- Add academic_year_id to classes
ALTER TABLE public.classes 
  ADD COLUMN IF NOT EXISTS academic_year_id TEXT REFERENCES public.academic_years(id) ON DELETE CASCADE;

-- Update existing classes to link to current academic year
UPDATE public.classes 
SET academic_year_id = 'ay-2568' 
WHERE academic_year_id IS NULL;

-- Make academic_year_id required for future classes
ALTER TABLE public.classes 
  ALTER COLUMN academic_year_id SET NOT NULL;

-- Add index
CREATE INDEX IF NOT EXISTS idx_classes_academic_year_id 
  ON public.classes(academic_year_id);

-- ============ CREATE PROGRAM-CLASS ASSIGNMENT TABLE ============

-- Junction table for many-to-many relationship between programs and classes
CREATE TABLE IF NOT EXISTS public.program_classes (
  id TEXT PRIMARY KEY DEFAULT 'pc-' || gen_random_uuid()::text,
  program_id TEXT NOT NULL REFERENCES public.exam_programs(id) ON DELETE CASCADE,
  class_id TEXT NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(program_id, class_id)
);

-- Indexes for program-class assignments
CREATE INDEX IF NOT EXISTS idx_program_classes_program 
  ON public.program_classes(program_id);
CREATE INDEX IF NOT EXISTS idx_program_classes_class 
  ON public.program_classes(class_id);
CREATE INDEX IF NOT EXISTS idx_program_classes_active 
  ON public.program_classes(is_active) WHERE is_active = true;

-- ============ UPDATE SUBJECTS TABLE ============

-- Subjects already have program_id, just ensure proper cascade
ALTER TABLE public.subjects 
  ADD CONSTRAINT subjects_program_id_fkey 
  FOREIGN KEY (program_id) REFERENCES public.exam_programs(id) ON DELETE CASCADE;

-- ============ RENAME SUB_TOPICS TO TOPICS ============

-- The table is currently called sub_topics, keep it but add clarity
COMMENT ON TABLE public.sub_topics IS 'Topics within subjects (formerly sub-topics). Each topic has a max score for assessments.';

-- Add program context for easier querying
CREATE OR REPLACE VIEW public.v_topics_with_program AS
SELECT 
  st.*,
  s.program_id,
  s.name as subject_name,
  s.code as subject_code,
  ep.name as program_name,
  ep.academic_year_id
FROM public.sub_topics st
JOIN public.subjects s ON s.id = st.subject_id
JOIN public.exam_programs ep ON ep.id = s.program_id;

-- ============ HELPER FUNCTIONS ============

-- Function to assign a class to a program
CREATE OR REPLACE FUNCTION public.assign_class_to_program(
  p_program_id TEXT,
  p_class_id TEXT,
  p_assigned_by UUID DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
  v_program_year TEXT;
  v_class_year TEXT;
  v_assignment_id TEXT;
BEGIN
  -- Verify program and class belong to same academic year
  SELECT academic_year_id INTO v_program_year 
  FROM public.exam_programs 
  WHERE id = p_program_id;
  
  SELECT academic_year_id INTO v_class_year 
  FROM public.classes 
  WHERE id = p_class_id;
  
  IF v_program_year != v_class_year THEN
    RAISE EXCEPTION 'Program and class must belong to the same academic year';
  END IF;
  
  -- Create assignment
  INSERT INTO public.program_classes (program_id, class_id, assigned_by)
  VALUES (p_program_id, p_class_id, p_assigned_by)
  ON CONFLICT (program_id, class_id) 
  DO UPDATE SET 
    is_active = true,
    updated_at = now(),
    assigned_by = COALESCE(EXCLUDED.assigned_by, program_classes.assigned_by)
  RETURNING id INTO v_assignment_id;
  
  RETURN v_assignment_id;
END;
$$ LANGUAGE plpgsql;

-- Function to remove class from program
CREATE OR REPLACE FUNCTION public.remove_class_from_program(
  p_program_id TEXT,
  p_class_id TEXT
)
RETURNS void AS $$
BEGIN
  UPDATE public.program_classes 
  SET is_active = false, updated_at = now()
  WHERE program_id = p_program_id AND class_id = p_class_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get all programs for a class
CREATE OR REPLACE FUNCTION public.get_class_programs(p_class_id TEXT)
RETURNS TABLE (
  program_id TEXT,
  program_name TEXT,
  program_description TEXT,
  assigned_at TIMESTAMPTZ,
  is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ep.id,
    ep.name,
    ep.description,
    pc.assigned_at,
    pc.is_active
  FROM public.program_classes pc
  JOIN public.exam_programs ep ON ep.id = pc.program_id
  WHERE pc.class_id = p_class_id AND pc.is_active = true
  ORDER BY pc.assigned_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get all classes for a program
CREATE OR REPLACE FUNCTION public.get_program_classes(p_program_id TEXT)
RETURNS TABLE (
  class_id TEXT,
  class_name TEXT,
  student_count BIGINT,
  assigned_at TIMESTAMPTZ,
  is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    COUNT(s.id) as student_count,
    pc.assigned_at,
    pc.is_active
  FROM public.program_classes pc
  JOIN public.classes c ON c.id = pc.class_id
  LEFT JOIN public.students s ON s.class_id = c.id AND s.is_active = true
  WHERE pc.program_id = p_program_id AND pc.is_active = true
  GROUP BY c.id, c.name, pc.assigned_at, pc.is_active
  ORDER BY c.name;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get all students in a program (via class assignments)
CREATE OR REPLACE FUNCTION public.get_program_students(p_program_id TEXT)
RETURNS TABLE (
  student_id TEXT,
  student_name TEXT,
  class_id TEXT,
  class_name TEXT,
  email TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    s.id,
    s.name,
    s.class_id,
    c.name,
    s.email
  FROM public.students s
  JOIN public.classes c ON c.id = s.class_id
  JOIN public.program_classes pc ON pc.class_id = c.id
  WHERE pc.program_id = p_program_id 
    AND pc.is_active = true 
    AND s.is_active = true
  ORDER BY c.name, s.name;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get programs for an academic year
CREATE OR REPLACE FUNCTION public.get_year_programs(p_academic_year_id TEXT)
RETURNS TABLE (
  program_id TEXT,
  program_name TEXT,
  program_description TEXT,
  subject_count BIGINT,
  class_count BIGINT,
  is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ep.id,
    ep.name,
    ep.description,
    COUNT(DISTINCT s.id) as subject_count,
    COUNT(DISTINCT pc.class_id) as class_count,
    ep.is_active
  FROM public.exam_programs ep
  LEFT JOIN public.subjects s ON s.program_id = ep.id
  LEFT JOIN public.program_classes pc ON pc.program_id = ep.id AND pc.is_active = true
  WHERE ep.academic_year_id = p_academic_year_id
  GROUP BY ep.id, ep.name, ep.description, ep.is_active
  ORDER BY ep.name;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get classes for an academic year
CREATE OR REPLACE FUNCTION public.get_year_classes(p_academic_year_id TEXT)
RETURNS TABLE (
  class_id TEXT,
  class_name TEXT,
  student_count BIGINT,
  program_count BIGINT,
  is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    COUNT(DISTINCT s.id) as student_count,
    COUNT(DISTINCT pc.program_id) as program_count,
    c.is_active
  FROM public.classes c
  LEFT JOIN public.students s ON s.class_id = c.id AND s.is_active = true
  LEFT JOIN public.program_classes pc ON pc.class_id = c.id AND pc.is_active = true
  WHERE c.academic_year_id = p_academic_year_id
  GROUP BY c.id, c.name, c.is_active
  ORDER BY c.name;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============ ROW LEVEL SECURITY ============

ALTER TABLE public.program_classes ENABLE ROW LEVEL SECURITY;

-- Anyone can view program-class assignments
CREATE POLICY "Anyone can view program-class assignments"
  ON public.program_classes FOR SELECT
  TO authenticated
  USING (true);

-- Teachers and admins can manage assignments
CREATE POLICY "Teachers and admins can manage program-class assignments"
  ON public.program_classes FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'teacher')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'teacher')
  );

-- ============ TRIGGERS ============

CREATE TRIGGER update_program_classes_updated_at
  BEFORE UPDATE ON public.program_classes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ GRANT PERMISSIONS ============

GRANT ALL ON public.program_classes TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_class_to_program TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_class_from_program TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_class_programs TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_program_classes TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_program_students TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_year_programs TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_year_classes TO authenticated;

-- ============ COMMENTS ============

COMMENT ON TABLE public.program_classes IS 'Many-to-many relationship between programs and classes. Classes can be assigned to multiple programs.';
COMMENT ON FUNCTION public.assign_class_to_program IS 'Assign a class to a program (must be same academic year)';
COMMENT ON FUNCTION public.remove_class_from_program IS 'Remove a class from a program (soft delete)';
COMMENT ON FUNCTION public.get_class_programs IS 'Get all programs assigned to a class';
COMMENT ON FUNCTION public.get_program_classes IS 'Get all classes assigned to a program';
COMMENT ON FUNCTION public.get_program_students IS 'Get all students in a program via class assignments';
COMMENT ON FUNCTION public.get_year_programs IS 'Get all programs for an academic year';
COMMENT ON FUNCTION public.get_year_classes IS 'Get all classes for an academic year';
