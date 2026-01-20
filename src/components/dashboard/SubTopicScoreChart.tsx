import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import {
  Student,
  Subject,
  preALevelProgram,
  mockStudents,
} from "@/lib/mockData";

interface SubTopicScoreChartProps {
  student?: Student;
  subject: Subject;
  classId?: string;
  showClassComparison?: boolean;
  className?: string;
}

export function SubTopicScoreChart({
  student,
  subject,
  classId,
  showClassComparison = true,
  className,
}: SubTopicScoreChartProps) {
  const chartData = useMemo(() => {
    // Get students in same class for comparison
    const relevantClassId = classId || student?.classId;
    const classStudents = relevantClassId
      ? mockStudents.filter((s) => s.classId === relevantClassId)
      : mockStudents;

    // Calculate top 10% threshold
    const top10Count = Math.max(1, Math.ceil(classStudents.length * 0.1));
    const rankedStudents = [...classStudents].sort((a, b) => {
      const aTotal = subject.subTopics.reduce((sum, st) => {
        const score = a.scores.find((s) => s.subTopicId === st.id)?.score || 0;
        return sum + (score / st.maxScore) * 100;
      }, 0) / subject.subTopics.length;
      const bTotal = subject.subTopics.reduce((sum, st) => {
        const score = b.scores.find((s) => s.subTopicId === st.id)?.score || 0;
        return sum + (score / st.maxScore) * 100;
      }, 0) / subject.subTopics.length;
      return bTotal - aTotal;
    });
    const top10Students = rankedStudents.slice(0, top10Count);

    return subject.subTopics.map((subTopic) => {
      // Student score (if provided)
      const studentScoreEntry = student?.scores.find(
        (s) => s.subTopicId === subTopic.id
      );
      const studentScore = studentScoreEntry
        ? (studentScoreEntry.score / subTopic.maxScore) * 100
        : null;

      // Class average
      const classAvg =
        classStudents.reduce((sum, s) => {
          const scoreEntry = s.scores.find((sc) => sc.subTopicId === subTopic.id);
          return sum + ((scoreEntry?.score || 0) / subTopic.maxScore) * 100;
        }, 0) / classStudents.length;

      // Top 10% average
      const top10Avg =
        top10Students.reduce((sum, s) => {
          const scoreEntry = s.scores.find((sc) => sc.subTopicId === subTopic.id);
          return sum + ((scoreEntry?.score || 0) / subTopic.maxScore) * 100;
        }, 0) / top10Students.length;

      return {
        name: subTopic.name.length > 12 
          ? subTopic.name.substring(0, 12) + "..." 
          : subTopic.name,
        fullName: subTopic.name,
        ...(studentScore !== null && { Student: Math.round(studentScore * 10) / 10 }),
        "Class Avg": Math.round(classAvg * 10) / 10,
        "Top 10%": Math.round(top10Avg * 10) / 10,
      };
    });
  }, [student, subject, classId]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <Card className={`shadow-card border-0 rounded-2xl ${className}`}>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-semibold">
              {subject.name} - Sub-topic Scores
            </CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            {student 
              ? "Your performance vs Class Average vs Top 10%" 
              : "Class Average vs Top 10% by Sub-topic"}
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "hsl(var(--foreground))", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  interval={0}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    boxShadow: "var(--shadow-elevated)",
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                  formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name]}
                  labelFormatter={(label, payload) => {
                    if (payload && payload[0]) {
                      return payload[0].payload.fullName || label;
                    }
                    return label;
                  }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: "10px" }}
                  iconType="square"
                />
                {student && (
                  <Bar 
                    dataKey="Student" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]} 
                    maxBarSize={40}
                  />
                )}
                <Bar 
                  dataKey="Class Avg" 
                  fill="hsl(var(--muted-foreground))" 
                  radius={[4, 4, 0, 0]} 
                  maxBarSize={40}
                />
                <Bar 
                  dataKey="Top 10%" 
                  fill="hsl(var(--success))" 
                  radius={[4, 4, 0, 0]} 
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
