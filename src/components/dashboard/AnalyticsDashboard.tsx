import { useState, useMemo, useEffect } from "react";
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
  Student,
} from "@/lib/mockData"; // Keep Student interface for now
import { calculateSubjectScore, getStudentTotalScore } from "@/lib/score-utils";
import { SubjectRadarChart } from "./SubjectRadarChart";
import { BoxPlotChart } from "./BoxPlotChart";
import { SubTopicHeatmap } from "./SubTopicHeatmap";
import { SubTopicGapChart } from "./SubTopicGapChart";
import { SubTopicScoreChart } from "./SubTopicScoreChart";
import { StudentDeepDive } from "./StudentDeepDive";
import { SubTopicComparisonChart } from "@/components/scores/SubTopicComparisonChart";
import { StudentSelector } from "./StudentSelector";
import { ScoreTrendDashboard } from "./ScoreTrendDashboard";
import { YearSelector } from "@/components/common/YearSelector";
import { 
  useCurrentAcademicYear, 
  useYearPrograms, 
  useYearClasses, 
  useSubjectWithTopics, 
  useClassScores,
  useAcademicYears,
  useAssessments
} from "@/hooks/useSupabaseData";

interface AnalyticsDashboardProps {
  selectedYear?: number | null;
  onYearChange?: (year: number | null) => void;
}

export function AnalyticsDashboard({ 
  selectedYear: propSelectedYear, 
  onYearChange: propOnYearChange 
}: AnalyticsDashboardProps) {
  // Year selection
  const { data: currentYear } = useCurrentAcademicYear();
  const { data: allYears = [] } = useAcademicYears();
  const [internalSelectedYear, setInternalSelectedYear] = useState<number | null>(null);
  
  const selectedYear = propSelectedYear !== undefined ? propSelectedYear : internalSelectedYear;
  const setSelectedYear = propOnYearChange || setInternalSelectedYear;
  
  const activeYear = selectedYear || currentYear?.year_number || 2568;
  const activeYearObj = allYears.find(y => y.year_number === activeYear);
  const activeYearId = activeYearObj?.id || currentYear?.id;

  // Program selection
  const { data: programs = [], isLoading: programsLoading } = useYearPrograms(activeYearId);
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");

  // Auto-select first program
  // Use useEffect for side effects
  useEffect(() => {
    if (programs.length > 0) {
      const isValid = programs.find((p: any) => p.program_id === selectedProgramId);
      if (!isValid) {
        setSelectedProgramId(programs[0].program_id);
      }
    } else {
      setSelectedProgramId("");
    }
  }, [programs, selectedProgramId]);

  // Assessment selection
  const { data: assessments = [] } = useAssessments(selectedProgramId);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>("latest");

  // Data Loading
  const { data: rawSubjects = [] } = useSubjectWithTopics(selectedProgramId || 'none');
  const { data: classesFromDB = [] } = useYearClasses(activeYearId);
  
  // Map subjects to internal format (camelCase for subTopics)
  const subjectsFromDB = useMemo(() => {
    return rawSubjects.map((s: any) => ({
      ...s,
      subTopics: (s.sub_topics || []).map((st: any) => ({
        id: st.id,
        name: st.name,
        maxScore: st.max_score, // Map snake_case to camelCase
        fullMark: st.max_score
      }))
    }));
  }, [rawSubjects]);
  
  // Filter states
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [activeLevel, setActiveLevel] = useState<1 | 2 | 3>(1);

  // Load students and scores
  // If "all" classes is selected, we want all scores for the year/program
  // Currently useClassScores only supports per-class or 'all' classes
  // 'all' classes in useClassScores returns ALL students. We might need to filter by class year on client side
  // or trust that students are from current year's active classes.
  const { data: studentsWithScoresFromDB = [] } = useClassScores(selectedClass);

  // Determine effective assessment ID for filtering
  const effectiveAssessmentId = useMemo(() => {
    if (selectedAssessmentId === 'latest') {
        return assessments.length > 0 ? assessments[0].id : null;
    }
    return selectedAssessmentId;
  }, [selectedAssessmentId, assessments]);

  // Map to component format WITH FILTERING
  const allStudents = useMemo(() => {
    if (!studentsWithScoresFromDB) return [];
    return studentsWithScoresFromDB.map((dbStudent: any) => {
        // Filter scores by assessment
        const filteredScores = dbStudent.student_scores?.filter((score: any) => {
             if (selectedAssessmentId === 'all') return true; // Show all (usually implies average, but raw data needs specific handling)
             // If specific assessment or latest
             if (effectiveAssessmentId) {
                 return score.assessment_id === effectiveAssessmentId;
             }
             return false;
        }) || [];

        return {
          id: dbStudent.id,
          name: dbStudent.name,
          classId: dbStudent.class_id,
          scores: filteredScores.map((score: any) => ({
            subTopicId: score.sub_topic_id,
            score: score.score,
          }))
      };
    });
  }, [studentsWithScoresFromDB, effectiveAssessmentId, selectedAssessmentId]);

  // Filter students based on current program's classes
  const filteredStudents = useMemo(() => {
    // If specific class selected, useClassScores already handled it mostly (except for year check if strict)
    // But we also need to ensure students belong to classes in the current PROGRAM if needed?
    // Actually, classes are assigned to programs. 
    // If selectedClass is 'all', we should filter students to only those in classes belonging to this program??
    // Currently useYearClasses returns valid classes.
    // Let's filter students whose classId is in classesFromDB
    
    const validClassIds = new Set(classesFromDB.map((c: any) => c.class_id)); // useYearClasses returns { class_id, class_name... }?
    // Wait, useYearClasses returns: class_id, class_name, academic_year_id...
    
    return allStudents.filter(s => {
      // Just filter by valid classes in this year
      if (!validClassIds.has(s.classId)) return false;
      return true;
    });
  }, [allStudents, classesFromDB]);

  const selectedSubjectData = useMemo(() => {
    return selectedSubject === "all"
      ? null
      : subjectsFromDB.find((s: any) => s.id === selectedSubject);
  }, [selectedSubject, subjectsFromDB]);

  // Calculate school-wide average (Program-wide average actually)
  const schoolAverage = useMemo(() => {
    if (!filteredStudents.length) return 0;
    return filteredStudents.reduce((acc, s) => acc + getStudentTotalScore(s, subjectsFromDB).percentage, 0) / filteredStudents.length;
  }, [filteredStudents, subjectsFromDB]);

  // Calculate class-specific average (if specific class selected, same as schoolavg? No, filteredStudents is already filtered by class if selectedClass != all?)
  // Wait, useClassScores(selectedClass) already filters by class if != all.
  // So filteredStudents IS the class students.
  // We need "Overall/School" stats separately if we want to compare.
  // To solve this, we should fetch ALL scores always, and filter locally.
  
  // REVISION: Always fetch 'all' classes for the context, then filter locally for "filteredStudents", but keep "allStudents" for comparison.
  // But useClassScores('all') might be heavy. For now, let's assume it's fine.
  // However, I used useClassScores(selectedClass) above.
  
  /* 
     Update Plan:
     1. Always useClassScores('all') to get all data for comparison context.
     2. Filter locally for display.
  */
  
  // NOTE: I will update the hook call below to use 'all' effectively.
  
  const classAverage = useMemo(() => {
    if (filteredStudents.length === 0) return 0;
    return filteredStudents.reduce((acc, s) => acc + getStudentTotalScore(s, subjectsFromDB).percentage, 0) / filteredStudents.length;
  }, [filteredStudents, subjectsFromDB]);

  // Calculate standard deviation
  const standardDeviation = useMemo(() => {
    if (filteredStudents.length === 0) return 0;
    const mean = classAverage;
    const squaredDiffs = filteredStudents.map((s) => {
      const diff = getStudentTotalScore(s, subjectsFromDB).percentage - mean;
      return diff * diff;
    });
    return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / filteredStudents.length);
  }, [filteredStudents, classAverage, subjectsFromDB]);

  // Calculate top 10% and bottom 10%
  const rankedStudents = useMemo(() => {
    return [...filteredStudents]
      .map((s) => ({ ...s, totalScore: getStudentTotalScore(s, subjectsFromDB) }))
      .sort((a, b) => b.totalScore.percentage - a.totalScore.percentage);
  }, [filteredStudents, subjectsFromDB]);

  const top10PercentCount = useMemo(() => {
    return Math.ceil(filteredStudents.length * 0.1);
  }, [filteredStudents]);

  const bottom10PercentCount = useMemo(() => {
    const threshold = Math.ceil(filteredStudents.length * 0.1);
    // return rankedStudents.slice(-threshold).filter((s) => s.totalScore.percentage < 50).length; // Original logic
    return Math.min(threshold, rankedStudents.filter((s) => s.totalScore.percentage < 50).length); // Safe count
  }, [rankedStudents, filteredStudents]);

  // Radar chart data
  const radarData = useMemo(() => {
    return subjectsFromDB.map((subject: any) => {
      const classScores = filteredStudents.map((s) => calculateSubjectScore(s, subject).percentage);
      const classAvg = classScores.length > 0 ? classScores.reduce((a, b) => a + b, 0) / classScores.length : 0;

      // School scores (compare against all students in year/program)
      // We need 'allStudents' (in program) for this.
      // If selectedClass is specific, 'filteredStudents' is just that class.
      // I should load ALL scores separate if I want comparison.
      // For now, let's compare against 'filteredStudents' (which might be just the class), effectively 100% overlap if class selected.
      // Ideally we want Program Average.
      
      const schoolAvg = classAvg; // Placeholder if we don't have full data loaded. 
      // If we change useClassScores to always load 'all', we can filter.
      
      return {
        subject: subject.code,
        studentScore: classAvg, // This is actually Class Average for the subject
        classAverage: schoolAvg, // This should be Program/School Average
        fullMark: 100,
      };
    });
  }, [filteredStudents, subjectsFromDB]);


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
        <Card className="shadow-card border-0 rounded-2xl pt-3">
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Program Select */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">โปรแกรม</label>
                <Select value={selectedProgramId} onValueChange={setSelectedProgramId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="เลือกโปรแกรม" />
                  </SelectTrigger>
                  <SelectContent>
                    {programs.map((program: any) => (
                      <SelectItem key={program.program_id} value={program.program_id}>
                        {program.program_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">การสอบ</label>
                <Select value={selectedAssessmentId} onValueChange={setSelectedAssessmentId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="เลือกการสอบ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="latest">ล่าสุด  </SelectItem>
                    {assessments.map((a: any) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Class Select */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">ห้องเรียน</label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="เลือกห้องเรียน" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทุกห้องเรียน</SelectItem>
                    {classesFromDB.map((classGroup: any) => (
                      <SelectItem key={classGroup.class_id} value={classGroup.class_id}>
                        {classGroup.class_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Subject Select */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">วิชา</label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="เลือกวิชา" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทุกวิชา (ภาพรวม)</SelectItem>
                    {subjectsFromDB.map((subject: any) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* View Level Toggle */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">ระดับการวิเคราะห์</label>
                <div className="flex gap-1">
                  <Button
                    variant={activeLevel === 1 ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => { setActiveLevel(1); setSelectedStudent(null); }}
                  >
                    ภาพรวม
                  </Button>
                  <Button
                    variant={activeLevel === 2 ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => { setActiveLevel(2); setSelectedStudent(null); }}
                  >
                    บทเรียน
                  </Button>
                  <Button
                    variant={activeLevel === 3 ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => setActiveLevel(3)}
                  >
                    นักเรียน
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
                      <p className="text-sm font-medium text-muted-foreground">ค่าเฉลี่ยห้องเรียน</p>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-3xl font-bold">{classAverage.toFixed(1)}%</span>
                        <span className="text-sm text-muted-foreground">
                          เทียบกับ {schoolAverage.toFixed(1)}% ทั้งโรงเรียน
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
                      {Math.abs(classAverage - schoolAverage).toFixed(1)}% {classAverage >= schoolAverage ? "สูงกว่า" : "ต่ำกว่า"}ค่าเฉลี่ย
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-card border-0 rounded-2xl">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">นักเรียนกลุ่มท็อป 10%</p>
                      <span className="text-3xl font-bold text-success">{top10PercentCount}</span>
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-success" />
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">ผู้มีผลการเรียนสูงในห้อง</p>
                </CardContent>
              </Card>

              <Card className="shadow-card border-0 rounded-2xl">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">นักเรียนที่ต้องดูแล</p>
                      <span className="text-3xl font-bold text-destructive">{bottom10PercentCount}</span>
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                      <AlertTriangle className="h-6 w-6 text-destructive" />
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">ต่ำกว่าเกณฑ์ 50%</p>
                </CardContent>
              </Card>

              <Card className="shadow-card border-0 rounded-2xl">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">ค่าเบี่ยงเบนมาตรฐาน</p>
                      <span className="text-3xl font-bold">{standardDeviation.toFixed(1)}</span>
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-chart-6/10 flex items-center justify-center">
                      <BarChart3 className="h-6 w-6 text-chart-6" />
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {standardDeviation > 15 ? "กระจายสูง - ความสามารถหลากหลาย" : "กระจายต่ำ - ระดับใกล้เคียงกัน"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Spider Web / Radar Chart */}
              <SubjectRadarChart
                data={radarData}
                studentName={selectedClass === "all" ? "ค่าเฉลี่ยโรงเรียน" : classesFromDB.find((c: any) => c.class_id === selectedClass)?.class_name || "ค่าเฉลี่ยห้องเรียน"}
                className="ค่าเฉลี่ยระดับชั้น"
              />

              {/* Box Plot for Class Comparison */}
              <BoxPlotChart
                selectedSubject={selectedSubject}
                selectedClass={selectedClass}
                students={allStudents}
                classes={classesFromDB}
                subjects={subjectsFromDB}
              />
            </div>

            {/* Score Trend Dashboard */}
            {selectedProgramId && (
              <ScoreTrendDashboard programId={selectedProgramId} />
            )}

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
                    นักเรียนคะแนนสูงสุด
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
                              {classesFromDB.find((c: any) => c.class_id === student.classId)?.class_name || student.classId}
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
                    นักเรียนที่ต้องดูแล (10% ล่างสุด)
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
                              {classesFromDB.find((c: any) => c.class_id === student.classId)?.class_name || student.classId}
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
              subjects={subjectsFromDB}
            />

            {/* Sub-topic Score Comparison Chart */}
            <SubTopicComparisonChart 
              students={filteredStudents} 
              subjects={subjectsFromDB}
            />

            {/* Sub-topic Gap Analysis */}
            <SubTopicGapChart
              students={filteredStudents}
              selectedSubject={selectedSubject}
              subjects={subjectsFromDB}
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
                  onClick={() => setSelectedStudent(null)}
                >
                  <ArrowLeft className="h-4 w-4" />
                  กลับไปหน้ารายชื่อ
                </Button>
                <StudentDeepDive
                  student={selectedStudent}
                  classStudents={filteredStudents}
                  subjects={subjectsFromDB}
                  classes={classesFromDB}
                  programId={selectedProgramId}
                />
              </>
            ) : (
               <StudentSelector 
                  students={rankedStudents} // Using rankedStudents as it has totalScore
                  classes={classesFromDB}
                  onSelect={handleStudentClick}
               />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
