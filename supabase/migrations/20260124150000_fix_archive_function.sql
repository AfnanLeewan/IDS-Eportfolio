-- Fix archive_academic_year function to use the correct column name (academic_year_id) for linking classes
-- This aligns with the schema changes from migration 20260124135300_hierarchical_data_structure.sql

CREATE OR REPLACE FUNCTION public.archive_academic_year(p_year_id TEXT)
RETURNS void AS $$
BEGIN
  -- Archive the academic year
  UPDATE public.academic_years 
  SET is_active = false, is_current = false
  WHERE id = p_year_id;
  
  -- Mark associated classes as inactive using the academic_year_id foreign key
  UPDATE public.classes 
  SET is_active = false
  WHERE academic_year_id = p_year_id;
  
  -- Note: We handle the update based on the assumption that classes table has academic_year_id
  -- If for some reason the migration 20260124135300 hasn't fully applied, this might fall back to checking logic or failing gracefully if column missing
  -- But based on current codebase state, academic_year_id is the correct column.
END;
$$ LANGUAGE plpgsql;
