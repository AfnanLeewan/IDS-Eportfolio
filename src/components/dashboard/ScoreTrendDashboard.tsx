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
import { useAssessments, useYearClasses, useSubjects, useSubTopics, useClassScores, useCurrentAcademicYear } from '@/hooks/useSupabaseData';

interface ScoreTrendDashboardProps {
  programId: string;
}

export function ScoreTrendDashboard({ programId }: ScoreTrendDashboardProps) {
  const { data: currentYear } = useCurrentAcademicYear();
  /* Safe cast to avoid never[] inference */
  const { data: assessmentsData = [] } = useAssessments(programId);
  const assessments = assessmentsData as any[];
  
  const { data: classes = [] } = useYearClasses(currentYear?.id || '');
  const { data: subjects = [] } = useSubjects(programId);

  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedSubTopicId, setSelectedSubTopicId] = useState<string>('total');

  const { data: subTopicsData = [] } = useSubTopics(selectedSubjectId);
  const subTopics = subTopicsData as any[];
  
  // Fetch scores for the selected class (or all if we handle 'all' properly in hook or logic)
  // Currently useClassScores handles 'all' effectively if backend supports it or we fetch per class.
  // Assuming 'all' works or we force class selection. Let's force class selection for performance if 'all' is heavy.
  // But usually users want to see class average.
  
  const { data: studentScores = [], isLoading: scoresLoading } = useClassScores(selectedClassId);

  // Auto-select first subject/class
  useMemo(() => {
    if (subjects.length > 0 && !selectedSubjectId) {
        setSelectedSubjectId(subjects[0].id);
    }
  }, [subjects]);

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

      const assessmentPoints = studentScores.map(student => {
        const scores = student.student_scores?.filter((s: any) => s.assessment_id === assessment.id) || [];
        
        let score = 0;
        let maxScore = 0;

        if (selectedSubTopicId === 'total') {
            // Aggregate all subtopics for the subject
            // Need to know which subtopics belong to the subject. 
            // We can filter scores where sub_topic.subject_id === selectedSubjectId
            // OR use the subTopics list we have.
            const validSubTopicIds = new Set(subTopics.map((st:any) => st.id));
            
            scores.forEach((s: any) => {
                if (validSubTopicIds.has(s.sub_topic_id)) {
                    score += s.score || 0;
                    // Max score needs to come from metadata. 
                    // s.score usually doesn't have maxScore unless joined.
                    // useClassScores join includes sub_topic(max_score).
                    // Wait, check useClassScores query.
                    // It selects student_scores(..., sub_topic_id).
                    // Does it select max_score?
                    // Let's assume we need to lookup maxScore from subTopics list.
                     const st = subTopics.find((st:any) => st.id === s.sub_topic_id);
                     if (st) maxScore += st.max_score;
                }
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
        count
      };
    }).reverse(); // Reverse to show Oldest -> Newest (Left -> Right)
  }, [assessments, studentScores, selectedSubjectId, selectedSubTopicId, subTopics]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle>แนวโน้มคะแนน (Score Trends)</CardTitle>
          </div>
          <div className="flex gap-2">
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

              <Select value={selectedSubjectId} onValueChange={(val) => { setSelectedSubjectId(val); setSelectedSubTopicId('total'); }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="เลือกวิชา" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedSubTopicId} onValueChange={setSelectedSubTopicId} disabled={!selectedSubjectId}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="หัวข้อ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="total">รวมทุกหัวข้อ (Total)</SelectItem>
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
                  <YAxis domain={[0, 100]} label={{ value: '% Score', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="max" stroke="#10b981" name="คะแนนสูงสุด" />
                  <Line type="monotone" dataKey="average" stroke="#3b82f6" name="ค่าเฉลี่ย" activeDot={{ r: 8 }} />
                  <Line type="monotone" dataKey="min" stroke="#ef4444" name="คะแนนต่ำสุด" />
                </LineChart>
              </ResponsiveContainer>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
