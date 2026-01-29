-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    related_link TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Students can view own notifications" 
    ON public.notifications FOR SELECT 
    TO authenticated
    USING (
        student_id IN (
            SELECT id FROM public.students WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Students can mark own notifications as read" 
    ON public.notifications FOR UPDATE
    TO authenticated
    USING (
        student_id IN (
            SELECT id FROM public.students WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        student_id IN (
            SELECT id FROM public.students WHERE user_id = auth.uid()
        )
    );

-- Trigger Function for Score Updates
CREATE OR REPLACE FUNCTION public.handle_score_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_sub_topic_name TEXT;
    v_subject_name TEXT;
BEGIN
    -- Only notify on score change
    IF (TG_OP = 'UPDATE' AND OLD.score IS NOT DISTINCT FROM NEW.score) THEN
        RETURN NEW;
    END IF;

    -- Get names
    SELECT st.name, s.name 
    INTO v_sub_topic_name, v_subject_name
    FROM public.sub_topics st
    JOIN public.subjects s ON s.id = st.subject_id
    WHERE st.id = NEW.sub_topic_id;

    -- Insert notification
    INSERT INTO public.notifications (student_id, title, message, type, is_read)
    VALUES (
        NEW.student_id,
        'อัปเดตคะแนน: ' || v_subject_name,
        'คะแนนบทเรียน ' || v_sub_topic_name || ' ได้รับการ' || CASE WHEN TG_OP = 'INSERT' THEN 'บันทึก' ELSE 'แก้ไข' END || 'แล้ว',
        'score_update',
        false
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create Trigger
DROP TRIGGER IF EXISTS on_score_update_notify ON public.student_scores;
CREATE TRIGGER on_score_update_notify
    AFTER INSERT OR UPDATE ON public.student_scores
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_score_notification();
