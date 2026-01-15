import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  User,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  BookOpen,
  Target,
  Award,
} from "lucide-react";
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
import {
  preALevelProgram,
  classGroups,
  getSubjectScore,
  getTotalScore,
  Student,
} from "@/lib/mockData";

interface StudentDeepDiveProps {
  student: Student;
  classStudents: Student[];
}

export function StudentDeepDive({ student, classStudents }: StudentDeepDiveProps) {
  // Calculate student's total score
  const studentTotal = getTotalScore(student);

  // Calculate class average
  const classAverage = useMemo(() => {
    return classStudents.reduce((acc, s) => acc + getTotalScore(s).percentage, 0) / classStudents.length;
  }, [classStudents]);

  // Calculate top 10 average
  const top10Average = useMemo(() => {
    const sorted = [...classStudents]
      .map(s => ({ ...s, total: getTotalScore(s) }))
      .sort((a, b) => b.total.percentage - a.total.percentage);
    const top10 = sorted.slice(0, Math.ceil(sorted.length * 0.1));
    return top10.reduce((acc, s) => acc + s.total.percentage, 0) / top10.length;
  }, [classStudents]);

  // Get student rank
  const studentRank = useMemo(() => {
    const sorted = [...classStudents]
      .map(s => ({ ...s, total: getTotalScore(s) }))
      .sort((a, b) => b.total.percentage - a.total.percentage);
    return sorted.findIndex(s => s.id === student.id) + 1;
  }, [classStudents, student]);

  // Subject comparison data for bar chart
  const subjectComparisonData = useMemo(() => {
    return preALevelProgram.subjects.map(subject => {
      const studentScore = getSubjectScore(student, subject.id).percentage;
      const classAvg = classStudents.reduce((acc, s) =>
        acc + getSubjectScore(s, subject.id).percentage, 0) / classStudents.length;

      const sorted = [...classStudents]
        .map(s => ({ id: s.id, score: getSubjectScore(s, subject.id).percentage }))
        .sort((a, b) => b.score - a.score);
      const top10 = sorted.slice(0, Math.ceil(sorted.length * 0.1));
      const top10Avg = top10.reduce((acc, s) => acc + s.score, 0) / top10.length;

      return {
        subject: subject.code,
        name: subject.name,
        studentScore,
        classAverage: classAvg,
        top10Average: top10Avg,
      };
    });
  }, [student, classStudents]);

  // Weakness table - sub-topics below 50%
  const weaknesses = useMemo(() => {
    const weakTopics: Array<{
      id: string;
      name: string;
      subjectCode: string;
      subjectName: string;
      percentage: number;
      score: number;
      maxScore: number;
      recommendation: string;
    }> = [];

    preALevelProgram.subjects.forEach(subject => {
      subject.subTopics.forEach(subTopic => {
        const scoreEntry = student.scores.find(s => s.subTopicId === subTopic.id);
        const percentage = scoreEntry ? (scoreEntry.score / subTopic.maxScore) * 100 : 0;

        if (percentage < 50) {
          weakTopics.push({
            id: subTopic.id,
            name: subTopic.name,
            subjectCode: subject.code,
            subjectName: subject.name,
            percentage,
            score: scoreEntry?.score || 0,
            maxScore: subTopic.maxScore,
            recommendation: `Review ${subject.name} - ${subTopic.name}`,
          });
        }
      });
    });

    return weakTopics.sort((a, b) => a.percentage - b.percentage);
  }, [student]);

  // Strengths - sub-topics above 80%
  const strengths = useMemo(() => {
    const strongTopics: Array<{
      id: string;
      name: string;
      subjectCode: string;
      percentage: number;
    }> = [];

    preALevelProgram.subjects.forEach(subject => {
      subject.subTopics.forEach(subTopic => {
        const scoreEntry = student.scores.find(s => s.subTopicId === subTopic.id);
        const percentage = scoreEntry ? (scoreEntry.score / subTopic.maxScore) * 100 : 0;

        if (percentage >= 80) {
          strongTopics.push({
            id: subTopic.id,
            name: subTopic.name,
            subjectCode: subject.code,
            percentage,
          });
        }
      });
    });

    return strongTopics.sort((a, b) => b.percentage - a.percentage);
  }, [student]);

  const className = classGroups.find(c => c.id === student.classId)?.name || "Unknown";

  return (
    <div className="space-y-6">
      {/* Student Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="shadow-card border-0 rounded-2xl bg-gradient-to-r from-primary/10 to-accent/10">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{student.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary">{className}</Badge>
                    <span className="text-sm text-muted-foreground">ID: {student.id}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Overall Score</p>
                  <p className={`text-3xl font-bold ${
                    studentTotal.percentage >= 70 ? "text-success" :
                    studentTotal.percentage >= 50 ? "text-warning" : "text-destructive"
                  }`}>
                    {studentTotal.percentage.toFixed(1)}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Rank</p>
                  <p className="text-3xl font-bold">#{studentRank}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Skill Profile Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="shadow-card border-0 rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Skill Profile Comparison
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Student performance vs Class Average vs Top 10%
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={subjectComparisonData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="subject"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Bar dataKey="studentScore" name="Student" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="classAverage" name="Class Avg" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="top10Average" name="Top 10%" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>

            {/* Gap to Top 10 */}
            <div className="mt-4 p-4 bg-muted/50 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Gap to Top 10%</span>
                <div className="flex items-center gap-2">
                  {studentTotal.percentage >= top10Average ? (
                    <>
                      <TrendingUp className="h-4 w-4 text-success" />
                      <span className="text-success font-semibold">
                        Already in Top 10%!
                      </span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-4 w-4 text-warning" />
                      <span className="text-warning font-semibold">
                        {(top10Average - studentTotal.percentage).toFixed(1)}% below Top 10
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Weaknesses and Strengths */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Weakness Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="shadow-card border-0 rounded-2xl h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Areas for Improvement
                {weaknesses.length > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {weaknesses.length} topics
                  </Badge>
                )}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Sub-topics scoring below 50%
              </p>
            </CardHeader>
            <CardContent>
              {weaknesses.length > 0 ? (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                  {weaknesses.map((topic, index) => (
                    <motion.div
                      key={topic.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-3 bg-destructive/5 rounded-xl border border-destructive/20"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {topic.subjectCode}
                          </Badge>
                          <span className="font-medium text-sm">{topic.name}</span>
                        </div>
                        <span className="text-destructive font-semibold text-sm">
                          {topic.percentage.toFixed(1)}%
                        </span>
                      </div>
                      <Progress value={topic.percentage} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-2">
                        📚 {topic.recommendation}
                      </p>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Award className="h-12 w-12 mx-auto text-success mb-3" />
                  <p className="text-muted-foreground">
                    Great job! No sub-topics below 50%
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Strengths */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="shadow-card border-0 rounded-2xl h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Award className="h-5 w-5 text-success" />
                Strengths
                {strengths.length > 0 && (
                  <Badge className="ml-2 bg-success text-success-foreground">
                    {strengths.length} topics
                  </Badge>
                )}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Sub-topics scoring 80% or above
              </p>
            </CardHeader>
            <CardContent>
              {strengths.length > 0 ? (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                  {strengths.map((topic, index) => (
                    <motion.div
                      key={topic.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-3 bg-success/5 rounded-xl border border-success/20"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {topic.subjectCode}
                        </Badge>
                        <span className="font-medium text-sm">{topic.name}</span>
                      </div>
                      <Badge className="bg-success/10 text-success border-success/20">
                        {topic.percentage.toFixed(1)}%
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">
                    Keep working - excellence is within reach!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Personalized Recommendations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="shadow-card border-0 rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Personalized Study Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {weaknesses.slice(0, 3).map((topic, index) => (
                <div
                  key={topic.id}
                  className="p-4 bg-muted/50 rounded-xl"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl font-bold text-primary">{index + 1}</span>
                    <div>
                      <p className="font-medium text-sm">{topic.name}</p>
                      <p className="text-xs text-muted-foreground">{topic.subjectName}</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Current: {topic.percentage.toFixed(0)}% → Target: 60%+
                  </p>
                </div>
              ))}
              {weaknesses.length === 0 && (
                <div className="col-span-full text-center py-4">
                  <p className="text-muted-foreground">
                    🎉 This student is performing well across all topics! Consider advanced enrichment activities.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
