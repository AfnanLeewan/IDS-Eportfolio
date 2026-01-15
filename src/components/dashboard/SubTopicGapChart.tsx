import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart2, AlertCircle, Lightbulb } from "lucide-react";
import {
  preALevelProgram,
  Student,
} from "@/lib/mockData";

interface SubTopicGapChartProps {
  students: Student[];
  selectedSubject: string;
}

interface SubTopicGap {
  id: string;
  name: string;
  subjectCode: string;
  subjectName: string;
  averagePercentage: number;
  maxScore: number;
  priority: "urgent" | "moderate" | "low";
}

export function SubTopicGapChart({ students, selectedSubject }: SubTopicGapChartProps) {
  const gapData = useMemo(() => {
    const subjectsToShow = selectedSubject === "all"
      ? preALevelProgram.subjects
      : preALevelProgram.subjects.filter(s => s.id === selectedSubject);

    const gaps: SubTopicGap[] = subjectsToShow.flatMap(subject =>
      subject.subTopics.map(subTopic => {
        const scores = students.map(student => {
          const scoreEntry = student.scores.find(s => s.subTopicId === subTopic.id);
          return scoreEntry ? (scoreEntry.score / subTopic.maxScore) * 100 : 0;
        });

        const avgPercentage = scores.length > 0
          ? scores.reduce((a, b) => a + b, 0) / scores.length
          : 0;

        let priority: "urgent" | "moderate" | "low" = "low";
        if (avgPercentage < 40) priority = "urgent";
        else if (avgPercentage < 60) priority = "moderate";

        return {
          id: subTopic.id,
          name: subTopic.name,
          subjectCode: subject.code,
          subjectName: subject.name,
          averagePercentage: avgPercentage,
          maxScore: subTopic.maxScore,
          priority,
        };
      })
    );

    // Sort by average percentage (lowest first)
    return gaps.sort((a, b) => a.averagePercentage - b.averagePercentage);
  }, [students, selectedSubject]);

  const urgentTopics = gapData.filter(g => g.priority === "urgent");
  const moderateTopics = gapData.filter(g => g.priority === "moderate");

  const getProgressColor = (percentage: number) => {
    if (percentage < 40) return "bg-destructive";
    if (percentage < 60) return "bg-warning";
    return "bg-success";
  };

  const getPriorityBadge = (priority: "urgent" | "moderate" | "low") => {
    switch (priority) {
      case "urgent":
        return <Badge variant="destructive" className="text-xs">Urgent</Badge>;
      case "moderate":
        return <Badge variant="outline" className="text-xs border-warning text-warning">Moderate</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Low</Badge>;
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Gap Analysis Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="shadow-card border-0 rounded-2xl h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-primary" />
              Sub-topic Gap Analysis
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Topics sorted by average score - focus on the weakest areas first
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {gapData.map((topic, index) => (
                <motion.div
                  key={topic.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="space-y-1"
                >
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs font-normal">
                        {topic.subjectCode}
                      </Badge>
                      <span className="font-medium truncate max-w-[200px]" title={topic.name}>
                        {topic.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getPriorityBadge(topic.priority)}
                      <span className={`font-semibold ${
                        topic.averagePercentage < 40 ? "text-destructive" :
                        topic.averagePercentage < 60 ? "text-warning" : "text-success"
                      }`}>
                        {topic.averagePercentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${topic.averagePercentage}%` }}
                      transition={{ delay: index * 0.03 + 0.2, duration: 0.5 }}
                      className={`absolute left-0 top-0 h-full rounded-full ${getProgressColor(topic.averagePercentage)}`}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Action Recommendations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="shadow-card border-0 rounded-2xl h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-warning" />
              Recommended Actions
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Based on gap analysis insights
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Urgent Review Section */}
            {urgentTopics.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <h4 className="font-semibold text-destructive">Urgent: Re-teach Entire Class</h4>
                </div>
                <div className="bg-destructive/10 rounded-xl p-4 space-y-2">
                  {urgentTopics.slice(0, 5).map(topic => (
                    <div key={topic.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{topic.name}</span>
                        <Badge variant="secondary" className="text-xs">{topic.subjectCode}</Badge>
                      </div>
                      <span className="text-destructive font-semibold">{topic.averagePercentage.toFixed(1)}%</span>
                    </div>
                  ))}
                  {urgentTopics.length > 5 && (
                    <p className="text-xs text-muted-foreground pt-2">
                      +{urgentTopics.length - 5} more topics require urgent attention
                    </p>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  💡 Consider dedicating next week's lessons to review these topics. 
                  The class average is below 40%, indicating a fundamental gap in understanding.
                </p>
              </div>
            )}

            {/* Moderate Attention Section */}
            {moderateTopics.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-warning" />
                  <h4 className="font-semibold text-warning">Moderate: Reinforcement Needed</h4>
                </div>
                <div className="bg-warning/10 rounded-xl p-4 space-y-2">
                  {moderateTopics.slice(0, 3).map(topic => (
                    <div key={topic.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{topic.name}</span>
                        <Badge variant="secondary" className="text-xs">{topic.subjectCode}</Badge>
                      </div>
                      <span className="text-warning font-semibold">{topic.averagePercentage.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  💡 These topics could benefit from additional practice exercises or homework assignments.
                </p>
              </div>
            )}

            {/* Strong Areas */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-success" />
                <h4 className="font-semibold text-success">Strong Areas</h4>
              </div>
              <div className="bg-success/10 rounded-xl p-4">
                <p className="text-sm">
                  {gapData.filter(g => g.priority === "low").length} topics have average scores above 60%. 
                  Consider using students who excel in these areas for peer tutoring.
                </p>
              </div>
            </div>

            {/* Peer Tutoring Suggestion */}
            <div className="border-t border-border/50 pt-4">
              <h4 className="font-semibold mb-2">Peer Tutoring Opportunities</h4>
              <p className="text-sm text-muted-foreground">
                Use the Scatter Plot view to identify students who are strong in one subject but weak in another.
                Pair them with students who have opposite strengths for mutual benefit.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
