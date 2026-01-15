import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Grid3X3, User } from "lucide-react";
import {
  preALevelProgram,
  getSubjectScore,
  Student,
} from "@/lib/mockData";

interface SubTopicHeatmapProps {
  students: Student[];
  selectedSubject: string;
  onStudentClick: (student: Student) => void;
}

function getHeatmapColor(percentage: number): string {
  if (percentage >= 80) return "bg-success";
  if (percentage >= 60) return "bg-success/60";
  if (percentage >= 50) return "bg-warning";
  if (percentage >= 30) return "bg-warning/60";
  return "bg-destructive";
}

function getHeatmapTextColor(percentage: number): string {
  if (percentage >= 80) return "text-success-foreground";
  if (percentage >= 60) return "text-success-foreground";
  if (percentage >= 50) return "text-warning-foreground";
  if (percentage >= 30) return "text-warning-foreground";
  return "text-destructive-foreground";
}

export function SubTopicHeatmap({ students, selectedSubject, onStudentClick }: SubTopicHeatmapProps) {
  const heatmapData = useMemo(() => {
    const subjectsToShow = selectedSubject === "all"
      ? preALevelProgram.subjects
      : preALevelProgram.subjects.filter(s => s.id === selectedSubject);

    const subTopics = subjectsToShow.flatMap(subject =>
      subject.subTopics.map(st => ({
        ...st,
        subjectCode: subject.code,
        subjectName: subject.name,
      }))
    );

    const studentData = students.map(student => {
      const scores = subTopics.map(subTopic => {
        const scoreEntry = student.scores.find(s => s.subTopicId === subTopic.id);
        const percentage = scoreEntry ? (scoreEntry.score / subTopic.maxScore) * 100 : 0;
        return {
          subTopicId: subTopic.id,
          percentage,
          score: scoreEntry?.score || 0,
          maxScore: subTopic.maxScore,
        };
      });

      return {
        student,
        scores,
      };
    });

    // Calculate column averages for insights
    const columnAverages = subTopics.map((subTopic, index) => {
      const avg = studentData.reduce((acc, sd) => acc + sd.scores[index].percentage, 0) / studentData.length;
      return { subTopicId: subTopic.id, average: avg };
    });

    return {
      subTopics,
      studentData,
      columnAverages,
    };
  }, [students, selectedSubject]);

  // Find problematic sub-topics (column average < 50%)
  const problematicSubTopics = heatmapData.columnAverages.filter(ca => ca.average < 50);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="shadow-card border-0 rounded-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Grid3X3 className="h-5 w-5 text-primary" />
                Sub-topic Mastery Heatmap
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Click on a row to view student details • Red columns indicate topics needing class-wide review
              </p>
            </div>
            {problematicSubTopics.length > 0 && (
              <Badge variant="destructive" className="gap-1">
                {problematicSubTopics.length} topics below 50%
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full">
            <div className="min-w-max">
              {/* Header row with sub-topic names */}
              <div className="flex border-b border-border/50 pb-2 mb-2">
                <div className="w-40 shrink-0 font-medium text-sm text-muted-foreground pr-2">
                  Student
                </div>
                {heatmapData.subTopics.map((subTopic, index) => {
                  const colAvg = heatmapData.columnAverages[index].average;
                  const isProblematic = colAvg < 50;
                  return (
                    <div
                      key={subTopic.id}
                      className={`w-16 shrink-0 text-center px-1 ${isProblematic ? "bg-destructive/10 rounded-t-lg" : ""}`}
                    >
                      <div className="text-xs font-medium truncate" title={subTopic.name}>
                        {subTopic.name.slice(0, 8)}...
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {subTopic.subjectCode}
                      </div>
                      <div className={`text-[10px] font-medium ${isProblematic ? "text-destructive" : "text-muted-foreground"}`}>
                        {colAvg.toFixed(0)}%
                      </div>
                    </div>
                  );
                })}
                <div className="w-20 shrink-0 text-center font-medium text-sm text-muted-foreground">
                  Avg
                </div>
              </div>

              {/* Student rows */}
              {heatmapData.studentData.map((row, rowIndex) => {
                const studentAvg = row.scores.reduce((a, b) => a + b.percentage, 0) / row.scores.length;
                const isWeakStudent = studentAvg < 50;

                return (
                  <motion.div
                    key={row.student.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: rowIndex * 0.02 }}
                    className={`flex items-center py-1 border-b border-border/20 cursor-pointer hover:bg-muted/50 transition-colors rounded-lg ${isWeakStudent ? "bg-destructive/5" : ""}`}
                    onClick={() => onStudentClick(row.student)}
                  >
                    <div className="w-40 shrink-0 pr-2 flex items-center gap-2">
                      <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${isWeakStudent ? "bg-destructive/10" : "bg-muted"}`}>
                        <User className={`h-3 w-3 ${isWeakStudent ? "text-destructive" : "text-muted-foreground"}`} />
                      </div>
                      <div className="truncate">
                        <span className="text-sm font-medium">{row.student.name}</span>
                      </div>
                    </div>

                    {row.scores.map((score, colIndex) => {
                      const isProblematicCol = heatmapData.columnAverages[colIndex].average < 50;
                      return (
                        <div
                          key={`${row.student.id}-${heatmapData.subTopics[colIndex].id}`}
                          className={`w-16 shrink-0 px-1 ${isProblematicCol ? "bg-destructive/5" : ""}`}
                        >
                          <div
                            className={`h-8 rounded-md flex items-center justify-center text-xs font-medium ${getHeatmapColor(score.percentage)} ${getHeatmapTextColor(score.percentage)}`}
                            title={`${score.score}/${score.maxScore} (${score.percentage.toFixed(1)}%)`}
                          >
                            {score.percentage.toFixed(0)}
                          </div>
                        </div>
                      );
                    })}

                    <div className="w-20 shrink-0 text-center">
                      <Badge
                        variant={studentAvg >= 60 ? "default" : studentAvg >= 50 ? "secondary" : "destructive"}
                        className="text-xs"
                      >
                        {studentAvg.toFixed(1)}%
                      </Badge>
                    </div>
                  </motion.div>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          {/* Legend */}
          <div className="mt-6 pt-4 border-t border-border/50">
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
              <span className="text-muted-foreground">Score Legend:</span>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded bg-destructive"></div>
                <span>&lt;30%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded bg-warning/60"></div>
                <span>30-50%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded bg-warning"></div>
                <span>50-60%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded bg-success/60"></div>
                <span>60-80%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded bg-success"></div>
                <span>≥80%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
