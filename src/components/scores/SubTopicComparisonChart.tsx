import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Student, Subject, preALevelProgram } from "@/lib/mockData";

interface SubTopicComparisonChartProps {
  students: Student[];
  subjects?: Subject[];
  className?: string;
}

export function SubTopicComparisonChart({
  students,
  subjects = preALevelProgram.subjects,
  className,
}: SubTopicComparisonChartProps) {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    subjects[0]?.id || ""
  );

  const selectedSubject = useMemo(() => {
    return subjects.find((s) => s.id === selectedSubjectId) || subjects[0];
  }, [subjects, selectedSubjectId]);

  const chartData = useMemo(() => {
    if (!selectedSubject || students.length === 0) return [];

    return selectedSubject.subTopics.map((subTopic) => {
      // Calculate scores for this sub-topic across all students
      const scoresForSubTopic = students
        .map((student) => {
          const score = student.scores.find((s) => s.subTopicId === subTopic.id);
          return score ? (score.score / subTopic.maxScore) * 100 : null;
        })
        .filter((s): s is number => s !== null);

      const average =
        scoresForSubTopic.length > 0
          ? scoresForSubTopic.reduce((acc, s) => acc + s, 0) / scoresForSubTopic.length
          : 0;

      const maxScore = scoresForSubTopic.length > 0 ? Math.max(...scoresForSubTopic) : 0;
      const minScore = scoresForSubTopic.length > 0 ? Math.min(...scoresForSubTopic) : 0;

      // Abbreviate long names
      const abbreviatedName =
        subTopic.name.length > 12
          ? subTopic.name.substring(0, 10) + "..."
          : subTopic.name;

      return {
        name: abbreviatedName,
        fullName: subTopic.name,
        average: Math.round(average * 10) / 10,
        maxScore: Math.round(maxScore * 10) / 10,
        minScore: Math.round(minScore * 10) / 10,
        studentCount: scoresForSubTopic.length,
      };
    });
  }, [selectedSubject, students]);

  const getBarColor = (value: number) => {
    if (value >= 80) return "hsl(160, 84%, 39%)"; // emerald
    if (value >= 60) return "hsl(43, 96%, 56%)"; // amber
    return "hsl(0, 84%, 60%)"; // red
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3">
          <p className="font-medium text-foreground">{data.fullName}</p>
          <p className="text-sm text-muted-foreground">
            Average: <span className="font-semibold text-foreground">{data.average}%</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Max: <span className="font-semibold text-primary">{data.maxScore}%</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Min: <span className="font-semibold text-destructive">{data.minScore}%</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {data.studentCount} students
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      <Card className="border-0 shadow-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Sub-topic Score Comparison</CardTitle>
              <p className="text-sm text-muted-foreground">
                Average scores by sub-topic for selected subject
              </p>
            </div>
          </div>
          <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
            <SelectTrigger className="w-[180px] rounded-xl">
              <SelectValue placeholder="Select Subject" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  className="text-muted-foreground"
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${value}%`}
                  className="text-muted-foreground"
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: 10 }} />
                <Bar
                  dataKey="maxScore"
                  name="Max Score"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={30}
                />
                <Bar
                  dataKey="average"
                  name="Class Average"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={30}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.average)} />
                  ))}
                </Bar>
                <Bar
                  dataKey="minScore"
                  name="Min Score"
                  fill="hsl(var(--destructive))"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={30}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Score Legend */}
          <div className="flex items-center justify-center gap-6 pt-4 border-t border-border mt-4">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: "hsl(0, 84%, 60%)" }} />
              <span className="text-xs text-muted-foreground">{"<60%"}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: "hsl(43, 96%, 56%)" }} />
              <span className="text-xs text-muted-foreground">60-80%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: "hsl(160, 84%, 39%)" }} />
              <span className="text-xs text-muted-foreground">≥80%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
