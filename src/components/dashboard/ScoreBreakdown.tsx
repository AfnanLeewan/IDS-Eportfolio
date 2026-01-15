import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Student, preALevelProgram, getSubjectScore } from "@/lib/mockData";

interface ScoreBreakdownProps {
  student: Student;
  className?: string;
}

export function ScoreBreakdown({ student, className }: ScoreBreakdownProps) {
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());

  const toggleSubject = (subjectId: string) => {
    const newExpanded = new Set(expandedSubjects);
    if (newExpanded.has(subjectId)) {
      newExpanded.delete(subjectId);
    } else {
      newExpanded.add(subjectId);
    }
    setExpandedSubjects(newExpanded);
  };

  const getGradeColor = (percentage: number): string => {
    if (percentage >= 80) return "text-success";
    if (percentage >= 60) return "text-warning";
    return "text-destructive";
  };

  const getGradeBadge = (percentage: number): { label: string; className: string } => {
    if (percentage >= 90) return { label: "A+", className: "bg-success/10 text-success" };
    if (percentage >= 80) return { label: "A", className: "bg-success/10 text-success" };
    if (percentage >= 70) return { label: "B", className: "bg-primary/10 text-primary" };
    if (percentage >= 60) return { label: "C", className: "bg-warning/10 text-warning" };
    if (percentage >= 50) return { label: "D", className: "bg-warning/10 text-warning" };
    return { label: "F", className: "bg-destructive/10 text-destructive" };
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">
          Detailed Score Breakdown
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Click on a subject to view sub-topic scores
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {preALevelProgram.subjects.map((subject) => {
            const subjectScore = getSubjectScore(student, subject.id);
            const isExpanded = expandedSubjects.has(subject.id);
            const grade = getGradeBadge(subjectScore.percentage);

            return (
              <div
                key={subject.id}
                className="rounded-lg border bg-card overflow-hidden"
              >
                <button
                  onClick={() => toggleSubject(subject.id)}
                  className="flex w-full items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <motion.div
                      animate={{ rotate: isExpanded ? 90 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </motion.div>
                    <div className="text-left">
                      <p className="font-medium">{subject.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {subject.subTopics.length} sub-topics
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className={cn("font-bold", getGradeColor(subjectScore.percentage))}>
                        {subjectScore.score}/{subjectScore.maxScore}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {subjectScore.percentage.toFixed(1)}%
                      </p>
                    </div>
                    <span
                      className={cn(
                        "rounded-md px-2 py-1 text-xs font-bold",
                        grade.className
                      )}
                    >
                      {grade.label}
                    </span>
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t bg-muted/30 px-4 py-3">
                        <div className="space-y-3">
                          {subject.subTopics.map((subTopic) => {
                            const scoreEntry = student.scores.find(
                              (s) => s.subTopicId === subTopic.id
                            );
                            const score = scoreEntry?.score || 0;
                            const percentage = (score / subTopic.maxScore) * 100;

                            return (
                              <div
                                key={subTopic.id}
                                className="flex items-center gap-3"
                              >
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm">{subTopic.name}</span>
                                    <span className="text-sm font-medium">
                                      {score}/{subTopic.maxScore}
                                    </span>
                                  </div>
                                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${percentage}%` }}
                                      transition={{ duration: 0.4 }}
                                      className={cn(
                                        "h-full rounded-full",
                                        percentage >= 80
                                          ? "bg-success"
                                          : percentage >= 60
                                          ? "bg-warning"
                                          : "bg-destructive"
                                      )}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
