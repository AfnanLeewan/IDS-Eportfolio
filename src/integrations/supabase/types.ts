// Extended Supabase Database Types
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      exam_programs: {
        Row: {
          id: string
          name: string
          description: string | null
          academic_year: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          description?: string | null
          academic_year?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          academic_year?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      subjects: {
        Row: {
          id: string
          program_id: string
          name: string
          code: string
          description: string | null
          display_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          program_id: string
          name: string
          code: string
          description?: string | null
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          program_id?: string
          name?: string
          code?: string
          description?: string | null
          display_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      sub_topics: {
        Row: {
          id: string
          subject_id: string
          name: string
          max_score: number
          description: string | null
          display_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          subject_id: string
          name: string
          max_score: number
          description?: string | null
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          subject_id?: string
          name?: string
          max_score?: number
          description?: string | null
          display_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      classes: {
        Row: {
          id: string
          name: string
          program_id: string
          academic_year: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          program_id: string
          academic_year?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          program_id?: string
          academic_year?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      students: {
        Row: {
          id: string
          user_id: string | null
          name: string
          class_id: string
          email: string | null
          phone: string | null
          parent_email: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          user_id?: string | null
          name: string
          class_id: string
          email?: string | null
          phone?: string | null
          parent_email?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          name?: string
          class_id?: string
          email?: string | null
          phone?: string | null
          parent_email?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      student_scores: {
        Row: {
          id: string
          student_id: string
          sub_topic_id: string
          score: number
          exam_date: string | null
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
          version: number
        }
        Insert: {
          id?: string
          student_id: string
          sub_topic_id: string
          score: number
          exam_date?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
          version?: number
        }
        Update: {
          id?: string
          student_id?: string
          sub_topic_id?: string
          score?: number
          exam_date?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
          version?: number
        }
      }
      score_history: {
        Row: {
          id: string
          student_score_id: string | null
          student_id: string
          sub_topic_id: string
          old_score: number | null
          new_score: number | null
          changed_by: string | null
          changed_at: string
          change_reason: string | null
          ip_address: string | null
        }
        Insert: {
          id?: string
          student_score_id?: string | null
          student_id: string
          sub_topic_id: string
          old_score?: number | null
          new_score?: number | null
          changed_by?: string | null
          changed_at?: string
          change_reason?: string | null
          ip_address?: string | null
        }
        Update: {
          id?: string
          student_score_id?: string | null
          student_id?: string
          sub_topic_id?: string
          old_score?: number | null
          new_score?: number | null
          changed_by?: string | null
          changed_at?: string
          change_reason?: string | null
          ip_address?: string | null
        }
      }
      profiles: {
        Row: {
          id: string
          user_id: string
          email: string | null
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: 'admin' | 'teacher' | 'student'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role?: 'admin' | 'teacher' | 'student'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: 'admin' | 'teacher' | 'student'
          created_at?: string
        }
      }
    }
    Views: {
      mv_class_subject_stats: {
        Row: {
          class_id: string
          class_name: string
          subject_id: string
          subject_name: string
          subject_code: string
          student_count: number
          avg_percentage: number
          max_percentage: number
          min_percentage: number
          std_dev: number
        }
      }
    }
    Functions: {
      has_role: {
        Args: { _user_id: string; _role: 'admin' | 'teacher' | 'student' }
        Returns: boolean
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: 'admin' | 'teacher' | 'student'
      }
      get_student_total_score: {
        Args: { p_student_id: string }
        Returns: Array<{
          total_score: number
          total_max_score: number
          percentage: number
        }>
      }
      get_subject_score: {
        Args: { p_student_id: string; p_subject_id: string }
        Returns: Array<{
          score: number
          max_score: number
          percentage: number
        }>
      }
      get_class_average: {
        Args: { p_class_id: string }
        Returns: number
      }
      get_class_statistics: {
        Args: { p_class_id: string }
        Returns: Array<{
          total_students: number
          avg_percentage: number
          max_percentage: number
          min_percentage: number
          std_dev: number
        }>
      }
      get_top_performers: {
        Args: { p_class_id: string; p_limit?: number }
        Returns: Array<{
          student_id: string
          student_name: string
          total_percentage: number
          rank: number
        }>
      }
      upsert_student_scores: {
        Args: { p_scores: Json; p_updated_by: string }
        Returns: number
      }
      refresh_statistics: {
        Args: Record<string, never>
        Returns: void
      }
    }
    Enums: {
      app_role: 'admin' | 'teacher' | 'student'
    }
  }
}
