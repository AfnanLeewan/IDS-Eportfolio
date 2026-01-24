-- =====================================================
-- ACADEMIC YEAR MANAGEMENT SYSTEM
-- Migration: 20260122141200_academic_year_management.sql
-- Description: Adds comprehensive year-based data storage and management
-- =====================================================

-- ============ ACADEMIC YEARS TABLE ============

-- Central table for managing academic years
CREATE TABLE IF NOT EXISTS public.academic_years (
  id TEXT PRIMARY KEY,
  year_number INTEGER NOT NULL UNIQUE, -- e.g., 2568, 2569
  display_name TEXT NOT NULL, -- e.g., "2568 (2025-2026)"
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT false,
  is_current BOOLEAN DEFAULT false, -- Only one year can be current
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (end_date > start_date)
);

-- Ensure only one academic year is marked as current
CREATE UNIQUE INDEX idx_academic_years_current 
  ON public.academic_years(is_current) 
  WHERE is_current = true;

-- ============ ADD ACADEMIC YEAR TO TABLES ============

-- Add academic_year to student_scores
ALTER TABLE public.student_scores 
  ADD COLUMN IF NOT EXISTS academic_year INTEGER;

-- Update existing scores to use current academic year
UPDATE public.student_scores 
SET academic_year = 2568 
WHERE academic_year IS NULL;

-- Make academic_year required for future records
ALTER TABLE public.student_scores 
  ALTER COLUMN academic_year SET DEFAULT 2568;

-- Add academic_year to students table (if moving between years)
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS joined_year INTEGER DEFAULT 2568,
  ADD COLUMN IF NOT EXISTS academic_year INTEGER DEFAULT 2568;

-- ============ INDEXES FOR YEAR FILTERING ============

CREATE INDEX IF NOT EXISTS idx_scores_academic_year 
  ON public.student_scores(academic_year);

CREATE INDEX IF NOT EXISTS idx_students_academic_year 
  ON public.students(academic_year);

CREATE INDEX IF NOT EXISTS idx_classes_academic_year 
  ON public.classes(academic_year);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_scores_student_year 
  ON public.student_scores(student_id, academic_year);

CREATE INDEX IF NOT EXISTS idx_scores_year_updated 
  ON public.student_scores(academic_year, updated_at DESC);

-- ============ UPDATED TRIGGERS ============

CREATE TRIGGER update_academic_years_updated_at
    BEFORE UPDATE ON public.academic_years
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ FUNCTIONS FOR YEAR MANAGEMENT ============

-- Function to set current academic year
CREATE OR REPLACE FUNCTION public.set_current_academic_year(p_year_id TEXT)
RETURNS void AS $$
BEGIN
  -- Unset all current flags
  UPDATE public.academic_years SET is_current = false;
  
  -- Set the specified year as current
  UPDATE public.academic_years 
  SET is_current = true 
  WHERE id = p_year_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get current academic year
CREATE OR REPLACE FUNCTION public.get_current_academic_year()
RETURNS TABLE (
  id TEXT,
  year_number INTEGER,
  display_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT ay.id, ay.year_number, ay.display_name
  FROM public.academic_years ay
  WHERE ay.is_current = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to archive academic year
CREATE OR REPLACE FUNCTION public.archive_academic_year(p_year_id TEXT)
RETURNS void AS $$
BEGIN
  UPDATE public.academic_years 
  SET is_active = false, is_current = false
  WHERE id = p_year_id;
  
  -- Mark associated classes as inactive
  UPDATE public.classes 
  SET is_active = false
  WHERE id IN (
    SELECT c.id 
    FROM public.classes c
    JOIN public.academic_years ay ON c.academic_year = ay.year_number
    WHERE ay.id = p_year_id
  );
END;
$$ LANGUAGE plpgsql;

-- ============ YEAR-AWARE STATISTICS FUNCTIONS ============

-- Get class statistics for a specific year
CREATE OR REPLACE FUNCTION public.get_class_statistics_by_year(
  p_class_id TEXT,
  p_academic_year INTEGER
)
RETURNS TABLE (
  total_students BIGINT,
  avg_percentage NUMERIC,
  max_percentage NUMERIC,
  min_percentage NUMERIC,
  std_dev NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH student_percentages AS (
    SELECT 
      s.id,
      (SUM(ss.score)::NUMERIC / NULLIF(SUM(st.max_score), 0) * 100) AS percentage
    FROM public.students s
    LEFT JOIN public.student_scores ss ON ss.student_id = s.id AND ss.academic_year = p_academic_year
    LEFT JOIN public.sub_topics st ON st.id = ss.sub_topic_id
    WHERE s.class_id = p_class_id AND s.is_active = true
    GROUP BY s.id
  )
  SELECT 
    COUNT(*)::BIGINT,
    COALESCE(AVG(percentage), 0)::NUMERIC,
    COALESCE(MAX(percentage), 0)::NUMERIC,
    COALESCE(MIN(percentage), 0)::NUMERIC,
    COALESCE(STDDEV(percentage), 0)::NUMERIC
  FROM student_percentages;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get student scores for a specific year
CREATE OR REPLACE FUNCTION public.get_student_scores_by_year(
  p_student_id TEXT,
  p_academic_year INTEGER
)
RETURNS TABLE (
  subject_name TEXT,
  subject_code TEXT,
  score NUMERIC,
  max_score NUMERIC,
  percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sub.name AS subject_name,
    sub.code AS subject_code,
    COALESCE(SUM(ss.score), 0)::NUMERIC AS score,
    SUM(st.max_score)::NUMERIC AS max_score,
    CASE 
      WHEN SUM(st.max_score) > 0 THEN (SUM(ss.score)::NUMERIC / SUM(st.max_score) * 100)
      ELSE 0
    END AS percentage
  FROM public.subjects sub
  JOIN public.sub_topics st ON st.subject_id = sub.id
  LEFT JOIN public.student_scores ss ON ss.sub_topic_id = st.id 
    AND ss.student_id = p_student_id 
    AND ss.academic_year = p_academic_year
  GROUP BY sub.id, sub.name, sub.code
  ORDER BY sub.display_order;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get year-over-year comparison for a student
CREATE OR REPLACE FUNCTION public.get_student_year_comparison(p_student_id TEXT)
RETURNS TABLE (
  academic_year INTEGER,
  year_name TEXT,
  total_percentage NUMERIC,
  total_score NUMERIC,
  max_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ss.academic_year,
    ay.display_name AS year_name,
    (SUM(ss.score)::NUMERIC / NULLIF(SUM(st.max_score), 0) * 100) AS total_percentage,
    SUM(ss.score)::NUMERIC AS total_score,
    SUM(st.max_score)::NUMERIC AS max_score
  FROM public.student_scores ss
  JOIN public.sub_topics st ON st.id = ss.sub_topic_id
  LEFT JOIN public.academic_years ay ON ay.year_number = ss.academic_year
  WHERE ss.student_id = p_student_id
  GROUP BY ss.academic_year, ay.display_name
  ORDER BY ss.academic_year DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============ ROW LEVEL SECURITY ============

ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;

-- Anyone can view academic years
CREATE POLICY "Anyone can view academic years"
  ON public.academic_years FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can manage academic years
CREATE POLICY "Admins can manage academic years"
  ON public.academic_years FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ MATERIALIZED VIEW WITH YEAR ============

-- Drop and recreate materialized view with year support
DROP MATERIALIZED VIEW IF EXISTS public.mv_class_subject_stats;

CREATE MATERIALIZED VIEW public.mv_class_subject_stats AS
SELECT 
  c.id AS class_id,
  c.name AS class_name,
  c.academic_year,
  sub.id AS subject_id,
  sub.name AS subject_name,
  sub.code AS subject_code,
  COUNT(DISTINCT s.id) AS student_count,
  COALESCE(AVG((ss.score::NUMERIC / st.max_score) * 100), 0) AS avg_percentage,
  COALESCE(MAX((ss.score::NUMERIC / st.max_score) * 100), 0) AS max_percentage,
  COALESCE(MIN((ss.score::NUMERIC / st.max_score) * 100), 0) AS min_percentage,
  COALESCE(STDDEV((ss.score::NUMERIC / st.max_score) * 100), 0) AS std_dev
FROM public.classes c
CROSS JOIN public.subjects sub
LEFT JOIN public.students s ON s.class_id = c.id AND s.is_active = true
LEFT JOIN public.student_scores ss ON ss.student_id = s.id AND ss.academic_year = c.academic_year
LEFT JOIN public.sub_topics st ON st.id = ss.sub_topic_id AND st.subject_id = sub.id
WHERE c.is_active = true
GROUP BY c.id, c.name, c.academic_year, sub.id, sub.name, sub.code;

-- Recreate index on materialized view
CREATE UNIQUE INDEX idx_mv_class_subject_stats 
  ON public.mv_class_subject_stats(class_id, subject_id, academic_year);

-- ============ SEED DEFAULT ACADEMIC YEARS ============

INSERT INTO public.academic_years (id, year_number, display_name, start_date, end_date, is_active, is_current)
VALUES 
  ('ay-2567', 2567, '2567 (2024-2025)', '2024-05-01', '2025-04-30', true, false),
  ('ay-2568', 2568, '2568 (2025-2026)', '2025-05-01', '2026-04-30', true, true),
  ('ay-2569', 2569, '2569 (2026-2027)', '2026-05-01', '2027-04-30', true, false)
ON CONFLICT (year_number) DO NOTHING;

-- ============ COMMENTS ============

COMMENT ON TABLE public.academic_years IS 'Academic years for organizing data by year';
COMMENT ON FUNCTION public.set_current_academic_year IS 'Set a specific year as the current active year';
COMMENT ON FUNCTION public.get_current_academic_year IS 'Get the currently active academic year';
COMMENT ON FUNCTION public.archive_academic_year IS 'Archive an academic year and mark associated classes as inactive';
COMMENT ON FUNCTION public.get_class_statistics_by_year IS 'Get class statistics filtered by academic year';
COMMENT ON FUNCTION public.get_student_scores_by_year IS 'Get student scores for a specific academic year';
COMMENT ON FUNCTION public.get_student_year_comparison IS 'Compare student performance across multiple years';
