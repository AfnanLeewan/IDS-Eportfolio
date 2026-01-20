-- =====================================================
-- SEED DATA FOR IDS E-Portfolio system PLATFORM
-- Migration: 20260120084501_seed_data.sql
-- =====================================================

-- ============ INSERT EXAM PROGRAMS ============

INSERT INTO public.exam_programs (id, name, description, academic_year, is_active) VALUES
('pre-a-level', 'Pre-A-Level', 'Pre-A-Level Examination Program', 2568, true),
('pre-scius', 'Pre-SCIUS', 'Pre-SCIUS Examination Program', 2568, false)
ON CONFLICT (id) DO NOTHING;

-- ============ INSERT SUBJECTS FOR PRE-A-LEVEL ============

INSERT INTO public.subjects (id, program_id, name, code, display_order) VALUES
('physics', 'pre-a-level', 'Physics', 'PHY', 1),
('chemistry', 'pre-a-level', 'Chemistry', 'CHE', 2),
('biology', 'pre-a-level', 'Biology', 'BIO', 3),
('math', 'pre-a-level', 'Mathematics', 'MAT', 4),
('english', 'pre-a-level', 'English', 'ENG', 5),
('thai', 'pre-a-level', 'Thai Language', 'THA', 6),
('social', 'pre-a-level', 'Social Studies', 'SOC', 7)
ON CONFLICT (id) DO NOTHING;

-- ============ INSERT SUB-TOPICS ============

-- Physics Sub-topics
INSERT INTO public.sub_topics (id, subject_id, name, max_score, display_order) VALUES
('phy-mechanics', 'physics', 'Mechanics', 25, 1),
('phy-waves', 'physics', 'Waves & Optics', 20, 2),
('phy-electricity', 'physics', 'Electricity', 25, 3),
('phy-nuclear', 'physics', 'Nuclear Physics', 15, 4),
('phy-thermo', 'physics', 'Thermodynamics', 15, 5)
ON CONFLICT (id) DO NOTHING;

-- Chemistry Sub-topics
INSERT INTO public.sub_topics (id, subject_id, name, max_score, display_order) VALUES
('che-organic', 'chemistry', 'Organic Chemistry', 30, 1),
('che-inorganic', 'chemistry', 'Inorganic Chemistry', 25, 2),
('che-physical', 'chemistry', 'Physical Chemistry', 25, 3),
('che-analytical', 'chemistry', 'Analytical Chemistry', 20, 4)
ON CONFLICT (id) DO NOTHING;

-- Biology Sub-topics
INSERT INTO public.sub_topics (id, subject_id, name, max_score, display_order) VALUES
('bio-cell', 'biology', 'Cell Biology', 20, 1),
('bio-genetics', 'biology', 'Genetics', 25, 2),
('bio-ecology', 'biology', 'Ecology', 20, 3),
('bio-human', 'biology', 'Human Physiology', 20, 4),
('bio-evolution', 'biology', 'Evolution', 15, 5)
ON CONFLICT (id) DO NOTHING;

-- Mathematics Sub-topics
INSERT INTO public.sub_topics (id, subject_id, name, max_score, display_order) VALUES
('mat-algebra', 'math', 'Algebra', 25, 1),
('mat-calculus', 'math', 'Calculus', 30, 2),
('mat-statistics', 'math', 'Statistics', 20, 3),
('mat-geometry', 'math', 'Geometry', 25, 4)
ON CONFLICT (id) DO NOTHING;

-- English Sub-topics
INSERT INTO public.sub_topics (id, subject_id, name, max_score, display_order) VALUES
('eng-reading', 'english', 'Reading Comprehension', 30, 1),
('eng-writing', 'english', 'Writing', 30, 2),
('eng-grammar', 'english', 'Grammar & Usage', 20, 3),
('eng-vocabulary', 'english', 'Vocabulary', 20, 4)
ON CONFLICT (id) DO NOTHING;

-- Thai Language Sub-topics
INSERT INTO public.sub_topics (id, subject_id, name, max_score, display_order) VALUES
('tha-reading', 'thai', 'Reading', 30, 1),
('tha-writing', 'thai', 'Writing', 35, 2),
('tha-literature', 'thai', 'Literature', 35, 3)
ON CONFLICT (id) DO NOTHING;

-- Social Studies Sub-topics
INSERT INTO public.sub_topics (id, subject_id, name, max_score, display_order) VALUES
('soc-history', 'social', 'History', 25, 1),
('soc-geography', 'social', 'Geography', 25, 2),
('soc-civics', 'social', 'Civics', 25, 3),
('soc-economics', 'social', 'Economics', 25, 4)
ON CONFLICT (id) DO NOTHING;

-- ============ INSERT CLASSES ============

INSERT INTO public.classes (id, name, program_id, academic_year, is_active) VALUES
('m6-1', 'M.6/1', 'pre-a-level', 2568, true),
('m6-2', 'M.6/2', 'pre-a-level', 2568, true),
('m6-3', 'M.6/3', 'pre-a-level', 2568, true)
ON CONFLICT (id) DO NOTHING;

-- ============ INSERT SAMPLE STUDENTS ============

INSERT INTO public.students (id, name, class_id, email, is_active) VALUES
('STU0001', 'Somchai Prasert', 'm6-1', 'somchai@example.com', true),
('STU0002', 'Nattapong Wongsa', 'm6-1', 'nattapong@example.com', true),
('STU0003', 'Pimchanok Siriwat', 'm6-1', 'pimchanok@example.com', true),
('STU0004', 'Thanakorn Jitman', 'm6-1', 'thanakorn@example.com', true),
('STU0005', 'Kanokwan Thongchai', 'm6-1', 'kanokwan@example.com', true),
('STU0006', 'Worawit Suksawat', 'm6-2', 'worawit@example.com', true),
('STU0007', 'Rattana Phongsri', 'm6-2', 'rattana@example.com', true),
('STU0008', 'Pakorn Nitirat', 'm6-2', 'pakorn@example.com', true),
('STU0009', 'Siriporn Chaiyaphum', 'm6-2', 'siriporn@example.com', true),
('STU0010', 'Kritsada Bunmee', 'm6-2', 'kritsada@example.com', true),
('STU0011', 'Naree Wattana', 'm6-3', 'naree@example.com', true),
('STU0012', 'Surasak Kongphan', 'm6-3', 'surasak@example.com', true),
('STU0013', 'Manee Rattanapong', 'm6-3', 'manee@example.com', true),
('STU0014', 'Wichai Somboon', 'm6-3', 'wichai@example.com', true),
('STU0015', 'Duangjai Phonphat', 'm6-3', 'duangjai@example.com', true)
ON CONFLICT (id) DO NOTHING;

-- ============ GENERATE SAMPLE SCORES ============

-- This function generates realistic scores for demonstration
DO $$
DECLARE
  student_rec RECORD;
  subtopic_rec RECORD;
  random_score INTEGER;
  base_percentage NUMERIC;
  variation NUMERIC;
BEGIN
  -- Loop through all students
  FOR student_rec IN SELECT id FROM public.students LOOP
    -- Loop through all sub-topics
    FOR subtopic_rec IN SELECT id, max_score FROM public.sub_topics LOOP
      -- Generate realistic score (40-95% of max score with variation)
      base_percentage := 0.4 + (random() * 0.35); -- 40-75% base
      variation := (random() - 0.5) * 0.4; -- ±20% variation
      random_score := ROUND((base_percentage + variation) * subtopic_rec.max_score);
      
      -- Ensure score is within valid range
      random_score := GREATEST(0, LEAST(random_score, subtopic_rec.max_score));
      
      -- Insert score
      INSERT INTO public.student_scores (
        student_id,
        sub_topic_id,
        score,
        exam_date
      ) VALUES (
        student_rec.id,
        subtopic_rec.id,
        random_score,
        CURRENT_DATE - (random() * 30)::INTEGER -- Random date within last 30 days
      )
      ON CONFLICT (student_id, sub_topic_id) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- ============ REFRESH MATERIALIZED VIEWS ============

REFRESH MATERIALIZED VIEW public.mv_class_subject_stats;

-- ============ GRANT PERMISSIONS ============

-- Ensure authenticated users can access all data
GRANT SELECT ON public.exam_programs TO authenticated;
GRANT SELECT ON public.subjects TO authenticated;
GRANT SELECT ON public.sub_topics TO authenticated;
GRANT SELECT ON public.classes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_scores TO authenticated;
GRANT SELECT ON public.score_history TO authenticated;
GRANT SELECT ON public.mv_class_subject_stats TO authenticated;
