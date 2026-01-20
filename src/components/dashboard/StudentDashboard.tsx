import { useState } from "react";
import { motion } from "framer-motion";
import { Award, TrendingUp, Target, BookOpen } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { SubjectRadarChart } from "./SubjectRadarChart";
import { ScoreBreakdown } from "./ScoreBreakdown";
import { SkillProfileComparison } from "./SkillProfileComparison";
import { SubTopicScoreChart } from "./SubTopicScoreChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Student,
  preALevelProgram,
  getSubjectScore,
  getTotalScore,
  getClassAverage,
  mockStudents,
} from "@/lib/mockData";

interface StudentDashboardProps {
  student: Student;
}

export function StudentDashboard({ student }: StudentDashboardProps) {
  const [selectedSubject, setSelectedSubject] = useState(preALevelProgram.subjects[0].id);
  const totalScore = getTotalScore(student);
  
  const selectedSubjectData = preALevelProgram.subjects.find(s => s.id === selectedSubject);
  
  // Calculate percentile
  const allScores = mockStudents.map((s) => getTotalScore(s).percentage);
  const sortedScores = [...allScores].sort((a, b) => a - b);
  const studentRank = sortedScores.filter((s) => s < totalScore.percentage).length;
  const percentile = ((studentRank / mockStudents.length) * 100).toFixed(0);

  // Calculate class rank
  const classStudents = mockStudents.filter((s) => s.classId === student.classId);
  const classScores = classStudents.map((s) => getTotalScore(s).percentage);
  const sortedClassScores = [...classScores].sort((a, b) => b - a);
  const classRank = sortedClassScores.findIndex((s) => s === totalScore.percentage) + 1;

  // Radar chart data
  const radarData = preALevelProgram.subjects.map((subject) => {
    const studentScore = getSubjectScore(student, subject.id).percentage;
    const classAvg = getClassAverage(student.classId, subject.id);
    return {
      subject: subject.code,
      studentScore,
      classAverage: classAvg,
      fullMark: 100,
    };
  });

  // Strength/Weakness analysis
  const subjectPerformance = preALevelProgram.subjects.map((subject) => ({
    ...subject,
    score: getSubjectScore(student, subject.id),
  }));
  const sortedSubjects = [...subjectPerformance].sort(
    (a, b) => b.score.percentage - a.score.percentage
  );
  const strengths = sortedSubjects.slice(0, 3);
  const weaknesses = sortedSubjects.slice(-3).reverse();

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl gradient-primary p-6 text-primary-foreground shadow-glow"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Welcome back, {student.name}!</h2>
            <p className="text-primary-foreground/80">
              Student ID: {student.id} • Class: {classStudents[0] && classStudents[0].classId.toUpperCase().replace("-", "/")}
            </p>
          </div>
          <div className="flex gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold">{totalScore.percentage.toFixed(0)}%</p>
              <p className="text-xs text-primary-foreground/70">Overall Score</p>
            </div>
            <div className="h-12 w-px bg-primary-foreground/20" />
            <div className="text-center">
              <p className="text-3xl font-bold">#{classRank}</p>
              <p className="text-xs text-primary-foreground/70">Class Rank</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Score"
          value={`${totalScore.score}/${totalScore.maxScore}`}
          subtitle={`${totalScore.percentage.toFixed(1)}% overall`}
          icon={Award}
          variant="primary"
        />
        <StatCard
          title="Percentile"
          value={`Top ${100 - parseInt(percentile)}%`}
          subtitle={`Better than ${percentile}% of students`}
          icon={TrendingUp}
          variant="success"
        />
        <StatCard
          title="Class Rank"
          value={`#${classRank}`}
          subtitle={`Out of ${classStudents.length} students`}
          icon={Target}
          variant="default"
        />
        <StatCard
          title="Subjects"
          value={preALevelProgram.subjects.length}
          subtitle="Pre-A-Level Program"
          icon={BookOpen}
          variant="default"
        />
      </div>

      {/* Charts & Analysis */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SubjectRadarChart data={radarData} studentName={student.name} />

        {/* Strengths & Weaknesses */}
        <Card className="shadow-card border-0 rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">
              Performance Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Strengths */}
            <div>
              <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-success">
                <TrendingUp className="h-4 w-4" />
                Top Performing Subjects
              </h4>
              <div className="space-y-2">
                {strengths.map((subject, index) => (
                  <motion.div
                    key={subject.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between rounded-xl bg-success/5 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10 text-sm font-bold text-success">
                        {index + 1}
                      </div>
                      <span className="font-medium">{subject.name}</span>
                    </div>
                    <span className="font-bold text-success">
                      {subject.score.percentage.toFixed(0)}%
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Weaknesses */}
            <div>
              <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-warning">
                <Target className="h-4 w-4" />
                Areas for Improvement
              </h4>
              <div className="space-y-2">
                {weaknesses.map((subject, index) => (
                  <motion.div
                    key={subject.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className="flex items-center justify-between rounded-xl bg-warning/5 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium",
                          subject.score.percentage < 60
                            ? "bg-destructive/10 text-destructive"
                            : "bg-warning/10 text-warning"
                        )}
                      >
                        !
                      </div>
                      <span className="font-medium">{subject.name}</span>
                    </div>
                    <span
                      className={cn(
                        "font-bold",
                        subject.score.percentage < 60
                          ? "text-destructive"
                          : "text-warning"
                      )}
                    >
                      {subject.score.percentage.toFixed(0)}%
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Skill Profile Comparison Chart */}
      <SkillProfileComparison student={student} />

      {/* Sub-topic Score Comparison with Subject Filter */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Sub-topic Analysis</h3>
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select Subject" />
            </SelectTrigger>
            <SelectContent>
              {preALevelProgram.subjects.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedSubjectData && (
          <SubTopicScoreChart 
            student={student} 
            subject={selectedSubjectData}
          />
        )}
      </div>

      {/* Detailed Breakdown */}
      <ScoreBreakdown student={student} />
    </div>
  );
}
