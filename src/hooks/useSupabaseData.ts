// React Query hooks for data fetching
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// ============ QUERY KEYS ============

export const queryKeys = {
  examPrograms: ['exam_programs'] as const,
  subjects: ['subjects'] as const,
  subjectsByProgram: (programId: string) => ['subjects', programId] as const,
  subTopics: ['sub_topics'] as const,
  subTopicsBySubject: (subjectId: string) => ['sub_topics', subjectId] as const,
  classes: ['classes'] as const,
  classById: (id: string) => ['classes', id] as const,
  students: ['students'] as const,
  studentById: (id: string) => ['students', id] as const,
  studentsByClass: (classId: string) => ['students', 'class', classId] as const,
  studentScores: (studentId: string) => ['student_scores', studentId] as const,
  classScores: (classId: string) => ['class_scores', classId] as const,
  classStats: (classId: string) => ['class_stats', classId] as const,
  topPerformers: (classId: string, limit: number) => ['top_performers', classId, limit] as const,
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
  return useQuery({
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

// Get subjects for a specific class
export function useClassSubjects(classId: string) {
  return useQuery({
    queryKey: ['class_subjects', classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('class_subjects')
        .select(`
          *,
          subjects (
            *,
            sub_topics (*)
          )
        `)
        .eq('class_id', classId)
        .eq('is_active', true)
        .order('display_order');
      
      if (error) throw error;
      return data;
    },
    enabled: !!classId && classId !== 'all',
  });
}

// Get all available subjects (not yet assigned to a class)
export function useAvailableSubjects(classId: string, programId: string = 'pre-a-level') {
  return useQuery({
    queryKey: ['available_subjects', classId, programId],
    queryFn: async () => {
      // Get all subjects for the program
      const { data: allSubjects, error: subjectsError } = await supabase
        .from('subjects')
        .select('*')
        .eq('program_id', programId);
      
      if (subjectsError) throw subjectsError;

      // Get already assigned subjects for this class
      const { data: classSubjects, error: classSubjectsError } = await supabase
        .from('class_subjects')
        .select('subject_id')
        .eq('class_id', classId)
        .eq('is_active', true);
      
      if (classSubjectsError) throw classSubjectsError;

      // Filter out already assigned subjects
      const assignedIds = new Set(classSubjects?.map(cs => cs.subject_id) || []);
      return allSubjects?.filter(s => !assignedIds.has(s.id)) || [];
    },
    enabled: !!classId && classId !== 'all',
  });
}

// ============ CLASSES ============

export function useClasses() {
  return useQuery({
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
  return useQuery({
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

// ============ STUDENT SCORES ============

export function useStudentScores(studentId: string) {
  return useQuery({
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
  return useQuery({
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
      return data;
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
    mutationFn: async (student: {
      id: string;
      name: string;
      class_id: string;
      email?: string;
    }) => {
      const { data, error } = await supabase
        .from('students')
        .insert(student)
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


