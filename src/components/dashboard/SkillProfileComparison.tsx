import { Target, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Student,
  preALevelProgram,
  mockStudents,
  getSubjectScore,
  getClassAverage,
  getTotalScore,
} from "@/lib/mockData";

interface SkillProfileComparisonProps {
  student: Student;
}

export function SkillProfileComparison({ student }: SkillProfileComparisonProps) {
  // Calculate class students
  const classStudents = mockStudents.filter((s) => s.classId === student.classId);
  
  // Get top 10% threshold
  const allClassScores = classStudents.map((s) => getTotalScore(s).percentage);
  const sortedScores = [...allClassScores].sort((a, b) => b - a);
  const top10Index = Math.ceil(classStudents.length * 0.1);
  const top10Students = classStudents
    .map((s) => ({ student: s, total: getTotalScore(s).percentage }))
    .sort((a, b) => b.total - a.total)
    .slice(0, top10Index);

  // Calculate top 10% average for each subject
  const getTop10Average = (subjectId: string): number => {
    if (top10Students.length === 0) return 0;
    const total = top10Students.reduce((acc, { student: s }) => {
      return acc + getSubjectScore(s, subjectId).percentage;
    }, 0);
    return total / top10Students.length;
  };

  // Build chart data
  const chartData = preALevelProgram.subjects.map((subject) => ({
    subject: subject.code,
    Student: Math.round(getSubjectScore(student, subject.id).percentage),
    "ค่าเฉลี่ยห้อง": Math.round(getClassAverage(student.classId, subject.id)),
    "Top 10%": Math.round(getTop10Average(subject.id)),
  }));

  // Check if student is in top 10%
  const studentTotal = getTotalScore(student).percentage;
  const top10Threshold = sortedScores[top10Index - 1] || sortedScores[0];
  const isInTop10 = studentTotal >= top10Threshold;

  // Calculate gap to top 10% average
  const studentOverallAvg = chartData.reduce((acc, d) => acc + d.Student, 0) / chartData.length;
  const top10OverallAvg = chartData.reduce((acc, d) => acc + d["Top 10%"], 0) / chartData.length;
  const gapToTop10 = top10OverallAvg - studentOverallAvg;

  return (
    <Card className="shadow-card border-0 rounded-2xl">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg font-semibold">
            เปรียบเทียบผลการเรียน
          </CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          ผลการเรียนของนักเรียนเทียบกับค่าเฉลี่ยของห้องและกลุ่ม Top 10%
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="subject" 
                tick={{ fontSize: 12 }}
                axisLine={{ stroke: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                domain={[0, 100]} 
                tick={{ fontSize: 12 }}
                axisLine={{ stroke: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.5rem",
                }}
              />
              <Legend />
              <Bar 
                dataKey="นักเรียน" 
                fill="hsl(var(--primary))" 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="ค่าเฉลี่ยห้อง" 
                fill="hsl(var(--muted-foreground))" 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="Top 10%" 
                fill="hsl(var(--success))" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Gap to Top 10% Footer */}
        <div className="mt-4 flex items-center justify-between rounded-xl bg-muted/50 p-4">
          <span className="text-sm font-medium text-muted-foreground">
            Gap to Top 10%
          </span>
          {isInTop10 ? (
            <div className="flex items-center gap-2 text-success">
              <TrendingUp className="h-4 w-4" />
              <span className="font-semibold">Already in Top 10%!</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-warning">
              <span className="font-semibold">-{gapToTop10.toFixed(1)}%</span>
              <span className="text-sm text-muted-foreground">to reach Top 10%</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}