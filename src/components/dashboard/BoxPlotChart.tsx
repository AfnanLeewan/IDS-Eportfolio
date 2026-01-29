import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { calculateSubjectScore, getStudentTotalScore } from "@/lib/score-utils";

interface BoxPlotChartProps {
  selectedSubject: string;
  selectedClass: string;
  students: any[];
  classes: any[];
  subjects: any[];
}

interface BoxPlotData {
  className: string;
  classId: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  mean: number;
  outliers: number[];
}

function calculateQuartiles(values: number[]): { q1: number; median: number; q3: number } {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];

  const lowerHalf = sorted.slice(0, Math.floor(n / 2));
  const upperHalf = n % 2 === 0 ? sorted.slice(n / 2) : sorted.slice(Math.floor(n / 2) + 1);

  const q1 = lowerHalf.length > 0
    ? lowerHalf.length % 2 === 0
      ? (lowerHalf[lowerHalf.length / 2 - 1] + lowerHalf[lowerHalf.length / 2]) / 2
      : lowerHalf[Math.floor(lowerHalf.length / 2)]
    : 0;

  const q3 = upperHalf.length > 0
    ? upperHalf.length % 2 === 0
      ? (upperHalf[upperHalf.length / 2 - 1] + upperHalf[upperHalf.length / 2]) / 2
      : upperHalf[Math.floor(upperHalf.length / 2)]
    : 0;

  return { q1, median, q3 };
}

export function BoxPlotChart({ selectedSubject, selectedClass, students, classes, subjects }: BoxPlotChartProps) {
  const boxPlotData = useMemo(() => {
    // Determine which classes to show
    const classesToShow = selectedClass === "all" 
      ? classes 
      : classes.filter(c => c.class_id === selectedClass || c.id === selectedClass); // Handle both formats

    return classesToShow.map((classGroup: any): BoxPlotData => {
      // Filter students for this class
      const classId = classGroup.class_id || classGroup.id;
      const classStudents = students.filter((s) => s.classId === classId);

      const scores = classStudents.map((student) => {
        if (selectedSubject === "all") {
          return getStudentTotalScore(student, subjects).percentage;
        } else {
          const subject = subjects.find(s => s.id === selectedSubject);
          return subject ? calculateSubjectScore(student, subject).percentage : 0;
        }
      });

      if (scores.length === 0) {
        return {
          className: classGroup.class_name || classGroup.name,
          classId: classId,
          min: 0,
          q1: 0,
          median: 0,
          q3: 0,
          max: 0,
          mean: 0,
          outliers: [],
        };
      }

      const sorted = [...scores].sort((a, b) => a - b);
      const { q1, median, q3 } = calculateQuartiles(scores);
      const iqr = q3 - q1;
      const lowerBound = q1 - 1.5 * iqr;
      const upperBound = q3 + 1.5 * iqr;

      const outliers = sorted.filter((v) => v < lowerBound || v > upperBound);
      const nonOutliers = sorted.filter((v) => v >= lowerBound && v <= upperBound);

      return {
        className: classGroup.class_name || classGroup.name,
        classId: classId,
        min: nonOutliers.length > 0 ? nonOutliers[0] : sorted[0],
        q1,
        median,
        q3,
        max: nonOutliers.length > 0 ? nonOutliers[nonOutliers.length - 1] : sorted[sorted.length - 1],
        mean: scores.reduce((a, b) => a + b, 0) / scores.length,
        outliers,
      };
    });
  }, [selectedSubject, selectedClass, students, classes, subjects]);

  const subjectName = selectedSubject === "all"
    ? "Overall"
    : subjects.find(s => s.id === selectedSubject)?.name || "Unknown";

  const maxValue = 100;
  const chartHeight = 200;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <Card className="shadow-card border-0 rounded-2xl h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Class เปรียบเทียบผลคะแนนระหว่างห้องเรียน - {subjectName}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Box & Whisker plot แสดงการกระจายตัวของคะแนนในแต่ละห้องเรียน
          </p>
        </CardHeader>
        <CardContent>
          <div className="relative" style={{ height: chartHeight + 60 }}>
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-muted-foreground pb-8">
              <span>100%</span>
              <span>75%</span>
              <span>50%</span>
              <span>25%</span>
              <span>0%</span>
            </div>

            {/* Chart area */}
            <div className="ml-10 h-full flex items-end justify-around gap-4 pb-8">
              {boxPlotData.map((data, index) => {
                const boxWidth = 60;
                const getY = (value: number) => chartHeight - (value / maxValue) * chartHeight;

                return (
                  <motion.div
                    key={data.classId}
                    initial={{ opacity: 0, scaleY: 0 }}
                    animate={{ opacity: 1, scaleY: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative flex flex-col items-center"
                    style={{ width: boxWidth }}
                  >
                    {/* SVG for box plot */}
                    <svg
                      width={boxWidth}
                      height={chartHeight}
                      className="overflow-visible"
                    >
                      {/* Vertical line (whisker) */}
                      <line
                        x1={boxWidth / 2}
                        y1={getY(data.max)}
                        x2={boxWidth / 2}
                        y2={getY(data.min)}
                        stroke="hsl(var(--muted-foreground))"
                        strokeWidth={1}
                      />

                      {/* Max cap */}
                      <line
                        x1={boxWidth / 4}
                        y1={getY(data.max)}
                        x2={(boxWidth * 3) / 4}
                        y2={getY(data.max)}
                        stroke="hsl(var(--muted-foreground))"
                        strokeWidth={1}
                      />

                      {/* Min cap */}
                      <line
                        x1={boxWidth / 4}
                        y1={getY(data.min)}
                        x2={(boxWidth * 3) / 4}
                        y2={getY(data.min)}
                        stroke="hsl(var(--muted-foreground))"
                        strokeWidth={1}
                      />

                      {/* Box (Q1 to Q3) */}
                      <rect
                        x={4}
                        y={getY(data.q3)}
                        width={boxWidth - 8}
                        height={Math.max(getY(data.q1) - getY(data.q3), 1)}
                        fill={`hsl(var(--chart-${(index % 5) + 1}))`}
                        fillOpacity={0.6}
                        stroke={`hsl(var(--chart-${(index % 5) + 1}))`}
                        strokeWidth={2}
                        rx={4}
                      />

                      {/* Median line */}
                      <line
                        x1={4}
                        y1={getY(data.median)}
                        x2={boxWidth - 4}
                        y2={getY(data.median)}
                        stroke="hsl(var(--foreground))"
                        strokeWidth={2}
                      />

                      {/* Mean diamond */}
                      <polygon
                        points={`${boxWidth / 2},${getY(data.mean) - 5} ${boxWidth / 2 + 5},${getY(data.mean)} ${boxWidth / 2},${getY(data.mean) + 5} ${boxWidth / 2 - 5},${getY(data.mean)}`}
                        fill="hsl(var(--primary))"
                      />

                      {/* Outliers */}
                      {data.outliers.map((outlier, i) => (
                        <circle
                          key={i}
                          cx={boxWidth / 2}
                          cy={getY(outlier)}
                          r={4}
                          fill="hsl(var(--destructive))"
                          fillOpacity={0.7}
                        />
                      ))}
                    </svg>

                    {/* Class name label */}
                    <span className="mt-2 text-sm font-medium">{data.className}</span>
                    <span className="text-xs text-muted-foreground">
                      μ={data.mean.toFixed(1)}%
                    </span>
                  </motion.div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="absolute bottom-0 right-0 flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-3 h-[2px] bg-foreground"></div>
                <span>Median</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-primary rotate-45"></div>
                <span>Mean</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-destructive rounded-full"></div>
                <span>Outliers</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
