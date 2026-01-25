-- Update upsert_student_scores function to handle assessment_id and correct conflict target

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
      assessment_id,
      score,
      updated_by
    ) VALUES (
      score_record->>'student_id',
      score_record->>'sub_topic_id',
      (score_record->>'assessment_id')::UUID, -- Cast to UUID, might be null
      (score_record->>'score')::INTEGER,
      p_updated_by
    )
    ON CONFLICT (student_id, sub_topic_id, assessment_id) 
    DO UPDATE SET
      score = EXCLUDED.score,
      updated_by = EXCLUDED.updated_by,
      updated_at = now();
    
    rows_affected := rows_affected + 1;
  END LOOP;
  
  RETURN rows_affected;
END;
$$ LANGUAGE plpgsql;
