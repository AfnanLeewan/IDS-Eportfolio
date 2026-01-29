import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, TrendingUp } from 'lucide-react';
import { useAssessments, useYearClasses, useSubjectWithTopics, useSubTopics, useClassScores, useCurrentAcademicYear } from '@/hooks/useSupabaseData';

interface ScoreTrendDashboardProps {
  programId: string;
  studentId?: string; // Optional: If provided, shows only this student's trend
}

export function ScoreTrendDashboard({ programId, studentId }: ScoreTrendDashboardProps) {
  const { data: currentYear } = useCurrentAcademicYear();
  /* Safe cast to avoid never[] inference */
  const { data: assessmentsData = [] } = useAssessments(programId);
  const assessments = assessmentsData as any[];
  
  const { data: classes = [] } = useYearClasses(currentYear?.id || '');
  const { data: subjectsWithTopics = [] } = useSubjectWithTopics(programId);
  const subjects = subjectsWithTopics; // Now contains sub_topics

  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all'); // Default to all
  const [selectedSubTopicId, setSelectedSubTopicId] = useState<string>('total');

  // We still need this for specific subject subtopics, OR we can just derive it from subjectsWithTopics
  // const { data: subTopicsData = [] } = useSubTopics(selectedSubjectId); 
  // Optimization: Just find from the loaded subjects list since we have it all now.
  const subTopics = useMemo(() => {
     if (selectedSubjectId === 'all') return [];
     const sb = subjects.find((s:any) => s.id === selectedSubjectId);
     return sb ? sb.sub_topics || [] : [];
  }, [selectedSubjectId, subjects]);
  
  // Fetch scores for the selected class (or all if we handle 'all' properly in hook or logic)
  // Currently useClassScores handles 'all' effectively if backend supports it or we fetch per class.
  // Assuming 'all' works or we force class selection. Let's force class selection for performance if 'all' is heavy.
  // But usually users want to see class average.
  
  const { data: studentScores = [], isLoading: scoresLoading } = useClassScores(selectedClassId);

  // Auto-select first subject/class - REMOVED, defaulting to 'all' is better
  /*
  useMemo(() => {
    if (subjects.length > 0 && !selectedSubjectId) {
        setSelectedSubjectId(subjects[0].id);
    }
  }, [subjects]);
  */

  // Transform data for chart
  const chartData = useMemo(() => {
    if (!assessments.length || !studentScores.length || !selectedSubjectId) return [];

    return assessments.map(assessment => {
      // Find scores for this assessment
      // Structure of studentScores: { id, student_scores: [...] }
      
      let totalPercentage = 0;
      let count = 0;
      let maxP = 0;
      let minP = 100;
      let specificStudentP = 0; // For student mode

      // Filter scores for this assessment
      // If studentId is provided, we still need to calculate the student's score
      // We can use the same map logic but extract the specific student.
      
      const assessmentPoints = studentScores.map(student => {
        const scores = student.student_scores?.filter((s: any) => s.assessment_id === assessment.id) || [];
        
        let score = 0;
        let maxScore = 0;


        if (selectedSubjectId === 'all') {
            // Aggregate ALL subjects
            // We iterate through ALL subjects in the program
            subjects.forEach((subj: any) => {
                const subjSubTopics = subj.sub_topics || [];
                subjSubTopics.forEach((st: any) => {
                     // Find score for this subtopic
                     const s = scores.find((sc: any) => sc.sub_topic_id === st.id);
                     if (s) {
                        score += s.score || 0;
                     }
                     // Always add max score if it's part of the curriculum? 
                     // Or only if student has a score? 
                     // Usually for "Trend", we want vs คะแนนรวม Possible.
                     maxScore += st.max_score || 0;
                });
            });
        } else if (selectedSubTopicId === 'total') {
            // Aggregate all subtopics for the SPECIFIC subject
            // Need to know which subtopics belong to the subject. 
            // We use the subTopics derived from selection.
            const validSubTopicIds = new Set(subTopics.map((st:any) => st.id));
            
            scores.forEach((s: any) => {
                if (validSubTopicIds.has(s.sub_topic_id)) {
                    score += s.score || 0;
                }
            });
            // Calculate คะแนนเต็ม from metadata
            subTopics.forEach((st: any) => {
                maxScore += st.max_score || 0;
            });

        } else {
            // Specific subtopic
            const s = scores.find((s: any) => s.sub_topic_id === selectedSubTopicId);
            if (s) {
                score = s.score;
                const st = subTopics.find((st:any) => st.id === selectedSubTopicId);
                maxScore = st ? st.max_score : 0;
            }
        }

        if (maxScore > 0) {
            return (score / maxScore) * 100;
        }
        return null;
      }).filter((v: number | null) => v !== null) as number[];

      // If in student mode, find the specific student's score percentage
      if (studentId) {
          const studentData = studentScores.find((s:any) => s.id === studentId);
          if (studentData) {
               // Reuse logic? Or replicate? Replicating specifically for simpler extraction:
               const scores = studentData.student_scores?.filter((s: any) => s.assessment_id === assessment.id) || [];
               let myScore = 0;
               let myMax = 0;
               
               if (selectedSubjectId === 'all') {
                  subjects.forEach((subj: any) => {
                      (subj.sub_topics || []).forEach((st: any) => {
                          const s = scores.find((sc: any) => sc.sub_topic_id === st.id);
                          if (s) myScore += s.score || 0;
                          myMax += st.max_score || 0;
                      });
                  });
               } else if (selectedSubTopicId === 'total') {
                   const validSubTopicIds = new Set(subTopics.map((st:any) => st.id));
                   scores.forEach((s: any) => {
                       if (validSubTopicIds.has(s.sub_topic_id)) myScore += s.score || 0;
                   });
                   subTopics.forEach((st: any) => myMax += st.max_score || 0);
               } else {
                   const s = scores.find((s: any) => s.sub_topic_id === selectedSubTopicId);
                   if (s) {
                       myScore = s.score;
                       const st = subTopics.find((st:any) => st.id === selectedSubTopicId);
                       myMax = st ? st.max_score : 0;
                   }
               }
               
               if (myMax > 0) specificStudentP = (myScore / myMax) * 100;
          }
      }

      if (assessmentPoints.length > 0) {
          const sum = assessmentPoints.reduce((a, b) => a + b, 0);
          totalPercentage = sum / assessmentPoints.length;
          maxP = Math.max(...assessmentPoints);
          minP = Math.min(...assessmentPoints);
          count = assessmentPoints.length;
      } else {
          minP = 0;
      }

      return {
        name: assessment.title,
        average: count > 0 ? parseFloat(totalPercentage.toFixed(1)) : 0,
        max: count > 0 ? parseFloat(maxP.toFixed(1)) : 0,
        min: count > 0 ? parseFloat(minP.toFixed(1)) : 0,
        studentScore: parseFloat(specificStudentP.toFixed(1)),
        count
      };
    }).reverse(); // Reverse to show Oldest -> Newest (Left -> Right)
  }, [assessments, studentScores, selectedSubjectId, selectedSubTopicId, subTopics, studentId]); // Added studentId dependency

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle>แนวโน้มคะแนน </CardTitle>
          </div>
          <div className="flex gap-2">
            {!studentId && (
             <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="เลือกห้องเรียน" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกห้องเรียน</SelectItem>
                  {classes.map((c: any) => (
                    <SelectItem key={c.class_id} value={c.class_id}>{c.class_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

              <Select value={selectedSubjectId} onValueChange={(val) => { setSelectedSubjectId(val); setSelectedSubTopicId('total'); }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="เลือกวิชา" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">รวมทุกวิชา  </SelectItem>
                  {subjects.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedSubTopicId} onValueChange={setSelectedSubTopicId} disabled={selectedSubjectId === 'all' || !selectedSubjectId}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="บทเรียน" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="total">รวมทุกบทเรียน  </SelectItem>
                  {subTopics.map((st: any) => (
                    <SelectItem key={st.id} value={st.id}>{st.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {scoresLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>
        ) : (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} label={{ value: '% คะแนน', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  {!studentId && (
                    <>
                        <Line type="monotone" dataKey="max" stroke="#10b981" name="คะแนนสูงสุด" />
                        <Line type="monotone" dataKey="average" stroke="#3b82f6" name="ค่าเฉลี่ย" activeDot={{ r: 8 }} />
                        <Line type="monotone" dataKey="min" stroke="#ef4444" name="คะแนนต่ำสุด" />
                    </>
                  )}
                  {studentId && (
                    <Line type="monotone" dataKey="studentScore" stroke="#8b5cf6" name="คะแนนของคุณ" strokeWidth={2} activeDot={{ r: 6 }} />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
