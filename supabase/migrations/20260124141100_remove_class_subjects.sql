-- =====================================================
-- REMOVE CLASS_SUBJECTS - Classes get subjects via programs
-- Migration: 20260124141100_remove_class_subjects.sql
-- Description: Remove manual class-subject assignment. 
--              Classes now get subjects automatically via program assignment
-- =====================================================

-- Drop the class_subjects table if it exists
-- Classes now access subjects through: Class → Program → Subjects
DROP TABLE IF EXISTS public.class_subjects CASCADE;

-- Drop old function signatures if they exist
DROP FUNCTION IF EXISTS public.get_class_subjects(TEXT);
DROP FUNCTION IF EXISTS public.get_class_subjects_with_topics(TEXT);

-- Add helper function to get subjects for a class via programs
CREATE FUNCTION public.get_class_subjects(p_class_id TEXT)
RETURNS TABLE (
  subject_id TEXT,
  subject_name TEXT,
  subject_code TEXT,
  program_id TEXT,
  program_name TEXT,
  display_order INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    s.id as subject_id,
    s.name as subject_name,
    s.code as subject_code,
    s.program_id,
    ep.name as program_name,
    s.display_order
  FROM public.subjects s
  JOIN public.exam_programs ep ON ep.id = s.program_id
  JOIN public.program_classes pc ON pc.program_id = ep.id
  WHERE pc.class_id = p_class_id 
    AND pc.is_active = true
  ORDER BY s.display_order;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get subjects with topics for a class via programs
CREATE FUNCTION public.get_class_subjects_with_topics(p_class_id TEXT)
RETURNS jsonb AS $$
BEGIN
  RETURN (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', s.id,
        'name', s.name,
        'code', s.code,
        'program_id', s.program_id,
        'program_name', ep.name,
        'display_order', s.display_order,
        'sub_topics', (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', st.id,
              'name', st.name,
              'max_score', st.max_score,
              'display_order', st.display_order
            )
            ORDER BY st.display_order
          )
          FROM public.sub_topics st
          WHERE st.subject_id = s.id
        )
      )
      ORDER BY s.display_order
    )
    FROM public.subjects s
    JOIN public.exam_programs ep ON ep.id = s.program_id
    JOIN public.program_classes pc ON pc.program_id = ep.id
    WHERE pc.class_id = p_class_id 
      AND pc.is_active = true
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_class_subjects TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_class_subjects_with_topics TO authenticated;

-- Comments
COMMENT ON FUNCTION public.get_class_subjects IS 'Get all subjects for a class via program assignments';
COMMENT ON FUNCTION public.get_class_subjects_with_topics IS 'Get all subjects with their topics for a class via program assignments';

-- Note: Now the flow is:
-- 1. Create Program with Subjects
-- 2. Assign Class to Program
-- 3. Class automatically has access to ALL subjects in the program
-- 4. No need for manual subject-to-class assignment
