import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Target, BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface SubTopicAnalysisCardProps {
  subjects: any[];
  studentScores: any[];
}

export function SubTopicAnalysisCard({ subjects, studentScores }: SubTopicAnalysisCardProps) {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");

  useEffect(() => {
    if (subjects.length > 0 && !selectedSubjectId) {
      setSelectedSubjectId(subjects[0].id);
    }
  }, [subjects, selectedSubjectId]);

  const analysis = useMemo(() => {
    if (!selectedSubjectId) return { strengths: [], weaknesses: [] };

    const subject = subjects.find(s => s.id === selectedSubjectId);
    if (!subject) return { strengths: [], weaknesses: [] };

    const subTopicPerf = subject.subTopics.map((st: any) => {
      const scoreEntry = studentScores.find((s: any) => s.sub_topic_id === st.id);
      const score = scoreEntry?.score || 0;
      const percentage = st.maxScore > 0 ? (score / st.maxScore) * 100 : 0;
      
      return {
        id: st.id,
        name: st.name,
        percentage
      };
    });

    // Sort by percentage
    const sorted = [...subTopicPerf].sort((a, b) => b.percentage - a.percentage);

    // Get Top 3 and Bottom 3
    // If fewer than 3, just show what we have. 
    // Avoid showing the same item in both if list is short, but standard logic usually separates them.
    // Let's just take top 3 and bottom 3 (if percentage < 50 for weaknesses, or just bottom).
    
    // For consistency with the main card:
    // Strengths: Top 3
    // Weaknesses: Bottom 3 (sorted ascending)
    
    const strengths = sorted.slice(0, 3);
    const weaknesses = [...sorted].sort((a, b) => a.percentage - b.percentage).slice(0, 3);

    return { strengths, weaknesses };
  }, [selectedSubjectId, subjects, studentScores]);

  if (subjects.length === 0) return null;

  return (
    <Card className="shadow-card border-0 rounded-2xl h-full">
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg font-semibold">
          วิเคราะห์ผลการเรียนรายบทเรียน
        </CardTitle>
        <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
          <SelectTrigger className="w-[140px] h-8 text-xs rounded-lg">
            <SelectValue placeholder="เลือกวิชา" />
          </SelectTrigger>
          <SelectContent>
            {subjects.map(s => (
              <SelectItem key={s.id} value={s.id} className="text-xs">
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="space-y-6 pt-4">
        {/* Strengths */}
        <div>
          <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-success">
            <TrendingUp className="h-4 w-4" />
            บทเรียนที่ทำได้ดีที่สุด
          </h4>
          <div className="space-y-2">
            {analysis.strengths.length > 0 ? (
              analysis.strengths.map((topic, index) => (
                <motion.div
                  key={topic.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between rounded-xl bg-success/5 p-3"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="flex bg-success/10 text-success h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold">
                      {index + 1}
                    </div>
                    <span className="font-medium text-sm truncate">{topic.name}</span>
                  </div>
                  <span className="font-bold text-success text-sm shrink-0 ml-2">
                    {topic.percentage.toFixed(0)}%
                  </span>
                </motion.div>
              ))
            ) : (
                <p className="text-xs text-muted-foreground pl-1">ไม่มีข้อมูลคะแนน</p>
            )}
          </div>
        </div>

        {/* Weaknesses */}
        <div>
          <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-warning">
            <Target className="h-4 w-4" />
            บทเรียนที่ควรปรับปรุง
          </h4>
          <div className="space-y-2">
            {analysis.weaknesses.length > 0 ? (
              analysis.weaknesses.map((topic, index) => (
                <motion.div
                  key={topic.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="flex items-center justify-between rounded-xl bg-warning/5 p-3"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-medium",
                        topic.percentage < 60
                          ? "bg-destructive/10 text-destructive"
                          : "bg-warning/10 text-warning"
                      )}
                    >
                      !
                    </div>
                    <span className="font-medium text-sm truncate">{topic.name}</span>
                  </div>
                  <span className={cn(
                      "font-bold text-sm shrink-0 ml-2",
                      topic.percentage < 60 ? "text-destructive" : "text-warning"
                  )}>
                    {topic.percentage.toFixed(0)}%
                  </span>
                </motion.div>
              ))
            ) : (
                <p className="text-xs text-muted-foreground pl-1">ไม่มีข้อมูลคะแนน</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
