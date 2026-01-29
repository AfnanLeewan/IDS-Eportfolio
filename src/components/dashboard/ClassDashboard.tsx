import { motion } from "framer-motion";
import { Users, BookOpen, TrendingUp, TrendingDown, User } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { SubjectRadarChart } from "./SubjectRadarChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  mockStudents,
  preALevelProgram,
  classGroups,
  getSubjectScore,
  getTotalScore,
  getClassAverage,
  ClassGroup,
} from "@/lib/mockData";

interface ClassDashboardProps {
  classGroup: ClassGroup;
}

export function ClassDashboard({ classGroup }: ClassDashboardProps) {
  // Get students in this class
  const classStudents = mockStudents.filter((s) => s.classId === classGroup.id);
  
  // Calculate class average
  const classAverage = classStudents.length > 0
    ? classStudents.reduce((acc, s) => acc + getTotalScore(s).percentage, 0) / classStudents.length
    : 0;

  // Calculate subject performance for this class
  const subjectPerformance = preALevelProgram.subjects.map((subject) => {
    const avg = classStudents.length > 0
      ? classStudents.reduce((acc, s) => acc + getSubjectScore(s, subject.id).percentage, 0) / classStudents.length
      : 0;
    return {
      subject: subject.code,
      name: subject.name,
      id: subject.id,
      average: avg,
      studentScore: avg,
      classAverage: getClassAverage(classGroup.id, subject.id),
      fullMark: 100,
    };
  });

  // Find best and worst subjects
  const sortedSubjects = [...subjectPerformance].sort((a, b) => b.average - a.average);
  const bestSubject = sortedSubjects[0];
  const worstSubject = sortedSubjects[sortedSubjects.length - 1];

  // Get top and bottom students
  const rankedStudents = [...classStudents]
    .map((s) => ({
      ...s,
      score: getTotalScore(s),
    }))
    .sort((a, b) => b.score.percentage - a.score.percentage);

  const topStudents = rankedStudents.slice(0, 5);
  const needsAttention = rankedStudents.filter((s) => s.score.percentage < 50).slice(0, 5);

  // Radar chart data
  const radarData = subjectPerformance.map((sp) => ({
    subject: sp.subject,
    studentScore: sp.average,
    classAverage: 65, // Target/benchmark
    fullMark: 100,
  }));

  return (
    <div className="space-y-6">
      {/* Class Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h3 className="text-xl font-bold">{classGroup.name}</h3>
          <p className="text-sm text-muted-foreground">
            {classStudents.length} students • {preALevelProgram.subjects.length} subjects
          </p>
        </div>
        <Badge 
          variant={classAverage >= 70 ? "default" : classAverage >= 50 ? "secondary" : "destructive"}
          className="text-sm px-3 py-1"
        >
          Avg: {classAverage.toFixed(1)}%
        </Badge>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Students"
          value={classStudents.length}
          subtitle="Enrolled in class"
          icon={Users}
          variant="primary"
        />
        <StatCard
          title="Class Average"
          value={`${classAverage.toFixed(1)}%`}
          subtitle="Overall performance"
          icon={TrendingUp}
          variant={classAverage >= 60 ? "success" : "warning"}
        />
        <StatCard
          title="Best Subject"
          value={bestSubject?.subject || "-"}
          subtitle={`${bestSubject?.average.toFixed(1)}% avg`}
          icon={TrendingUp}
          variant="success"
        />
        <StatCard
          title="Needs Focus"
          value={worstSubject?.subject || "-"}
          subtitle={`${worstSubject?.average.toFixed(1)}% avg`}
          icon={TrendingDown}
          variant="warning"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Subject Performance Radar */}
        <SubjectRadarChart
          data={radarData}
          studentName={`${classGroup.name} Performance`}
        />

        {/* Subject Breakdown */}
        <Card className="shadow-card border-0 rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Subject Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {subjectPerformance.map((subject, index) => (
              <motion.div
                key={subject.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{subject.name}</span>
                  <span className={`font-semibold ${
                    subject.average >= 70 ? "text-success" :
                    subject.average >= 50 ? "text-warning" : "text-destructive"
                  }`}>
                    {subject.average.toFixed(1)}%
                  </span>
                </div>
                <Progress 
                  value={subject.average} 
                  className="h-2"
                />
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Students Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Performers */}
        <Card className="shadow-card border-0 rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-success" />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topStudents.length > 0 ? topStudents.map((student, index) => (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between rounded-xl bg-muted/50 p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/10 text-success font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{student.name}</p>
                      <p className="text-xs text-muted-foreground">ID: {student.id}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                    {student.score.percentage.toFixed(1)}%
                  </Badge>
                </motion.div>
              )) : (
                <p className="text-sm text-muted-foreground text-center py-4">No students in this class</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Needs Attention */}
        <Card className="shadow-card border-0 rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <User className="h-5 w-5 text-warning" />
              Needs Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {needsAttention.length > 0 ? needsAttention.map((student, index) => (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between rounded-xl bg-muted/50 p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-warning/10">
                      <User className="h-4 w-4 text-warning" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{student.name}</p>
                      <p className="text-xs text-muted-foreground">ID: {student.id}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                    {student.score.percentage.toFixed(1)}%
                  </Badge>
                </motion.div>
              )) : (
                <p className="text-sm text-muted-foreground text-center py-4">All students are performing well!</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* All Students Table */}
      <Card className="shadow-card border-0 rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            All Students ({classStudents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Rank</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Student</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">ID</th>
                  {preALevelProgram.subjects.slice(0, 4).map((subject) => (
                    <th key={subject.id} className="text-center py-3 px-2 font-medium text-muted-foreground">
                      {subject.code}
                    </th>
                  ))}
                  <th className="text-center py-3 px-2 font-medium text-muted-foreground">คะแนนรวม</th>
                </tr>
              </thead>
              <tbody>
                {rankedStudents.map((student, index) => (
                  <motion.tr
                    key={student.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className="border-b border-border/30 hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-3 px-2">
                      <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                        index < 3 ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                      }`}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="py-3 px-2 font-medium">{student.name}</td>
                    <td className="py-3 px-2 text-muted-foreground">{student.id}</td>
                    {preALevelProgram.subjects.slice(0, 4).map((subject) => {
                      const score = getSubjectScore(student, subject.id);
                      return (
                        <td key={subject.id} className="text-center py-3 px-2">
                          <span className={`${
                            score.percentage >= 70 ? "text-success" :
                            score.percentage >= 50 ? "text-foreground" : "text-destructive"
                          }`}>
                            {score.percentage.toFixed(0)}%
                          </span>
                        </td>
                      );
                    })}
                    <td className="text-center py-3 px-2">
                      <Badge 
                        variant={student.score.percentage >= 70 ? "default" : student.score.percentage >= 50 ? "secondary" : "destructive"}
                      >
                        {student.score.percentage.toFixed(1)}%
                      </Badge>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
