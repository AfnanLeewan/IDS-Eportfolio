-- =====================================================
-- COMPLETE DATABASE SCHEMA FOR IDS E-Portfolio system PLATFORM
-- Migration: 20260120084500_complete_schema.sql
-- =====================================================

-- ============ EXAM PROGRAMS & CURRICULUM ============

-- Exam programs table (Pre-A-Level, Pre-SCIUS, etc.)
CREATE TABLE IF NOT EXISTS public.exam_programs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  academic_year INTEGER DEFAULT 2568,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Subjects table
CREATE TABLE IF NOT EXISTS public.subjects (
  id TEXT PRIMARY KEY,
  program_id TEXT NOT NULL REFERENCES public.exam_programs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Sub-topics table
CREATE TABLE IF NOT EXISTS public.sub_topics (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  max_score INTEGER NOT NULL CHECK (max_score > 0),
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============ CLASSES & STUDENTS ============

-- Classes table
CREATE TABLE IF NOT EXISTS public.classes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  program_id TEXT NOT NULL REFERENCES public.exam_programs(id),
  academic_year INTEGER DEFAULT 2568,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Students table
CREATE TABLE IF NOT EXISTS public.students (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  class_id TEXT NOT NULL REFERENCES public.classes(id),
  email TEXT,
  phone TEXT,
  parent_email TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- ============ SCORES & ANALYTICS ============

-- Student scores table
CREATE TABLE IF NOT EXISTS public.student_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  sub_topic_id TEXT NOT NULL REFERENCES public.sub_topics(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0),
  exam_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  version INTEGER DEFAULT 1,
  UNIQUE(student_id, sub_topic_id)
);

-- Score history for audit trail
CREATE TABLE IF NOT EXISTS public.score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_score_id UUID REFERENCES public.student_scores(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,
  sub_topic_id TEXT NOT NULL,
  old_score INTEGER,
  new_score INTEGER,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT now(),
  change_reason TEXT,
  ip_address INET
);

-- ============ INDEXES FOR PERFORMANCE ============

-- Student indexes
CREATE INDEX IF NOT EXISTS idx_students_class ON public.students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_user ON public.students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_active ON public.students(is_active) WHERE is_active = true;

-- Score indexes
CREATE INDEX IF NOT EXISTS idx_scores_student ON public.student_scores(student_id);
CREATE INDEX IF NOT EXISTS idx_scores_subtopic ON public.student_scores(sub_topic_id);
CREATE INDEX IF NOT EXISTS idx_scores_composite ON public.student_scores(student_id, sub_topic_id);
CREATE INDEX IF NOT EXISTS idx_scores_created ON public.student_scores(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scores_updated ON public.student_scores(updated_at DESC);

-- Subject indexes
CREATE INDEX IF NOT EXISTS idx_subjects_program ON public.subjects(program_id);
CREATE INDEX IF NOT EXISTS idx_subtopics_subject ON public.sub_topics(subject_id);

-- Class indexes
CREATE INDEX IF NOT EXISTS idx_classes_program ON public.classes(program_id);
CREATE INDEX IF NOT EXISTS idx_classes_active ON public.classes(is_active) WHERE is_active = true;

-- ============ TRIGGERS ============

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all tables
CREATE TRIGGER update_exam_programs_updated_at
    BEFORE UPDATE ON public.exam_programs
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subjects_updated_at
    BEFORE UPDATE ON public.subjects
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sub_topics_updated_at
    BEFORE UPDATE ON public.sub_topics
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_classes_updated_at
    BEFORE UPDATE ON public.classes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_students_updated_at
    BEFORE UPDATE ON public.students
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_student_scores_updated_at
    BEFORE UPDATE ON public.student_scores
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ AUDIT TRIGGER FOR SCORE CHANGES ============

CREATE OR REPLACE FUNCTION public.audit_score_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.score != NEW.score) THEN
    INSERT INTO public.score_history (
      student_score_id,
      student_id,
      sub_topic_id,
      old_score,
      new_score,
      changed_by,
      changed_at
    ) VALUES (
      NEW.id,
      NEW.student_id,
      NEW.sub_topic_id,
      OLD.score,
      NEW.score,
      NEW.updated_by,
      now()
    );
    
    -- Increment version
    NEW.version = OLD.version + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_student_scores
    BEFORE UPDATE ON public.student_scores
    FOR EACH ROW EXECUTE FUNCTION public.audit_score_changes();

-- ============ ROW LEVEL SECURITY ============

ALTER TABLE public.exam_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.score_history ENABLE ROW LEVEL SECURITY;

-- ============ RLS POLICIES ============

-- Exam Programs (Everyone can read, only admins can modify)
CREATE POLICY "Anyone can view exam programs"
  ON public.exam_programs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage exam programs"
  ON public.exam_programs FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Subjects (Everyone can read, admins can modify)
CREATE POLICY "Anyone can view subjects"
  ON public.subjects FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage subjects"
  ON public.subjects FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Sub-topics (Everyone can read, admins can modify)
CREATE POLICY "Anyone can view sub-topics"
  ON public.sub_topics FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage sub-topics"
  ON public.sub_topics FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Classes (Everyone can read, teachers and admins can manage)
CREATE POLICY "Anyone can view classes"
  ON public.classes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Teachers and admins can manage classes"
  ON public.classes FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'teacher')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'teacher')
  );

-- Students (Teachers can view/manage, students can view own record)
CREATE POLICY "Teachers and admins can view all students"
  ON public.students FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'teacher') OR
    user_id = auth.uid()
  );

CREATE POLICY "Teachers and admins can insert students"
  ON public.students FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'teacher')
  );

CREATE POLICY "Teachers and admins can update students"
  ON public.students FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'teacher')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'teacher')
  );

CREATE POLICY "Teachers and admins can delete students"
  ON public.students FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'teacher')
  );

-- Student Scores (Teachers can manage, students can view own)
CREATE POLICY "Teachers and admins can view all scores"
  ON public.student_scores FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'teacher') OR
    EXISTS (
      SELECT 1 FROM public.students
      WHERE students.id = student_scores.student_id
      AND students.user_id = auth.uid()
    )
  );

CREATE POLICY "Teachers and admins can insert scores"
  ON public.student_scores FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'teacher')
  );

CREATE POLICY "Teachers and admins can update scores"
  ON public.student_scores FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'teacher')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'teacher')
  );

CREATE POLICY "Teachers and admins can delete scores"
  ON public.student_scores FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'teacher')
  );

-- Score History (Read-only for teachers/admins, students can view own)
CREATE POLICY "Teachers can view score history"
  ON public.score_history FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'teacher') OR
    EXISTS (
      SELECT 1 FROM public.students
      WHERE students.id = score_history.student_id
      AND students.user_id = auth.uid()
    )
  );

-- ============ DATABASE FUNCTIONS ============

-- Function to get student's total score
CREATE OR REPLACE FUNCTION public.get_student_total_score(p_student_id TEXT)
RETURNS TABLE (
  total_score NUMERIC,
  total_max_score NUMERIC,
  percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(ss.score), 0)::NUMERIC AS total_score,
    COALESCE(SUM(st.max_score), 0)::NUMERIC AS total_max_score,
    CASE 
      WHEN SUM(st.max_score) > 0 THEN (SUM(ss.score)::NUMERIC / SUM(st.max_score) * 100)
      ELSE 0
    END AS percentage
  FROM public.student_scores ss
  JOIN public.sub_topics st ON st.id = ss.sub_topic_id
  WHERE ss.student_id = p_student_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get subject score for a student
CREATE OR REPLACE FUNCTION public.get_subject_score(
  p_student_id TEXT,
  p_subject_id TEXT
)
RETURNS TABLE (
  score NUMERIC,
  max_score NUMERIC,
  percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(ss.score), 0)::NUMERIC AS score,
    COALESCE(SUM(st.max_score), 0)::NUMERIC AS max_score,
    CASE 
      WHEN SUM(st.max_score) > 0 THEN (SUM(ss.score)::NUMERIC / SUM(st.max_score) * 100)
      ELSE 0
    END AS percentage
  FROM public.sub_topics st
  LEFT JOIN public.student_scores ss ON ss.sub_topic_id = st.id AND ss.student_id = p_student_id
  WHERE st.subject_id = p_subject_id
  GROUP BY st.subject_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get class average
CREATE OR REPLACE FUNCTION public.get_class_average(p_class_id TEXT)
RETURNS NUMERIC AS $$
DECLARE
  avg_percentage NUMERIC;
BEGIN
  SELECT AVG(percentage) INTO avg_percentage
  FROM (
    SELECT 
      (SUM(ss.score)::NUMERIC / NULLIF(SUM(st.max_score), 0) * 100) AS percentage
    FROM public.students s
    JOIN public.student_scores ss ON ss.student_id = s.id
    JOIN public.sub_topics st ON st.id = ss.sub_topic_id
    WHERE s.class_id = p_class_id
    GROUP BY s.id
  ) AS student_percentages;
  
  RETURN COALESCE(avg_percentage, 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get class statistics
CREATE OR REPLACE FUNCTION public.get_class_statistics(p_class_id TEXT)
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
    LEFT JOIN public.student_scores ss ON ss.student_id = s.id
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

-- Function to get top performers in a class
CREATE OR REPLACE FUNCTION public.get_top_performers(
  p_class_id TEXT,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  student_id TEXT,
  student_name TEXT,
  total_percentage NUMERIC,
  rank BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    (SUM(ss.score)::NUMERIC / NULLIF(SUM(st.max_score), 0) * 100) AS total_percentage,
    RANK() OVER (ORDER BY SUM(ss.score)::NUMERIC / NULLIF(SUM(st.max_score), 1) DESC) AS rank
  FROM public.students s
  JOIN public.student_scores ss ON ss.student_id = s.id
  JOIN public.sub_topics st ON st.id = ss.sub_topic_id
  WHERE s.class_id = p_class_id AND s.is_active = true
  GROUP BY s.id, s.name
  ORDER BY total_percentage DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to bulk upsert scores
CREATE OR REPLACE FUNCTION public.upsert_student_scores(
  p_scores JSONB,
  p_updated_by UUID
)
RETURNS INTEGER AS $$
DECLARE
  score_record JSONB;
  rows_affected INTEGER := 0;
BEGIN
  FOR score_record IN SELECT * FROM jsonb_array_elements(p_scores)
  LOOP
    INSERT INTO public.student_scores (
      student_id,
      sub_topic_id,
      score,
      updated_by
    ) VALUES (
      score_record->>'student_id',
      score_record->>'sub_topic_id',
      (score_record->>'score')::INTEGER,
      p_updated_by
    )
    ON CONFLICT (student_id, sub_topic_id) 
    DO UPDATE SET
      score = EXCLUDED.score,
      updated_by = EXCLUDED.updated_by,
      updated_at = now();
    
    rows_affected := rows_affected + 1;
  END LOOP;
  
  RETURN rows_affected;
END;
$$ LANGUAGE plpgsql;

-- ============ MATERIALIZED VIEWS ============

-- Materialized view for class statistics (refresh periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_class_subject_stats AS
SELECT 
  c.id AS class_id,
  c.name AS class_name,
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
LEFT JOIN public.student_scores ss ON ss.student_id = s.id
LEFT JOIN public.sub_topics st ON st.id = ss.sub_topic_id AND st.subject_id = sub.id
WHERE c.is_active = true
GROUP BY c.id, c.name, sub.id, sub.name, sub.code;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_class_subject_stats 
  ON public.mv_class_subject_stats(class_id, subject_id);

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION public.refresh_statistics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_class_subject_stats;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Comment on tables
COMMENT ON TABLE public.exam_programs IS 'Exam programs like Pre-A-Level, Pre-SCIUS';
COMMENT ON TABLE public.subjects IS 'Subjects within exam programs';
COMMENT ON TABLE public.sub_topics IS 'Sub-topics within subjects with max scores';
COMMENT ON TABLE public.classes IS 'Student classes/sections';
COMMENT ON TABLE public.students IS 'Student records linked to user accounts';
COMMENT ON TABLE public.student_scores IS 'Student scores for each sub-topic';
COMMENT ON TABLE public.score_history IS 'Audit trail for score changes';
