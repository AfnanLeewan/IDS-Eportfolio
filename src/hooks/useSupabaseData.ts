// React Query hooks for data fetching
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// ============ QUERY KEYS ============

export const queryKeys = {
  examPrograms: ['exam_programs'] as const,
  examProgramsByYear: (yearId: string) => ['exam_programs', 'year', yearId] as const,
  subjects: ['subjects'] as const,
  subjectsByProgram: (programId: string) => ['subjects', programId] as const,
  subTopics: ['sub_topics'] as const,
  subTopicsBySubject: (subjectId: string) => ['sub_topics', subjectId] as const,
  classes: ['classes'] as const,
  classesByYear: (yearId: string) => ['classes', 'year', yearId] as const,
  classById: (id: string) => ['classes', id] as const,
  students: ['students'] as const,
  studentById: (id: string) => ['students', id] as const,
  studentsByClass: (classId: string) => ['students', 'class', classId] as const,
  studentScores: (studentId: string) => ['student_scores', studentId] as const,
  classScores: (classId: string) => ['class_scores', classId] as const,
  classStats: (classId: string) => ['class_stats', classId] as const,
  topPerformers: (classId: string, limit: number) => ['top_performers', classId, limit] as const,
  academicYears: ['academic_years'] as const,
  currentAcademicYear: ['current_academic_year'] as const,
  studentScoresByYear: (studentId: string, year: number) => ['student_scores', studentId, year] as const,
  classStatsByYear: (classId: string, year: number) => ['class_stats', classId, year] as const,
  studentYearComparison: (studentId: string) => ['student_year_comparison', studentId] as const,
  programClasses: (programId: string) => ['program_classes', programId] as const,
  classPrograms: (classId: string) => ['class_programs', classId] as const,
  programStudents: (programId: string) => ['program_students', programId] as const,
  yearPrograms: (yearId: string) => ['year_programs', yearId] as const,
  yearClasses: (yearId: string) => ['year_classes', yearId] as const,
};

// ============ EXAM PROGRAMS ============

export function useExamPrograms() {
  return useQuery({
    queryKey: queryKeys.examPrograms,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exam_programs')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });
}

// ============ SUBJECTS ============

export function useSubjects(programId?: string) {
  return useQuery({
    queryKey: programId ? queryKeys.subjectsByProgram(programId) : queryKeys.subjects,
    queryFn: async () => {
      let query = supabase
        .from('subjects')
        .select('*')
        .order('display_order');
      
      if (programId) {
        query = query.eq('program_id', programId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

// ============ SUB-TOPICS ============

export function useSubTopics(subjectId?: string) {
  return useQuery({
    queryKey: subjectId ? queryKeys.subTopicsBySubject(subjectId) : queryKeys.subTopics,
    queryFn: async () => {
      let query = supabase
        .from('sub_topics')
        .select('*')
        .order('display_order');
      
      if (subjectId) {
        query = query.eq('subject_id', subjectId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

// Get complete subject with sub-topics
export function useSubjectWithTopics(programId: string = 'pre-a-level') {
  return useQuery<any[]>({
    queryKey: ['subjects_with_topics', programId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select(`
          *,
          sub_topics (*)
        `)
        .eq('program_id', programId)
        .order('display_order');
      
      if (error) throw error;
      return data;
    },
  });
}

// Get subjects for a specific class (via program assignments)
export function useClassSubjects(classId: string) {
  return useQuery({
    queryKey: ['class_subjects', classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_class_subjects', { p_class_id: classId });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!classId && classId !== 'all',
  });
}

// Note: No longer needed - subjects come automatically via program assignment
// Keeping for backward compatibility but can be removed
export function useAvailableSubjects(classId: string, programId: string = 'pre-a-level') {
  return useQuery({
    queryKey: ['available_subjects', classId, programId],
    queryFn: async () => {
      return []; // No longer assigning subjects manually
    },
    enabled: false, // Disabled - subjects auto-assigned via programs
  });
}

// ============ CLASSES ============

export function useClasses() {
  return useQuery<any[]>({
    queryKey: queryKeys.classes,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });
}

// ============ STUDENTS ============

export function useStudents(classId?: string) {
  return useQuery<any[]>({
    queryKey: classId ? queryKeys.studentsByClass(classId) : queryKeys.students,
    queryFn: async () => {
      let query = supabase
        .from('students')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (classId && classId !== 'all') {
        query = query.eq('class_id', classId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useStudent(studentId: string) {
  return useQuery({
    queryKey: queryKeys.studentById(studentId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('id', studentId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!studentId,
  });
}

export function useCurrentStudent() {
  const { user, isStudent } = useAuth();
  return useQuery({
    queryKey: ['current_student', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('students')
        .select('*, classes(name)')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && isStudent,
  });
}

// ============ NOTIFICATIONS ============

export function useNotifications(studentId: string) {
  return useQuery<any[]>({
    queryKey: ['notifications', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!studentId,
    // Refetch often or use subscription
    refetchInterval: 60000, 
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
        
      if (error) throw error;
    },
    onSuccess: (_, notificationId) => {
      // Optimistic update could be done here, but invalidating is safer
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

// ============ STUDENT SCORES ============

export function useStudentScores(studentId: string) {
  return useQuery<any[]>({
    queryKey: queryKeys.studentScores(studentId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_scores')
        .select(`
          *,
          sub_topics (
            id,
            name,
            max_score,
            subject_id,
            subjects (
              id,
              name,
              code
            )
          )
        `)
        .eq('student_id', studentId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!studentId,
  });
}

// Get all scores for a class with student info
export function useClassScores(classId: string = 'all') {
  return useQuery<any[]>({
    queryKey: queryKeys.classScores(classId),
    queryFn: async () => {
      // First get students in the class
      let studentsQuery = supabase
        .from('students')
        .select(`
          id,
          name,
          class_id,
          student_scores (
            id,
            sub_topic_id,
            score,
            exam_date,
            updated_at
          )
        `)
        .eq('is_active', true);
      
      if (classId !== 'all') {
        studentsQuery = studentsQuery.eq('class_id', classId);
      }
      
      const { data, error } = await studentsQuery;
      if (error) throw error;
      
      // Validate response
      if (!Array.isArray(data)) {
        throw new Error('Invalid response format: expected array of students');
      }
      
      return data;
    },
  });
}

// ============ SCORE MUTATIONS ============

// Update single score
export function useUpdateStudentScore() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      studentId, 
      subTopicId, 
      score, 
      academicYear 
    }: { 
      studentId: string; 
      subTopicId: string; 
      score: number;
      academicYear: number;
    }) => {
      // Input validation
      if (!studentId || !subTopicId) {
        throw new Error('Missing required fields: studentId, subTopicId');
      }
      if (score < 0) {
        throw new Error('Score cannot be negative');
      }

      const { data, error } = await supabase
        .from('student_scores')
        .upsert({
          student_id: studentId,
          sub_topic_id: subTopicId,
          score,
          academic_year: academicYear,
          updated_at: new Date().toISOString(),
          updated_by: user?.id
        }, { onConflict: 'student_id, sub_topic_id' })
        .select()
        .single();

      if (error) throw error;
      
      // Response validation
      if (!data) {
        throw new Error('Server returned no data');
      }
      if (data.score !== score) {
        throw new Error(
          `Score mismatch: sent ${score}, received ${data.score}. ` +
          'Server-side validation may have rejected your value.'
        );
      }
      
      return data;
    },
    onMutate: async (newData) => {
      // Optimistic update
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.studentScores(newData.studentId) 
      });
      
      const previousData = queryClient.getQueryData(
        queryKeys.studentScores(newData.studentId)
      );
      
      // Update cache optimistically
      queryClient.setQueryData(
        queryKeys.studentScores(newData.studentId),
        (old: any[]) => {
          if (!old) return old;
          return old.map(score =>
            score.sub_topic_id === newData.subTopicId
              ? { ...score, score: newData.score }
              : score
          );
        }
      );
      
      return { previousData };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.studentScores(variables.studentId) });
      queryClient.invalidateQueries({ queryKey: ['class_scores'] });
      queryClient.invalidateQueries({ queryKey: ['student_scores_by_year'] });
      toast.success('Score updated successfully');
    },
    onError: (error: Error, variables, context: any) => {
      // Rollback optimistic update
      if (context?.previousData) {
        queryClient.setQueryData(
          queryKeys.studentScores(variables.studentId),
          context.previousData
        );
      }
      toast.error(`Failed to update score: ${error.message}`);
    },
  });
}

// Update multiple scores (batch)
export function useUpdateStudentScores() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      studentId, 
      scores,
      academicYear 
    }: { 
      studentId: string; 
      scores: { subTopicId: string; score: number }[];
      academicYear: number;
    }) => {
      const records = scores.map(s => ({
        student_id: studentId,
        sub_topic_id: s.subTopicId,
        score: s.score,
        academic_year: academicYear,
        updated_at: new Date().toISOString()
      }));

      const { data, error } = await supabase
        .from('student_scores')
        .upsert(records, { onConflict: 'student_id, sub_topic_id' })
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.studentScores(variables.studentId) });
      queryClient.invalidateQueries({ queryKey: ['class_scores'] });
      toast.success('บันทึกคะแนนเรียบร้อยแล้ว');
    },
    onError: (error: Error) => {
      toast.error(`เกิดข้อผิดพลาดในการบันทึกคะแนน: ${error.message}`);
    },
  });
}

// Delete scores for a subject (by sub-topic IDs)
export function useDeleteStudentSubjectScores() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      studentId, 
      subTopicIds 
    }: { 
      studentId: string; 
      subTopicIds: string[];
    }) => {
      const { error } = await supabase
        .from('student_scores')
        .delete()
        .eq('student_id', studentId)
        .in('sub_topic_id', subTopicIds);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.studentScores(variables.studentId) });
      queryClient.invalidateQueries({ queryKey: ['class_scores'] }); 
      toast.success('ลบคะแนนเรียบร้อยแล้ว');
    },
     onError: (error: Error) => {
      toast.error(`เกิดข้อผิดพลาดในการลบคะแนน: ${error.message}`);
    },
  });
}

// Delete ALL scores for a student
export function useDeleteStudentScores() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (studentId: string) => {
      const { error } = await supabase
        .from('student_scores')
        .delete()
        .eq('student_id', studentId);
      
      if (error) throw error;
    },
    onSuccess: (_, studentId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.studentScores(studentId) });
      queryClient.invalidateQueries({ queryKey: ['class_scores'] });
      toast.success('ลบคะแนนทั้งหมดของนักเรียนเรียบร้อยแล้ว');
    },
    onError: (error: Error) => {
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
    },
  });
}

// ============ ANALYTICS & STATISTICS ============

export function useClassStatistics(classId: string) {
  return useQuery({
    queryKey: queryKeys.classStats(classId),
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_class_statistics', { p_class_id: classId });
      
      if (error) throw error;
      return data?.[0] || {
        total_students: 0,
        avg_percentage: 0,
        max_percentage: 0,
        min_percentage: 0,
        std_dev: 0,
      };
    },
    enabled: !!classId && classId !== 'all',
  });
}

export function useTopPerformers(classId: string, limit: number = 5) {
  return useQuery({
    queryKey: queryKeys.topPerformers(classId, limit),
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_top_performers', { 
          p_class_id: classId,
          p_limit: limit 
        });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!classId && classId !== 'all',
  });
}

// Get class subject statistics from materialized view
export function useClassSubjectStats(classId?: string) {
  return useQuery({
    queryKey: ['class_subject_stats', classId],
    queryFn: async () => {
      let query = supabase
        .from('mv_class_subject_stats')
        .select('*');
      
      if (classId && classId !== 'all') {
        query = query.eq('class_id', classId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

// ============ MUTATIONS ============

// Add new student
export function useCreateStudent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (newStudent: {
      id: string;
      name: string;
      class_id: string;
      email?: string;
      user_id?: string;
    }) => {
      const { data, error } = await supabase
        .from('students')
        .insert(newStudent)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students });
      toast.success('เพิ่มนักเรียนสำเร็จ');
    },
    onError: (error: Error) => {
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
    },
  });
}

// Update student
export function useUpdateStudent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: { 
      id: string;
      name?: string;
      class_id?: string;
      email?: string;
    }) => {
      const { data, error } = await supabase
        .from('students')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students });
      queryClient.invalidateQueries({ queryKey: queryKeys.studentById(variables.id) });
      toast.success('อัปเดตข้อมูลนักเรียนสำเร็จ');
    },
    onError: (error: Error) => {
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
    },
  });
}

// Delete student
export function useDeleteStudent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (studentId: string) => {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', studentId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students });
      toast.success('ลบนักเรียนสำเร็จ');
    },
    onError: (error: Error) => {
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
    },
  });
}

// Update single score
export function useUpdateScore() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ 
      studentId, 
      subTopicId, 
      score 
    }: { 
      studentId: string;
      subTopicId: string;
      score: number;
    }) => {
      const { data, error } = await supabase
        .from('student_scores')
        .upsert({
          student_id: studentId,
          sub_topic_id: subTopicId,
          score,
          updated_by: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.studentScores(variables.studentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.classScores('all') });
      toast.success('อัปเดตคะแนนสำเร็จ');
    },
    onError: (error: Error) => {
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
    },
  });
}

// Bulk update scores
export function useBulkUpdateScores() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (scores: Array<{
      student_id: string;
      sub_topic_id: string;
      score: number;
    }>) => {
      const { data, error } = await supabase
        .rpc('upsert_student_scores', {
          p_scores: scores,
          p_updated_by: user?.id,
        });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students });
      queryClient.invalidateQueries({ queryKey: ['student_scores'] });
      queryClient.invalidateQueries({ queryKey: ['class_scores'] });
      toast.success('อัปเดตคะแนนทั้งหมดสำเร็จ');
    },
    onError: (error: Error) => {
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
    },
  });
}

// Delete score
export function useDeleteScore() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      studentId, 
      subTopicId 
    }: { 
      studentId: string;
      subTopicId: string;
    }) => {
      const { error } = await supabase
        .from('student_scores')
        .delete()
        .eq('student_id', studentId)
        .eq('sub_topic_id', subTopicId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.studentScores(variables.studentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.classScores('all') });
      toast.success('ลบคะแนนสำเร็จ');
    },
    onError: (error: Error) => {
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
    },
  });
}

// Refresh materialized views
export function useRefreshStatistics() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('refresh_statistics');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class_subject_stats'] });
      queryClient.invalidateQueries({ queryKey: ['class_stats'] });
      toast.success('รีเฟรชสถิติสำเร็จ');
    },
    onError: (error: Error) => {
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
    },
  });
}

// ============ SUBJECT MUTATIONS ============

// Create subject
export function useCreateSubject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (subject: {
      id: string;
      program_id: string;
      name: string;
      code: string;
      display_order?: number;
    }) => {
      const { data, error } = await supabase
        .from('subjects')
        .insert(subject)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subjects });
      queryClient.invalidateQueries({ queryKey: ['subjects_with_topics'] });
      toast.success('เพิ่มวิชาสำเร็จ');
    },
    onError: (error: Error) => {
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
    },
  });
}

// Update subject
export function useUpdateSubject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string;
      name?: string;
      code?: string;
      display_order?: number;
    }) => {
      const { data, error } = await supabase
        .from('subjects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subjects });
      queryClient.invalidateQueries({ queryKey: ['subjects_with_topics'] });
      toast.success('อัปเดตวิชาสำเร็จ');
    },
    onError: (error: Error) => {
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
    },
  });
}

// Delete subject
export function useDeleteSubject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (subjectId: string) => {
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', subjectId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subjects });
      queryClient.invalidateQueries({ queryKey: queryKeys.subTopics });
      queryClient.invalidateQueries({ queryKey: ['subjects_with_topics'] });
      toast.success('ลบวิชาสำเร็จ');
    },
    onError: (error: Error) => {
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
    },
  });
}

// ============ SUB-TOPIC MUTATIONS ============

// Create sub-topic
export function useCreateSubTopic() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (subTopic: {
      id: string;
      subject_id: string;
      name: string;
      max_score: number;
      display_order?: number;
    }) => {
      const { data, error } = await supabase
        .from('sub_topics')
        .insert(subTopic)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subTopics });
      queryClient.invalidateQueries({ queryKey: queryKeys.subjects });
      queryClient.invalidateQueries({ queryKey: ['subjects_with_topics'] });
      toast.success('เพิ่มหัวข้อย่อยสำเร็จ');
    },
    onError: (error: Error) => {
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
    },
  });
}

// Update sub-topic
export function useUpdateSubTopic() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string;
      name?: string;
      max_score?: number;
      display_order?: number;
    }) => {
      const { data, error } = await supabase
        .from('sub_topics')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subTopics });
      queryClient.invalidateQueries({ queryKey: ['subjects_with_topics'] });
      toast.success('อัปเดตหัวข้อย่อยสำเร็จ');
    },
    onError: (error: Error) => {
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
    },
  });
}

// Delete sub-topic
export function useDeleteSubTopic() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (subTopicId: string) => {
      const { error } = await supabase
        .from('sub_topics')
        .delete()
        .eq('id', subTopicId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subTopics });
      queryClient.invalidateQueries({ queryKey: ['subjects_with_topics'] });
      toast.success('ลบหัวข้อย่อยสำเร็จ');
    },
    onError: (error: Error) => {
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
    },
  });
}

// ============ CLASS-SUBJECT MUTATIONS ============

// Assign subject to class
export function useAssignSubjectToClass() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ classId, subjectId }: {
      classId: string;
      subjectId: string;
    }) => {
      const { data, error } = await supabase
        .from('class_subjects')
        .insert({
          class_id: classId,
          subject_id: subjectId,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['class_subjects', variables.classId] });
      queryClient.invalidateQueries({ queryKey: ['available_subjects', variables.classId] });
      toast.success('เพิ่มวิชาให้ห้องเรียนสำเร็จ');
    },
    onError: (error: Error) => {
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
    },
  });
}

// Remove subject from class
export function useRemoveSubjectFromClass() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ classId, subjectId }: {
      classId: string;
      subjectId: string;
    }) => {
      const { error } = await supabase
        .from('class_subjects')
        .delete()
        .eq('class_id', classId)
        .eq('subject_id', subjectId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['class_subjects', variables.classId] });
      queryClient.invalidateQueries({ queryKey: ['available_subjects', variables.classId] });
      toast.success('ลบวิชาออกจากห้องเรียนสำเร็จ');
    },
    onError: (error: Error) => {
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
    },
  });
}

// ============ ACADEMIC YEAR MANAGEMENT ============

export interface AcademicYear {
  id: string;
  year_number: number;
  display_name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_current: boolean;
  created_at: string;
  updated_at: string;
}

// Get all academic years
export function useAcademicYears() {
  return useQuery({
    queryKey: queryKeys.academicYears,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('academic_years')
        .select('*')
        .order('year_number', { ascending: false });
      
      if (error) throw error;
      return data as AcademicYear[];
    },
  });
}

// Get current academic year
export function useCurrentAcademicYear() {
  return useQuery({
    queryKey: queryKeys.currentAcademicYear,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('academic_years')
        .select('*')
        .eq('is_current', true)
        .single();
      
      if (error) {
        // If no current year, return the most recent active year
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('academic_years')
          .select('*')
          .eq('is_active', true)
          .order('year_number', { ascending: false })
          .limit(1)
          .single();
        
        if (fallbackError) throw fallbackError;
        return fallbackData as AcademicYear;
      }
      
      return data as AcademicYear;
    },
  });
}

// Get student scores by year
export function useStudentScoresByYear(studentId: string, academicYear: number) {
  return useQuery({
    queryKey: queryKeys.studentScoresByYear(studentId, academicYear),
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_student_scores_by_year', {
          p_student_id: studentId,
          p_academic_year: academicYear,
        });
      
      if (error) throw error;
      return data;
    },
    enabled: !!studentId && !!academicYear,
  });
}

// Get class statistics by year
export function useClassStatisticsByYear(classId: string, academicYear: number) {
  return useQuery({
    queryKey: queryKeys.classStatsByYear(classId, academicYear),
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_class_statistics_by_year', {
          p_class_id: classId,
          p_academic_year: academicYear,
        });
      
      if (error) throw error;
      return data?.[0] || {
        total_students: 0,
        avg_percentage: 0,
        max_percentage: 0,
        min_percentage: 0,
        std_dev: 0,
      };
    },
    enabled: !!classId && classId !== 'all' && !!academicYear,
  });
}

// Get student year-over-year comparison
export function useStudentYearComparison(studentId: string) {
  return useQuery({
    queryKey: queryKeys.studentYearComparison(studentId),
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_student_year_comparison', {
          p_student_id: studentId,
        });
      
      if (error) throw error;
      return data;
    },
    enabled: !!studentId,
  });
}

// Create academic year
export function useCreateAcademicYear() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (year: {
      id: string;
      year_number: number;
      display_name: string;
      start_date: string;
      end_date: string;
      is_active?: boolean;
      is_current?: boolean;
    }) => {
      const { data, error } = await supabase
        .from('academic_years')
        .insert(year)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.academicYears });
      toast.success('เพิ่มปีการศึกษาสำเร็จ');
    },
    onError: (error: Error) => {
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
    },
  });
}

// Set current academic year
export function useSetCurrentAcademicYear() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (yearId: string) => {
      // Use direct updates instead of RPC to avoid "UPDATE requires WHERE clause" error
      // 1. Unset any currently active year
      const { error: unsetError } = await supabase
        .from('academic_years')
        .update({ is_current: false })
        .eq('is_current', true);
      
      if (unsetError) throw unsetError;

      // 2. Set the new year as current
      const { error: setError } = await supabase
        .from('academic_years')
        .update({ is_current: true })
        .eq('id', yearId);
      
      if (setError) throw setError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.academicYears });
      queryClient.invalidateQueries({ queryKey: queryKeys.currentAcademicYear });
      toast.success('เปลี่ยนปีการศึกษาปัจจุบันสำเร็จ');
    },
    onError: (error: Error) => {
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
    },
  });
}

// Archive academic year
export function useArchiveAcademicYear() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (yearId: string) => {
      const { error } = await supabase.rpc('archive_academic_year', {
        p_year_id: yearId,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.academicYears });
      queryClient.invalidateQueries({ queryKey: queryKeys.classes });
      toast.success('เก็บถาวรปีการศึกษาสำเร็จ');
    },
    onError: (error: Error) => {
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
    },
  });
}

// Update academic year
export function useUpdateAcademicYear() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string;
      year_number?: number;
      display_name?: string;
      start_date?: string;
      end_date?: string;
      is_active?: boolean;
    }) => {
      const { data, error } = await supabase
        .from('academic_years')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.academicYears });
      toast.success('อัปเดตปีการศึกษาสำเร็จ');
    },
    onError: (error: Error) => {
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
    },
  });
}



// ============ HIERARCHICAL DATA STRUCTURE ============

// Get programs for an academic year
export function useYearPrograms(academicYearId: string) {
  return useQuery({
    queryKey: queryKeys.yearPrograms(academicYearId),
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_year_programs', { p_academic_year_id: academicYearId });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!academicYearId,
  });
}

// Get classes for an academic year
export function useYearClasses(academicYearId: string) {
  return useQuery({
    queryKey: queryKeys.yearClasses(academicYearId),
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_year_classes', { p_academic_year_id: academicYearId });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!academicYearId,
  });
}

// Get classes assigned to a program
export function useProgramClasses(programId: string) {
  return useQuery({
    queryKey: queryKeys.programClasses(programId),
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_program_classes', { p_program_id: programId });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!programId,
  });
}

// Get programs assigned to a class
export function useClassPrograms(classId: string) {
  return useQuery({
    queryKey: queryKeys.classPrograms(classId),
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_class_programs', { p_class_id: classId });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!classId && classId !== 'all',
  });
}

// Get students in a program (via class assignments)
export function useProgramStudents(programId: string) {
  return useQuery({
    queryKey: queryKeys.programStudents(programId),
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_program_students', { p_program_id: programId });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!programId,
  });
}

// Get exam programs filtered by academic year
export function useExamProgramsByYear(academicYearId?: string) {
  return useQuery({
    queryKey: academicYearId ? queryKeys.examProgramsByYear(academicYearId) : queryKeys.examPrograms,
    queryFn: async () => {
      let query = supabase
        .from('exam_programs')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (academicYearId) {
        query = query.eq('academic_year_id', academicYearId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

// Get classes filtered by academic year
export function useClassesByYear(academicYearId?: string) {
  return useQuery({
    queryKey: academicYearId ? queryKeys.classesByYear(academicYearId) : queryKeys.classes,
    queryFn: async () => {
      let query = supabase
        .from('classes')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (academicYearId) {
        query = query.eq('academic_year_id', academicYearId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

// ============ PROGRAM-CLASS ASSIGNMENT MUTATIONS ============

// Assign class to program
export function useAssignClassToProgram() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ programId, classId }: {
      programId: string;
      classId: string;
    }) => {
      const { data, error } = await supabase
        .rpc('assign_class_to_program', {
          p_program_id: programId,
          p_class_id: classId,
          p_assigned_by: user?.id,
        });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.programClasses(variables.programId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.classPrograms(variables.classId) });
      queryClient.invalidateQueries({ queryKey: ['year_programs'] });
      queryClient.invalidateQueries({ queryKey: ['year_classes'] });
      toast.success('มอบหมายชั้นเรียนให้โครงการสำเร็จ');
    },
    onError: (error: Error) => {
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
    },
  });
}

// Remove class from program
export function useRemoveClassFromProgram() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ programId, classId }: {
      programId: string;
      classId: string;
    }) => {
      const { error } = await supabase
        .rpc('remove_class_from_program', {
          p_program_id: programId,
          p_class_id: classId,
        });
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.programClasses(variables.programId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.classPrograms(variables.classId) });
      queryClient.invalidateQueries({ queryKey: ['year_programs'] });
      queryClient.invalidateQueries({ queryKey: ['year_classes'] });
      toast.success('ลบชั้นเรียนออกจากโครงการสำเร็จ');
    },
    onError: (error: Error) => {
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
    },
  });
}

// ============ EXAM PROGRAM MUTATIONS (Updated) ============

// Create exam program (now requires academic year)
export function useCreateExamProgram() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (program: {
      id: string;
      name: string;
      description?: string;
      academic_year_id: string;
      is_active?: boolean;
    }) => {
      const { data, error } = await supabase
        .from('exam_programs')
        .insert(program)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.examPrograms });
      queryClient.invalidateQueries({ queryKey: queryKeys.yearPrograms(variables.academic_year_id) });
      toast.success('เพิ่มโครงการสอบสำเร็จ');
    },
    onError: (error: Error) => {
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
    },
  });
}

// Update exam program
export function useUpdateExamProgram() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string;
      name?: string;
      description?: string;
      is_active?: boolean;
    }) => {
      const { data, error } = await supabase
        .from('exam_programs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.examPrograms });
      queryClient.invalidateQueries({ queryKey: ['year_programs'] });
      toast.success('อัปเดตโครงการสอบสำเร็จ');
    },
    onError: (error: Error) => {
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
    },
  });
}

// Delete exam program
export function useDeleteExamProgram() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (programId: string) => {
      const { error } = await supabase
        .from('exam_programs')
        .delete()
        .eq('id', programId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.examPrograms });
      queryClient.invalidateQueries({ queryKey: queryKeys.subjects });
      queryClient.invalidateQueries({ queryKey: ['year_programs'] });
      toast.success('ลบโครงการสอบสำเร็จ');
    },
    onError: (error: Error) => {
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
    },
  });
}

// ============ CLASS MUTATIONS (Updated) ============

// Create class (now requires academic year)
export function useCreateClass() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (classData: {
      id: string;
      name: string;
      academic_year_id: string;
      is_active?: boolean;
    }) => {
      const { data, error } = await supabase
        .from('classes')
        .insert(classData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.classes });
      queryClient.invalidateQueries({ queryKey: queryKeys.yearClasses(variables.academic_year_id) });
      toast.success('เพิ่มชั้นเรียนสำเร็จ');
    },
    onError: (error: Error) => {
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
    },
  });
}

// Update class
export function useUpdateClass() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string;
      name?: string;
      is_active?: boolean;
    }) => {
      const { data, error } = await supabase
        .from('classes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.classes });
      queryClient.invalidateQueries({ queryKey: ['year_classes'] });
      toast.success('อัปเดตชั้นเรียนสำเร็จ');
    },
    onError: (error: Error) => {
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
    },
  });
}

// Delete class
export function useDeleteClass() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (classId: string) => {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', classId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.classes });
      queryClient.invalidateQueries({ queryKey: queryKeys.students });
      queryClient.invalidateQueries({ queryKey: ['year_classes'] });
      toast.success('ลบชั้นเรียนสำเร็จ');
    },
    onError: (error: Error) => {
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
    },
  });
}

// Create new user (manual admin provisioning)
export function useCreateUser() {
  const { user: adminUser } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { 
      email: string; 
      password: string; 
      fullName: string; 
      role: string 
    }) => {
      // Validate input
      if (!data.email || !data.password || !data.fullName || !data.role) {
        throw new Error('Missing required fields');
      }
      if (!['admin', 'teacher', 'student'].includes(data.role)) {
        throw new Error('Invalid role');
      }
      if (data.password.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }
      
      // Enhanced RPC with audit trail
      const { data: userId, error } = await supabase.rpc('create_new_user', {
        p_email: data.email,
        p_password: data.password,
        p_full_name: data.fullName,
        p_role: data.role,
        p_created_by: adminUser?.id
      });
      
      if (error) throw error;
      
      // Validate response
      if (!userId) {
        throw new Error('Server returned no user ID');
      }
      
      return userId;
    },
    onSuccess: (userId) => {
      queryClient.invalidateQueries({ queryKey: ['teachers_list'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(`User created: ${userId}`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to create user: ${error.message}`);
    },
  });
}

// Update existing user profile and role
export function useUpdateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { userId: string; fullName: string; role: string }) => {
      // 1. Update profile (full_name)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: data.fullName })
        .eq('user_id', data.userId);
        
      if (profileError) throw profileError;
      
      // 2. Update role
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ role: data.role as any })
        .eq('user_id', data.userId);
        
      if (roleError) throw roleError;
      
      return data.userId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers_list'] });
      // Note: we'll manual refetch in the component if needed since we don't have a broad 'users' query key here
      toast.success('อัปเดตข้อมูลผู้ใช้งานเรียบร้อยแล้ว');
    },
    onError: (error: Error) => {
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
    },
  });
}

// Delete user
export function useDeleteUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc('delete_user', {
        p_user_id: userId
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers_list'] });
      toast.success('ลบผู้ใช้งานเรียบร้อยแล้ว');
    },
    onError: (error: Error) => {
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
    },
  });
}

// ============ TEACHER ASSIGNMENTS ============

export function useTeacherAssignments(teacherId?: string) {
  return useQuery({
    queryKey: ['teacher_assignments', teacherId],
    queryFn: async () => {
      let query = supabase
        .from('teacher_assignments')
        .select(`
          unique_id:id,
          teacher_id,
          subject_id,
          subjects (id, name, code)
        `);
      
      if (teacherId) {
        query = query.eq('teacher_id', teacherId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: true,
  });
}

export function useAssignTeacher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ teacherId, subjectId }: { teacherId: string; subjectId: string }) => {
      const { error } = await supabase
        .from('teacher_assignments')
        .insert({ teacher_id: teacherId, subject_id: subjectId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher_assignments'] });
      toast.success('Assigned teacher successfully');
    },
    onError: (error: any) => toast.error(error.message),
  });
}

export function useRemoveAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ teacherId, subjectId }: { teacherId: string; subjectId: string }) => {
      const { error } = await supabase
        .from('teacher_assignments')
        .delete()
        .eq('teacher_id', teacherId)
        .eq('subject_id', subjectId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher_assignments'] });
      toast.success('Removed assignment');
    },
    onError: (error: any) => toast.error(error.message),
  });
}

export function useTeachersList() {
  return useQuery({
    queryKey: ['teachers_list'],
    queryFn: async () => {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'teacher');
        
      if (!roles?.length) return [];
      
      const userIds = roles.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds);
        
      return profiles || [];
    }
  });
}

export function useUpsertStudentScores() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ scores }: { scores: any[] }) => {
      if (!user?.id) throw new Error("User not authenticated");
      
      const { error } = await supabase.rpc('upsert_student_scores', {
        p_scores: scores,
        p_updated_by: user.id
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class_scores'] });
      queryClient.invalidateQueries({ queryKey: ['student_scores'] });
      toast.success('Scores uploaded successfully');
    },
    onError: (error: any) => {
      toast.error(`Upload failed: ${error.message}`);
    },
  });
}
