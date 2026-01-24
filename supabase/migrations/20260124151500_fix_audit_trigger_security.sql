-- Fix audit_score_changes function to run with SECURITY DEFINER
-- This resolves the "new row violates row-level security policy for table score_history" error
-- by allowing the trigger to insert into score_history with owner privileges, bypassing RLS.

CREATE OR REPLACE FUNCTION public.audit_score_changes()
RETURNS TRIGGER 
SECURITY DEFINER -- Essential: Run as owner
SET search_path = public -- Essential: Secure search path
AS $$
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
      -- Prefer actual auth user, fallback to payload data
      COALESCE(auth.uid(), NEW.updated_by), 
      now()
    );
    
    -- Increment version
    NEW.version = OLD.version + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
