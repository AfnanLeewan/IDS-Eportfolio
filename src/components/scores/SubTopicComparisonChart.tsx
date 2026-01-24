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
import { Checkbox } from "@/components/ui/checkbox";
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
  const [displayOptions, setDisplayOptions] = useState({
      showMax: true,
      showAvg: true,
      showMin: true
  });

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



  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3">
          <p className="font-medium text-foreground">{data.fullName}</p>
          <p className="text-sm text-muted-foreground">
            สูงสุด: <span className="font-semibold text-primary">{data.maxScore}%</span>
          </p>
                    <p className="text-sm text-muted-foreground">
            เฉลี่ย: <span className="font-semibold text-foreground">{data.average}%</span>
          </p>
          <p className="text-sm text-muted-foreground">
            ต่ำสุด: <span className="font-semibold text-destructive">{data.minScore}%</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {data.studentCount} นักเรียน
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
              <CardTitle className="text-lg">เปรียบเทียบคะแนนหัวข้อย่อย</CardTitle>
              <p className="text-sm text-muted-foreground">
                คะแนนเฉลี่ยแยกตามหัวข้อย่อยของวิชาที่เลือก
              </p>
            </div>
          </div>
          <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
            <SelectTrigger className="w-[180px] rounded-xl">
              <SelectValue placeholder="เลือกวิชา" />
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
                
                {displayOptions.showMax && (
                  <Bar
                    dataKey="maxScore"
                    name="คะแนนสูงสุด"
                    fill="hsl(var(--success))"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={20}
                  />
                )}
                {displayOptions.showAvg && (
                  <Bar
                    dataKey="average"
                    name="ค่าเฉลี่ยห้อง"
                    fill="#002D56"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={20}
                  />
                )}
                {displayOptions.showMin && (
                  <Bar
                    dataKey="minScore"
                    name="คะแนนต่ำสุด"
                    fill="hsl(var(--destructive))"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={20}
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="flex justify-center gap-6 mt-4 pt-2 border-t">
             <div className="flex items-center space-x-2">
                <Checkbox 
                  id="showMax" 
                  checked={displayOptions.showMax} 
                  onCheckedChange={(checked) => setDisplayOptions(prev => ({ ...prev, showMax: !!checked }))}
                  className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                />
                <label
                  htmlFor="showMax"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  คะแนนสูงสุด
                </label>
             </div>

             <div className="flex items-center space-x-2">
                <Checkbox 
                  id="showAvg" 
                  checked={displayOptions.showAvg}
                  onCheckedChange={(checked) => setDisplayOptions(prev => ({ ...prev, showAvg: !!checked }))}
                  className="data-[state=checked]:bg-[#002D56] data-[state=checked]:border-[#002D56]"
                />
                <label
                  htmlFor="showAvg"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  ค่าเฉลี่ยห้อง
                </label>
             </div>

             <div className="flex items-center space-x-2">
                <Checkbox 
                  id="showMin" 
                  checked={displayOptions.showMin}
                  onCheckedChange={(checked) => setDisplayOptions(prev => ({ ...prev, showMin: !!checked }))}
                  className="data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
                />
                <label
                  htmlFor="showMin"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  คะแนนต่ำสุด
                </label>
             </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
