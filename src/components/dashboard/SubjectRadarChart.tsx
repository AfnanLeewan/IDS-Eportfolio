import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RadarDataPoint {
  subject: string;
  studentScore: number;
  classAverage: number;
  fullMark: number;
}

interface SubjectRadarChartProps {
  data: RadarDataPoint[];
  studentName?: string;
  className?: string;
}

export function SubjectRadarChart({
  data,
  studentName,
  className,
}: SubjectRadarChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Card className={`shadow-card border-0 rounded-2xl ${className}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">
            Subject Balance
            {studentName && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                — {studentName}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                <PolarGrid
                  stroke="hsl(var(--border))"
                  strokeDasharray="3 3"
                />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
                  tickLine={false}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  tickCount={5}
                />
                <Radar
                  name="Your Score"
                  dataKey="studentScore"
                  stroke="#10B981"
                  fill="#10B981"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Radar
                  name="Class Average"
                  dataKey="classAverage"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.15}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
                <Legend
                  wrapperStyle={{ paddingTop: "20px" }}
                  formatter={(value) => (
                    <span className="text-sm text-foreground">{value}</span>
                  )}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
