// Data transformation utilities for working with database data
import type { Database } from '@/integrations/supabase/types';

type Student = Database['public']['Tables']['students']['Row'];
type StudentScore = Database['public']['Tables']['student_scores']['Row'];
type SubTopic = Database['public']['Tables']['sub_topics']['Row'];
type Subject = Database['public']['Tables']['subjects']['Row'];

// Extended types with relationships
export interface StudentWithScores extends Student {
  student_scores: StudentScore[];
}

export interface SubTopicWithSubject extends SubTopic {
  subjects: Subject;
}

export interface ScoreWithSubTopic extends StudentScore {
  sub_topics: SubTopicWithSubject;
}

export interface StudentScoreData {
  subTopicId: string;
  score: number;
  maxScore: number;
  percentage: number;
  subTopicName: string;
  subjectId: string;
  subjectName: string;
}

// ============ SCORE CALCULATIONS ============

/**
 * Calculate total score for a student
 */
export function calculateTotalScore(scores: StudentScore[], subTopics: SubTopic[]) {
  const totalScore = scores.reduce((sum, score) => sum + score.score, 0);
  const totalMaxScore = subTopics
    .filter(st => scores.some(s => s.sub_topic_id === st.id))
    .reduce((sum, st) => sum + st.max_score, 0);
  
  const percentage = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;
  
  return {
    score: totalScore,
    maxScore: totalMaxScore,
    percentage: Number(percentage.toFixed(2)),
  };
}

/**
 * Calculate subject score for a student
 */
export function calculateSubjectScore(
  studentScores: StudentScore[],
  subjectId: string,
  allSubTopics: SubTopic[]
) {
  const subjectSubTopics = allSubTopics.filter(st => st.subject_id === subjectId);
  const relevantScores = studentScores.filter(score => 
    subjectSubTopics.some(st => st.id === score.sub_topic_id)
  );
  
  const totalScore = relevantScores.reduce((sum, score) => sum + score.score, 0);
  const totalMaxScore = subjectSubTopics.reduce((sum, st) => sum + st.max_score, 0);
  
  const percentage = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;
  
  return {
    score: totalScore,
    maxScore: totalMaxScore,
    percentage: Number(percentage.toFixed(2)),
  };
}

/**
 * Transform student scores data for use in components
 */
export function transformStudentScores(
  student: StudentWithScores,
  allSubTopics: SubTopic[]
): StudentScoreData[] {
  return student.student_scores.map(score => {
    const subTopic = allSubTopics.find(st => st.id === score.sub_topic_id);
    if (!subTopic) {
      return null;
    }
    
    const percentage = (score.score / subTopic.max_score) * 100;
    
    return {
      subTopicId: score.sub_topic_id,
      score: score.score,
      maxScore: subTopic.max_score,
      percentage: Number(percentage.toFixed(2)),
      subTopicName: subTopic.name,
      subjectId: subTopic.subject_id,
      subjectName: '', // Will be filled by subject data
    };
  }).filter((s): s is StudentScoreData => s !== null);
}

/**
 * Calculate class average
 */
export function calculateClassAverage(
  students: StudentWithScores[],
  allSubTopics: SubTopic[]
): number {
  if (students.length === 0) return 0;
  
  const percentages = students.map(student => {
    const { percentage } = calculateTotalScore(student.student_scores, allSubTopics);
    return percentage;
  });
  
  const average = percentages.reduce((sum, p) => sum + p, 0) / percentages.length;
  return Number(average.toFixed(2));
}

/**
 * Calculate class statistics
 */
export function calculateClassStatistics(
  students: StudentWithScores[],
  allSubTopics: SubTopic[]
) {
  if (students.length === 0) {
    return {
      totalStudents: 0,
      avgPercentage: 0,
      maxPercentage: 0,
      minPercentage: 0,
      stdDev: 0,
    };
  }
  
  const percentages = students.map(student => {
    const { percentage } = calculateTotalScore(student.student_scores, allSubTopics);
    return percentage;
  });
  
  const avgPercentage = percentages.reduce((sum, p) => sum + p, 0) / percentages.length;
  const maxPercentage = Math.max(...percentages);
  const minPercentage = Math.min(...percentages);
  
  // Calculate standard deviation
  const squaredDiffs = percentages.map(p => Math.pow(p - avgPercentage, 2));
  const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / percentages.length;
  const stdDev = Math.sqrt(variance);
  
  return {
    totalStudents: students.length,
    avgPercentage: Number(avgPercentage.toFixed(2)),
    maxPercentage: Number(maxPercentage.toFixed(2)),
    minPercentage: Number(minPercentage.toFixed(2)),
    stdDev: Number(stdDev.toFixed(2)),
  };
}

/**
 * Get top performers
 */
export function getTopPerformers(
  students: StudentWithScores[],
  allSubTopics: SubTopic[],
  limit: number = 5
) {
  const studentsWithScores = students.map(student => ({
    ...student,
    totalPercentage: calculateTotalScore(student.student_scores, allSubTopics).percentage,
  }));
  
  return studentsWithScores
    .sort((a, b) => b.totalPercentage - a.totalPercentage)
    .slice(0, limit)
    .map((student, index) => ({
      student_id: student.id,
      student_name: student.name,
      total_percentage: student.totalPercentage,
      rank: index + 1,
    }));
}

/**
 * Get bottom performers (students who need attention)
 */
export function getBottomPerformers(
  students: StudentWithScores[],
  allSubTopics: SubTopic[],
  limit: number = 5,
  threshold: number = 50
) {
  const studentsWithScores = students.map(student => ({
    ...student,
    totalPercentage: calculateTotalScore(student.student_scores, allSubTopics).percentage,
  }));
  
  return studentsWithScores
    .filter(s => s.totalPercentage < threshold)
    .sort((a, b) => a.totalPercentage - b.totalPercentage)
    .slice(0, limit)
    .map(student => ({
      student_id: student.id,
      student_name: student.name,
      total_percentage: student.totalPercentage,
      class_id: student.class_id,
    }));
}

/**
 * Calculate sub-topic average across all students
 */
export function calculateSubTopicAverage(
  students: StudentWithScores[],
  subTopicId: string,
  subTopics: SubTopic[]
): number {
  const subTopic = subTopics.find(st => st.id === subTopicId);
  if (!subTopic) return 0;
  
  const scores = students
    .map(s => s.student_scores.find(score => score.sub_topic_id === subTopicId))
    .filter((score): score is StudentScore => score !== undefined);
  
  if (scores.length === 0) return 0;
  
  const totalPercentage = scores.reduce((sum, score) => {
    const percentage = (score.score / subTopic.max_score) * 100;
    return sum + percentage;
  }, 0);
  
  return Number((totalPercentage / scores.length).toFixed(2));
}

/**
 * Prepare radar chart data
 */
export function prepareRadarChartData(
  students: StudentWithScores[],
  subjects: Subject[],
  allSubTopics: SubTopic[],
  compareToSchoolAverage: boolean = false,
  allStudents?: StudentWithScores[]
) {
  return subjects.map(subject => {
    // Calculate class/student average
    const classScores = students.map(student => {
      const { percentage } = calculateSubjectScore(student.student_scores, subject.id, allSubTopics);
      return percentage;
    });
    const classAvg = classScores.length > 0 
      ? classScores.reduce((sum, p) => sum + p, 0) / classScores.length 
      : 0;
    
    // Calculate school average if needed
    let schoolAvg = classAvg;
    if (compareToSchoolAverage && allStudents) {
      const schoolScores = allStudents.map(student => {
        const { percentage } = calculateSubjectScore(student.student_scores, subject.id, allSubTopics);
        return percentage;
      });
      schoolAvg = schoolScores.length > 0
        ? schoolScores.reduce((sum, p) => sum + p, 0) / schoolScores.length
        : 0;
    }
    
    return {
      subject: subject.code,
      studentScore: Number(classAvg.toFixed(1)),
      classAverage: Number(schoolAvg.toFixed(1)),
      fullMark: 100,
    };
  });
}

/**
 * Prepare heatmap data (students x sub-topics)
 */
export function prepareHeatmapData(
  students: StudentWithScores[],
  subjectId: string | null,
  allSubTopics: SubTopic[]
) {
  const relevantSubTopics = subjectId 
    ? allSubTopics.filter(st => st.subject_id === subjectId)
    : allSubTopics;
  
  return students.map(student => ({
    studentId: student.id,
    studentName: student.name,
    classId: student.class_id,
    scores: relevantSubTopics.map(subTopic => {
      const score = student.student_scores.find(s => s.sub_topic_id === subTopic.id);
      const percentage = score ? (score.score / subTopic.max_score) * 100 : 0;
      
      return {
        subTopicId: subTopic.id,
        subTopicName: subTopic.name,
        score: score?.score || 0,
        maxScore: subTopic.max_score,
        percentage: Number(percentage.toFixed(1)),
      };
    }),
  }));
}

/**
 * Get score color based on percentage
 */
export function getScoreColor(percentage: number): string {
  if (percentage >= 80) return 'text-emerald-600';
  if (percentage >= 60) return 'text-amber-600';
  return 'text-red-500';
}

/**
 * Get score badge variant
 */
export function getScoreBadge(percentage: number): { label: string; className: string } {
  if (percentage >= 80) return { label: 'Excellent', className: 'bg-emerald-100 text-emerald-700' };
  if (percentage >= 70) return { label: 'Good', className: 'bg-blue-100 text-blue-700' };
  if (percentage >= 60) return { label: 'Fair', className: 'bg-amber-100 text-amber-700' };
  return { label: 'Needs Work', className: 'bg-red-100 text-red-700' };
}

/**
 * Format date for display
 */
export function formatExamDate(dateString: string | null): string {
  if (!dateString) return 'ไม่ระบุ';
  
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

/**
 * Generate student ID
 */
export function generateStudentId(existingStudents: { id: string }[]): string {
  const maxId = existingStudents.reduce((max, s) => {
    const num = parseInt(s.id.replace('STU', ''));
    return num > max ? num : max;
  }, 0);
  
  return `STU${String(maxId + 1).padStart(4, '0')}`;
}
