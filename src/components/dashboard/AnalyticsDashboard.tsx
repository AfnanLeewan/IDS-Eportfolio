import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  BookOpen,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Filter,
  User,
  Target,
  BarChart3,
  ArrowLeft,
  ChevronRight,
  Percent,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  mockStudents,
  preALevelProgram,
  classGroups,
  getSubjectScore,
  getTotalScore,
  getClassAverage,
  getOverallClassAverage,
  getSubTopicAverage,
  Student,
} from "@/lib/mockData";
import { SubjectRadarChart } from "./SubjectRadarChart";
import { BoxPlotChart } from "./BoxPlotChart";
import { SubTopicHeatmap } from "./SubTopicHeatmap";
import { SubTopicGapChart } from "./SubTopicGapChart";
import { SubTopicScoreChart } from "./SubTopicScoreChart";
import { StudentDeepDive } from "./StudentDeepDive";
import { SubTopicComparisonChart } from "@/components/scores/SubTopicComparisonChart";

// Additional exam programs for future use
const examPrograms = [
  { id: "pre-a-level", name: "Pre-A-Level" },
  { id: "pre-scius", name: "Pre-SCIUS" },
];

export function AnalyticsDashboard() {
  // Filter states
  const [selectedProgram, setSelectedProgram] = useState("pre-a-level");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [activeLevel, setActiveLevel] = useState<1 | 2 | 3>(1);

  // Computed data based on filters
  const filteredStudents = useMemo(() => {
    return selectedClass === "all"
      ? mockStudents
      : mockStudents.filter((s) => s.classId === selectedClass);
  }, [selectedClass]);

  const selectedSubjectData = useMemo(() => {
    return selectedSubject === "all"
      ? null
      : preALevelProgram.subjects.find((s) => s.id === selectedSubject);
  }, [selectedSubject]);

  // Calculate school-wide average
  const schoolAverage = useMemo(() => {
    return mockStudents.reduce((acc, s) => acc + getTotalScore(s).percentage, 0) / mockStudents.length;
  }, []);

  // Calculate class-specific average
  const classAverage = useMemo(() => {
    if (filteredStudents.length === 0) return 0;
    return filteredStudents.reduce((acc, s) => acc + getTotalScore(s).percentage, 0) / filteredStudents.length;
  }, [filteredStudents]);

  // Calculate standard deviation
  const standardDeviation = useMemo(() => {
    if (filteredStudents.length === 0) return 0;
    const mean = classAverage;
    const squaredDiffs = filteredStudents.map((s) => {
      const diff = getTotalScore(s).percentage - mean;
      return diff * diff;
    });
    return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / filteredStudents.length);
  }, [filteredStudents, classAverage]);

  // Calculate top 10% and bottom 10%
  const rankedStudents = useMemo(() => {
    return [...filteredStudents]
      .map((s) => ({ ...s, totalScore: getTotalScore(s) }))
      .sort((a, b) => b.totalScore.percentage - a.totalScore.percentage);
  }, [filteredStudents]);

  const top10PercentCount = useMemo(() => {
    const threshold = Math.ceil(filteredStudents.length * 0.1);
    return threshold;
  }, [filteredStudents]);

  const bottom10PercentCount = useMemo(() => {
    const threshold = Math.ceil(filteredStudents.length * 0.1);
    return rankedStudents.slice(-threshold).filter((s) => s.totalScore.percentage < 50).length;
  }, [rankedStudents, filteredStudents]);

  // Radar chart data
  const radarData = useMemo(() => {
    return preALevelProgram.subjects.map((subject) => {
      const classScores = filteredStudents.map((s) => getSubjectScore(s, subject.id).percentage);
      const classAvg = classScores.length > 0 ? classScores.reduce((a, b) => a + b, 0) / classScores.length : 0;

      const schoolScores = mockStudents.map((s) => getSubjectScore(s, subject.id).percentage);
      const schoolAvg = schoolScores.reduce((a, b) => a + b, 0) / schoolScores.length;

      return {
        subject: subject.code,
        studentScore: classAvg,
        classAverage: schoolAvg,
        fullMark: 100,
      };
    });
  }, [filteredStudents]);

  // Handle student click for deep dive
  const handleStudentClick = (student: Student) => {
    setSelectedStudent(student);
    setActiveLevel(3);
  };

  // Handle back from student view
  const handleBackFromStudent = () => {
    setSelectedStudent(null);
    setActiveLevel(2);
  };

  return (
    <div className="space-y-6">
      {/* Filter Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <Card className="shadow-card border-0 rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary" />
              Analysis Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Program Select */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Program</label>
                <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Program" />
                  </SelectTrigger>
                  <SelectContent>
                    {examPrograms.map((program) => (
                      <SelectItem key={program.id} value={program.id}>
                        {program.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Class Select */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Class</label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {classGroups.map((classGroup) => (
                      <SelectItem key={classGroup.id} value={classGroup.id}>
                        {classGroup.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Subject Select */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Subject</label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects (Overview)</SelectItem>
                    {preALevelProgram.subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* View Level Toggle */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Analysis Level</label>
                <div className="flex gap-1">
                  <Button
                    variant={activeLevel === 1 ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => { setActiveLevel(1); setSelectedStudent(null); }}
                  >
                    Overview
                  </Button>
                  <Button
                    variant={activeLevel === 2 ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => { setActiveLevel(2); setSelectedStudent(null); }}
                  >
                    Sub-topic
                  </Button>
                  <Button
                    variant={activeLevel === 3 ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => setActiveLevel(3)}
                    disabled={!selectedStudent}
                  >
                    Student
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <AnimatePresence mode="wait">
        {/* Level 1: Overview */}
        {activeLevel === 1 && (
          <motion.div
            key="level-1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            {/* KPI Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="shadow-card border-0 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Class Average</p>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-3xl font-bold">{classAverage.toFixed(1)}%</span>
                        <span className="text-sm text-muted-foreground">
                          vs {schoolAverage.toFixed(1)}% school
                        </span>
                      </div>
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Percent className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    {classAverage >= schoolAverage ? (
                      <TrendingUp className="h-4 w-4 text-success" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-destructive" />
                    )}
                    <span className={`text-sm ${classAverage >= schoolAverage ? "text-success" : "text-destructive"}`}>
                      {Math.abs(classAverage - schoolAverage).toFixed(1)}% {classAverage >= schoolAverage ? "above" : "below"} average
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-card border-0 rounded-2xl">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Top 10% Students</p>
                      <span className="text-3xl font-bold text-success">{top10PercentCount}</span>
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-success" />
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">High performers in class</p>
                </CardContent>
              </Card>

              <Card className="shadow-card border-0 rounded-2xl">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">At-Risk Students</p>
                      <span className="text-3xl font-bold text-destructive">{bottom10PercentCount}</span>
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                      <AlertTriangle className="h-6 w-6 text-destructive" />
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">Below 50% threshold</p>
                </CardContent>
              </Card>

              <Card className="shadow-card border-0 rounded-2xl">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Standard Deviation</p>
                      <span className="text-3xl font-bold">{standardDeviation.toFixed(1)}</span>
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-chart-6/10 flex items-center justify-center">
                      <BarChart3 className="h-6 w-6 text-chart-6" />
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {standardDeviation > 15 ? "High spread - mixed abilities" : "Low spread - consistent levels"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Spider Web / Radar Chart */}
              <SubjectRadarChart
                data={radarData}
                studentName={selectedClass === "all" ? "School Average" : classGroups.find(c => c.id === selectedClass)?.name || "Class Average"}
                className="Grade Average"
              />

              {/* Box Plot for Class Comparison */}
              <BoxPlotChart
                selectedSubject={selectedSubject}
                selectedClass={selectedClass}
              />
            </div>

            {/* Sub-topic Score Chart (when subject is selected) */}
            {selectedSubjectData && (
              <SubTopicScoreChart
                subject={selectedSubjectData}
                classId={selectedClass === "all" ? undefined : selectedClass}
              />
            )}

            {/* Quick Access Lists */}
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
                  <div className="space-y-2">
                    {rankedStudents.slice(0, 5).map((student, index) => (
                      <motion.div
                        key={student.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center justify-between rounded-xl bg-muted/50 p-3 cursor-pointer hover:bg-muted transition-colors"
                        onClick={() => handleStudentClick(student)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/10 text-success font-bold text-sm">
                            {index + 1}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{student.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {classGroups.find(c => c.id === student.classId)?.name}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                            {student.totalScore.percentage.toFixed(1)}%
                          </Badge>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* At-Risk Students */}
              <Card className="shadow-card border-0 rounded-2xl">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-warning" />
                    At-Risk Students (Bottom 10%)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {rankedStudents.slice(-5).reverse().map((student, index) => (
                      <motion.div
                        key={student.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center justify-between rounded-xl bg-muted/50 p-3 cursor-pointer hover:bg-muted transition-colors"
                        onClick={() => handleStudentClick(student)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-warning/10">
                            <User className="h-4 w-4 text-warning" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{student.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {classGroups.find(c => c.id === student.classId)?.name}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                            {student.totalScore.percentage.toFixed(1)}%
                          </Badge>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}

        {/* Level 2: Subject & Sub-topic Analysis */}
        {activeLevel === 2 && (
          <motion.div
            key="level-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            {/* Sub-topic Heatmap */}
            <SubTopicHeatmap
              students={filteredStudents}
              selectedSubject={selectedSubject}
              onStudentClick={handleStudentClick}
            />

            {/* Sub-topic Score Comparison Chart */}
            <SubTopicComparisonChart students={filteredStudents} />

            {/* Sub-topic Gap Analysis */}
            <SubTopicGapChart
              students={filteredStudents}
              selectedSubject={selectedSubject}
            />
          </motion.div>
        )}

        {/* Level 3: Individual Student Deep Dive */}
        {activeLevel === 3 && (
          <motion.div
            key="level-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            {selectedStudent ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                  onClick={handleBackFromStudent}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Sub-topic Analysis
                </Button>
                <StudentDeepDive
                  student={selectedStudent}
                  classStudents={filteredStudents}
                />
              </>
            ) : (
              <Card className="shadow-card border-0 rounded-2xl">
                <CardContent className="py-12 text-center">
                  <User className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Select a Student</h3>
                  <p className="text-muted-foreground">
                    Click on a student from the Overview or Sub-topic Analysis to see their detailed performance.
                  </p>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
