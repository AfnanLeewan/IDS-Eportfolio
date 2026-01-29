import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SubTopic {
  id: string;
  name: string;
  maxScore: number; // mapped from max_score
}

interface Subject {
  id: string;
  name: string;
  code: string;
  subTopics: SubTopic[];
}

interface ScoreBreakdownProps {
  subjects: Subject[];
  studentScores: any[];
  className?: string;
}

export function ScoreBreakdown({ className }: Partial<ScoreBreakdownProps>) {
  const navigate = useNavigate();

  return (
    <Card className={`shadow-card border-0 rounded-2xl ${className} hover:shadow-lg transition-all`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
            คะแนนรายวิชา
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          View a comprehensive matrix of your scores across all subjects and assessments.
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between bg-primary/5 p-4 rounded-xl border border-primary/10">
           <div className="flex items-center gap-3">
               <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <div className="h-5 w-5 rounded-sm bg-primary" />
               </div>
               <div>
                  <p className="font-medium text-foreground">Complete Score Matrix</p>
                  <p className="text-xs text-muted-foreground">Compare assessments & sub-topics</p>
               </div>
           </div>
           
           <Button onClick={() => navigate('/student/scores')}>
              View Full Details
              <ChevronRight className="ml-2 h-4 w-4" />
           </Button>
        </div>
      </CardContent>
    </Card>
  );
}
