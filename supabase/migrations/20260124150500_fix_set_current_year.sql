-- Fix set_current_academic_year function to avoid "UPDATE requires a WHERE clause" error
-- by adding an explicit WHERE clause when resetting the current year flag.

CREATE OR REPLACE FUNCTION public.set_current_academic_year(p_year_id TEXT)
RETURNS void AS $$
BEGIN
  -- Unset the current flag ONLY for rows where it is true (optimization + safety)
  UPDATE public.academic_years 
  SET is_current = false 
  WHERE is_current = true;
  
  -- Set the specified year as current
  UPDATE public.academic_years 
  SET is_current = true 
  WHERE id = p_year_id;
END;
$$ LANGUAGE plpgsql;
