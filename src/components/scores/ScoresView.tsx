import { useState, useMemo, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  ChevronDown, 
  Download, 
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  Trash2,
  Plus,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Student,
  Subject,
} from "@/lib/mockData";
import {
  useSubjectWithTopics,
  useCurrentAcademicYear,
  useYearPrograms,
  useYearClasses,
  useClassScores,
  useUpdateStudentScores,
  useUpdateStudentScore,
  useDeleteStudentSubjectScores,
  useCreateStudent,
  useAcademicYears,
  useTeacherAssignments,
  useAssessments
} from '@/hooks/useSupabaseData';
import { useAuth } from '@/contexts/AuthContext';
import { YearSelector } from '@/components/common/YearSelector';
import { ScoreEditDialog } from "./ScoreEditDialog";
import { ScoreUploadDialog } from "./ScoreUploadDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ScoresViewProps {
  students?: Student[];
}

// Logic to calculate score for a specific subject
const calculateSubjectScore = (student: Student, subject: Subject) => {
  let totalScore = 0;
  let totalMaxScore = 0;

  subject.subTopics.forEach((subTopic) => {
    const scoreEntry = student.scores?.find((s) => s.subTopicId === subTopic.id);
    totalScore += scoreEntry?.score || 0;
    totalMaxScore += subTopic.maxScore;
  });

  return {
    score: totalScore,
    maxScore: totalMaxScore,
    percentage: totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0,
  };
};

export function ScoresView({ students: initialStudents = [] }: ScoresViewProps) {
  // Permissions
  const { user, role } = useAuth();
  const isTeacher = role === 'teacher';
  const isAdmin = role === 'admin';
  const { data: assignments = [] } = useTeacherAssignments(isTeacher ? user?.id : undefined);

  // Mutation hooks
  const updateScoresMutation = useUpdateStudentScores();
  const updateScoreMutation = useUpdateStudentScore();

  const createStudentMutation = useCreateStudent();

  // Academic year selection
  const { data: currentYear } = useCurrentAcademicYear();
  const { data: allYears = [] } = useAcademicYears();
  
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const activeYear = selectedYear || currentYear?.year_number || 2568;
  const activeYearObj = allYears.find(y => y.year_number === activeYear);
  const activeYearId = activeYearObj?.id || currentYear?.id;

  
  // Program selection
  const { data: programs = [], isLoading: programsLoading } = useYearPrograms(activeYearId);
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
  
  // Auto-select first program when programs load
  // Auto-select first program when programs load or change
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
  
  // Database hooks for subjects and classes
  const { data: assessmentsData = [] } = useAssessments(selectedProgramId);
  const assessments = assessmentsData as any[];
  const { data: subjectsFromDB = [], isLoading: subjectsLoading, error: subjectsError } = useSubjectWithTopics(selectedProgramId || 'none');
  const { data: classesFromDB = [], isLoading: classesLoading } = useYearClasses(activeYearId);
  
  // UI state
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>("latest");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSubjects, setExpandedSubjects] = useState<string[]>([]);
  
  // Load students with scores using useClassScores
  const { data: studentsWithScoresFromDB = [], isLoading: studentsLoading, error: studentsError } = useClassScores(selectedClass);

  // Map DB data to component format
  const students = useMemo(() => {
    if (studentsWithScoresFromDB && studentsWithScoresFromDB.length > 0) {
      return studentsWithScoresFromDB.map((dbStudent: any) => ({
        id: dbStudent.id,
        name: dbStudent.name,
        classId: dbStudent.class_id,
        scores: dbStudent.student_scores?.filter((score: any) => {
          // Filter by assessment
          if (selectedAssessmentId === 'latest') {
            // Find latest assessment from the list
            if (!assessments || assessments.length === 0) return true; // Show all if no assessments
            const latest = assessments[0]; // Ordered by desc
            return score.assessment_id === latest.id;
          }
          if (selectedAssessmentId === 'all') return true;
          return score.assessment_id === selectedAssessmentId;
        }).map((score: any) => ({
          subTopicId: score.sub_topic_id,
          score: score.score,
          // We might need to add maxScore here if the component needs it, 
          // but for now let's stick to the structure
        })) || []
      }));
    }
    return []; // Return empty if no data yet (or fall back to initialStudents if testing)
  }, [studentsWithScoresFromDB]);
  
  // Calculate effective assessment ID for mutations
  const effectiveAssessmentId = useMemo(() => {
    if (selectedAssessmentId === 'latest') {
      return assessments.length > 0 ? assessments[0].id : undefined;
    }
    if (selectedAssessmentId === 'all') return undefined; 
    return selectedAssessmentId;
  }, [selectedAssessmentId, assessments]);

  // CRUD state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedSubjectForEdit, setSelectedSubjectForEdit] = useState<Subject | null>(null);
  const [isSavingDialog, setIsSavingDialog] = useState(false);
  const [cellLoadingState, setCellLoadingState] = useState<Record<string, boolean>>({});
  const cellKey = (sid: string, stid: string) => `${sid}-${stid}`;

  // ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS!

  const filteredStudents = useMemo(() => {
    // Determine valid classes for the current year context
    const validClassIds = classesFromDB.length > 0 
      ? new Set(classesFromDB.map((c: any) => c.class_id)) 
      : null;

    return students.filter((student) => {
      // Enforce year validation: User must be in a class belonging to this year
      if (validClassIds && !validClassIds.has(student.classId)) return false;

      // Class filter is already handled by useClassScores if selectedClass is not 'all'
      // But we double check here just in case useClassScores behavior changes
      const matchesClass = selectedClass === "all" || student.classId === selectedClass;
      const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesClass && matchesSearch;
    });
  }, [students, selectedClass, searchQuery, classesFromDB]);

  // Use database subjects and map to component format
  const subjects = useMemo(() => {
    if (!subjectsFromDB || subjectsFromDB.length === 0) return [];
    
    let dbSubjects = subjectsFromDB;

    // Filter for teachers
    if (isTeacher && !isAdmin) {
      const assignedIds = new Set(assignments.map((a: any) => a.subject_id));
      dbSubjects = dbSubjects.filter(s => assignedIds.has(s.id));
    }
    
    if (selectedSubject !== "all") {
       dbSubjects = dbSubjects.filter(s => s.id === selectedSubject);
    }
    
    // Map database format (snake_case) to component format (camelCase)
    return dbSubjects.map(subject => ({
      id: subject.id,
      name: subject.name,
      code: subject.code,
      subTopics: subject.sub_topics?.map(st => ({
        id: st.id,
        name: st.name,
        maxScore: st.max_score, // Convert snake_case to camelCase
      })) || []
    }));
  }, [subjectsFromDB, selectedSubject]);

  // NOW it's safe to do early returns AFTER all hooks are called
  
  // Show error state
  if (subjectsError || studentsError) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="p-6 max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">
              {subjectsError ? 'Error Loading Subjects' : 'Error Loading Students'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {subjectsError?.message || studentsError?.message || 'Failed to load data from database'}
            </p>
            <Button onClick={() => window.location.reload()}>
              Reload Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading state while subjects are being fetched
  if (subjectsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading subjects...</p>
        </div>
      </div>
    );
  }

  // Show message if no subjects found
  if (!subjectsFromDB || subjectsFromDB.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="p-6 max-w-md text-center">
          <CardHeader>
            <CardTitle>No Subjects Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              No subjects have been added yet. Please add subjects in the Management page first.
            </p>
            <Button onClick={() => window.location.href = '/management'}>
              Go to Management
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const toggleSubject = (subjectId: string) => {
    setExpandedSubjects(prev => 
      prev.includes(subjectId) 
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return "text-emerald-600";
    if (percentage >= 60) return "text-amber-600";
    return "text-red-500";
  };

  const getScoreBadge = (percentage: number) => {
    if (percentage >= 80) return { label: "Excellent", className: "bg-emerald-100 text-emerald-700" };
    if (percentage >= 70) return { label: "Good", className: "bg-blue-100 text-blue-700" };
    if (percentage >= 60) return { label: "Fair", className: "bg-amber-100 text-amber-700" };
    return { label: "Needs Work", className: "bg-red-100 text-red-700" };
  };

  const getTrendIcon = (studentScore: number, classAverage: number) => {
    const diff = studentScore - classAverage;
    if (diff > 5) return <TrendingUp className="h-4 w-4 text-emerald-500" />;
    if (diff < -5) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  // CRUD handlers
  const handleEditClick = (student: Student, subject: Subject) => {
    setSelectedStudent(student);
    setSelectedSubjectForEdit(subject);
    setEditDialogOpen(true);
  };

  // Handlers
  const handleSaveScores = async (
    studentId: string, 
    newScores: { subTopicId: string; score: number }[]
  ) => {
    // GUARD: Prevent double-click
    if (isSavingDialog || updateScoresMutation.isPending) {
      toast.info('Save in progress. Please wait.');
      return;
    }
    
    // INPUT VALIDATION
    if (!studentId) {
      toast.error('No student selected');
      return;
    }
    if (!newScores || newScores.length === 0) {
      toast.error('No scores to save');
      return;
    }
    
    setIsSavingDialog(true);
    
    try {
      // AWAIT mutation completely
      const result = await updateScoresMutation.mutateAsync({
        studentId,
        scores: newScores,
        academicYear: activeYear,
        assessmentId: effectiveAssessmentId
      });
      
      // VALIDATE result
      if (!result || !Array.isArray(result) || result.length === 0) {
        throw new Error('No scores were saved. Please try again.');
      }
      
      // Verify each score was saved correctly
      for (const newScore of newScores) {
        const saved = result.find((r: any) => r.sub_topic_id === newScore.subTopicId);
        if (!saved || saved.score !== newScore.score) {
          throw new Error(
            `Score mismatch for sub-topic ${newScore.subTopicId}: ` +
            `expected ${newScore.score}, got ${saved?.score ?? 'missing'}`
          );
        }
      }
      
      // Only close AFTER successful validation
      setEditDialogOpen(false);
      // Success toast handled by mutation
      
    } catch (error) {
      // SHOW ERROR and keep form open for retry
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to save scores: ${errorMessage}`);
      // Form dialog stays open, user can edit and retry
    } finally {
      setIsSavingDialog(false);
    }
  };

  const handleInlineScoreUpdate = async (
    studentId: string, 
    subTopicId: string, 
    newScore: number
  ) => {
    const key = cellKey(studentId, subTopicId);
    
    // Show loading state on cell
    setCellLoadingState(prev => ({ ...prev, [key]: true }));
    
    try {
      await updateScoreMutation.mutateAsync({
        studentId,
        subTopicId,
        score: newScore,
        academicYear: activeYear,
        assessmentId: effectiveAssessmentId
      });
      
      // Success feedback handled by mutation/toast
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to update: ${errorMsg}`);
      console.error('Inline score update failed:', error);
      
      // Note: Full rollback requires local state management of students array,
      // but react-query's onError in useUpdateStudentScore handles cache rollback.
      // We just need to ensure UI reflects that.
      
    } finally {
      // Clear loading state
      setCellLoadingState(prev => {
        const newState = { ...prev };
        delete newState[key];
        return newState;
      });
    }
  };





  // Calculate total score across all subjects
  const getStudentTotalScore = (student: Student) => {
    if (!subjects.length) return { score: 0, maxScore: 0, percentage: 0 };
    
    let totalScore = 0;
    let totalMaxScore = 0;
    
    subjects.forEach(subject => {
      const { score, maxScore } = calculateSubjectScore(student, subject);
      totalScore += score;
      totalMaxScore += maxScore;
    });
    
    return {
      score: totalScore,
      maxScore: totalMaxScore,
      percentage: totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">รายงานคะแนน</h2>
          <p className="text-muted-foreground">
            {programs.find(p => p.program_id === selectedProgramId)?.program_name || 'เลือกโครงการ'} • ปีการศึกษา {activeYear}
          </p>
        </div>
        <div className="flex gap-2">
          <ScoreUploadDialog 
            programId={selectedProgramId} 
            subjectId={selectedSubject !== "all" ? selectedSubject : undefined}
            activeYearId={activeYearId}
          />
  
        </div>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-card">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            {/* Program Selector - NEW! */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                โครงการ:
              </label>
              <Select value={selectedProgramId} onValueChange={setSelectedProgramId}>
                <SelectTrigger className="w-[220px] rounded-xl">
                  <SelectValue placeholder="เลือกโครงการ" />
                </SelectTrigger>
                <SelectContent>
                  {programs.map((program: any) => (
                    <SelectItem key={program.program_id} value={program.program_id}>
                      {program.program_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {programsLoading && <span className="text-sm text-muted-foreground">กำลังโหลด...</span>}
            </div>

            {/* Assessment Selector - NEW! */}
            <div className="flex items-center gap-3">
               <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                การสอบ:
              </label>
              <Select value={selectedAssessmentId} onValueChange={setSelectedAssessmentId}>
                <SelectTrigger className="w-[220px] rounded-xl">
                  <SelectValue placeholder="เลือกการสอบ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="latest">ล่าสุด (Latest)</SelectItem>
                  {assessments.map((a: any) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.title}
                    </SelectItem>
                  ))}
                  <SelectItem value="all">ทั้งหมด (All Scores)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Search and Filters */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อหรือรหัสนักเรียน..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-border bg-muted/50 py-2.5 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              <div className="flex gap-3">
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="w-[160px] rounded-xl">
                    <SelectValue placeholder="เลือกห้องเรียน" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทุกห้องเรียน</SelectItem>
                    {classesFromDB.map((cls: any) => (
                      <SelectItem key={cls.class_id} value={cls.class_id}>
                        {cls.class_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger className="w-[180px] rounded-xl">
                    <SelectValue placeholder="เลือกวิชา" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทุกวิชา</SelectItem>
                    {subjectsFromDB.map((subject: any) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <YearSelector 
                  value={selectedYear} 
                  onValueChange={setSelectedYear}
                  className="w-[200px]"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-0 shadow-card">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">จำนวนนักเรียน</p>
            <p className="text-3xl font-bold text-foreground">{filteredStudents.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-card">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">ค่าเฉลี่ยห้อง</p>
            <p className="text-3xl font-bold text-emerald-600">
              {(filteredStudents.length > 0 
                ? (filteredStudents.reduce((acc, s) => acc + getStudentTotalScore(s).percentage, 0) / filteredStudents.length).toFixed(1)
                : "0.0")}%
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-card">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">คะแนนสูงสุด</p>
            <p className="text-3xl font-bold text-blue-600">
              {filteredStudents.length > 0 
                ? Math.max(...filteredStudents.map(s => getStudentTotalScore(s).percentage)).toFixed(1)
                : "0.0"}%
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-card">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">คะแนนต่ำสุด</p>
            <p className="text-3xl font-bold text-amber-600">
              {filteredStudents.length > 0 
                ? Math.min(...filteredStudents.map(s => getStudentTotalScore(s).percentage)).toFixed(1)
                : "0.0"}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Scores by Subject */}
      <TooltipProvider>
        {subjects.map((subject) => (
          <SubjectScoreTable
            key={subject.id}
            subject={subject}
            students={filteredStudents}
            classes={classesFromDB}
            isExpanded={expandedSubjects.includes(subject.id)}
            onToggle={() => toggleSubject(subject.id)}
            getScoreColor={getScoreColor}
            getScoreBadge={getScoreBadge}
            getTrendIcon={getTrendIcon}
            onEdit={handleEditClick}
            cellLoadingState={cellLoadingState} // Passed prop
            onInlineScoreUpdate={handleInlineScoreUpdate}
            calculateSubjectScore={calculateSubjectScore}
          />
        ))}
      </TooltipProvider>

      {/* CRUD Dialogs */}
      <ScoreEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        student={selectedStudent}
        subject={selectedSubjectForEdit}
        onSave={handleSaveScores}
      />
    </div>
  );
}

interface SubjectScoreTableProps {
  subject: Subject;
  students: Student[];
  classes: any[];
  isExpanded: boolean;
  onToggle: () => void;
  getScoreColor: (percentage: number) => string;
  getScoreBadge: (percentage: number) => { label: string; className: string };
  getTrendIcon: (studentScore: number, classAverage: number) => React.ReactNode;
  onEdit: (student: Student, subject: Subject) => void;
  cellLoadingState: Record<string, boolean>; // Added prop
  onInlineScoreUpdate: (studentId: string, subTopicId: string, newScore: number) => void;
  calculateSubjectScore: (student: Student, subject: Subject) => { score: number; maxScore: number; percentage: number };
}

function SubjectScoreTable({
  subject,
  students,
  classes,
  isExpanded,
  onToggle,
  getScoreColor,
  getScoreBadge,
  getTrendIcon,
  onEdit,
  cellLoadingState, // Added prop
  onInlineScoreUpdate,
  calculateSubjectScore,
}: SubjectScoreTableProps) {
  const [editingCell, setEditingCell] = useState<{ studentId: string; subTopicId: string } | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const cellKey = (sid: string, stid: string) => `${sid}-${stid}`;

  // Calculate subject statistics
  const subjectStats = useMemo(() => {
    if (students.length === 0) {
      return { average: 0, highest: 0, lowest: 0, totalStudents: 0 };
    }
    
    // Use the passed helper instead of getSubjectScore
    const percentages = students.map(s => calculateSubjectScore(s, subject).percentage);
    const average = percentages.reduce((acc, p) => acc + p, 0) / percentages.length;
    const highest = Math.max(...percentages);
    const lowest = Math.min(...percentages);
    
    return {
      average,
      highest,
      lowest,
      totalStudents: students.length,
    };
  }, [students, subject, calculateSubjectScore]);

  const subjectAverage = subjectStats.average;

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  const handleDoubleClick = (studentId: string, subTopicId: string, currentScore: number) => {
    setEditingCell({ studentId, subTopicId });
    setEditValue(currentScore.toString());
  };

  const handleSaveInline = (maxScore: number) => {
    if (!editingCell) return;
    const numValue = parseInt(editValue) || 0;
    const clampedValue = Math.max(0, Math.min(numValue, maxScore));
    onInlineScoreUpdate(editingCell.studentId, editingCell.subTopicId, clampedValue);
    setEditingCell(null);
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent, maxScore: number) => {
    if (e.key === "Enter") {
      handleSaveInline(maxScore);
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <Card className="border-0 shadow-card overflow-hidden">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center">
                    <span className="text-lg font-bold text-primary-foreground">
                      {subject.code}
                    </span>
                  </div>
                  <div>
                    <CardTitle className="text-lg">{subject.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {subject.subTopics.length} หัวข้อย่อย • ค่าเฉลี่ย: {subjectAverage.toFixed(1)}%
                    </p>
                  </div>
                </div>
                <ChevronDown
                  className={cn(
                    "h-5 w-5 text-muted-foreground transition-transform",
                    isExpanded && "rotate-180"
                  )}
                />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              {/* Subject Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 rounded-xl bg-muted/50 border">
                  <p className="text-sm text-muted-foreground mb-1">Total Students</p>
                  <p className="text-2xl font-bold">{subjectStats.totalStudents}</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/50 border">
                  <p className="text-sm text-muted-foreground mb-1">Average Score</p>
                  <p className={cn("text-2xl font-bold", getScoreColor(subjectStats.average))}>
                    {subjectStats.average.toFixed(1)}%
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-muted/50 border">
                  <p className="text-sm text-muted-foreground mb-1">Highest Score</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {subjectStats.highest.toFixed(1)}%
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-muted/50 border">
                  <p className="text-sm text-muted-foreground mb-1">Lowest Score</p>
                  <p className="text-2xl font-bold text-red-500">
                    {subjectStats.lowest.toFixed(1)}%
                  </p>
                </div>
              </div>
              <div className="rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Student ID</TableHead>
                      <TableHead className="font-semibold">Name</TableHead>
                      <TableHead className="font-semibold">Class</TableHead>
                      {subject.subTopics.map((subTopic) => (
                        <TableHead key={subTopic.id} className="text-center font-semibold">
                          <div className="flex flex-col">
                            <span className="text-xs">{subTopic.name}</span>
                            <span className="text-[10px] text-muted-foreground">
                              (max {subTopic.maxScore})
                            </span>
                          </div>
                        </TableHead>
                      ))}
                      <TableHead className="text-center font-semibold">Total</TableHead>
                      <TableHead className="text-center font-semibold">%</TableHead>
                      <TableHead className="text-center font-semibold">vs Avg</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => {
                      // Use the passed helper
                      const subjectScore = calculateSubjectScore(student, subject);
                      // Use passed classes prop to lookup name
                      const className = classes?.find(c => c.class_id === student.classId)?.class_name || student.classId;
                      
                      return (
                        <TableRow key={student.id} className="hover:bg-muted/30">
                          <TableCell className="font-mono text-sm">{student.id}</TableCell>
                          <TableCell className="font-medium">{student.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="rounded-full">
                              {className}
                            </Badge>
                          </TableCell>
                          {subject.subTopics.map((subTopic) => {
                            const scoreEntry = student.scores.find(
                              (s) => s.subTopicId === subTopic.id
                            );
                            const score = scoreEntry?.score || 0;
                            const percentage = (score / subTopic.maxScore) * 100;
                            const isEditing = editingCell?.studentId === student.id && editingCell?.subTopicId === subTopic.id;
                            const isLoading = cellLoadingState[cellKey(student.id, subTopic.id)];
                            
                            return (
                              <TableCell
                                key={subTopic.id}
                                className={cn(
                                  "text-center p-1",
                                  isLoading && "opacity-60 pointer-events-none"
                                )}
                              >
                                {isEditing ? (
                                  <div className="flex items-center justify-center gap-1">
                                    <input
                                      ref={inputRef}
                                      type="number"
                                      min={0}
                                      max={subTopic.maxScore}
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onKeyDown={(e) => handleKeyDown(e, subTopic.maxScore)}
                                      onBlur={() => handleSaveInline(subTopic.maxScore)}
                                      className="w-14 h-7 text-center text-sm border border-primary rounded bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                                    />
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center">
                                    {isLoading && (
                                      <Loader2 className="h-4 w-4 inline-block animate-spin mr-2" />
                                    )}
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span 
                                          className={cn(
                                            "font-medium cursor-pointer px-2 py-1 rounded hover:bg-muted transition-colors inline-block min-w-[32px]",
                                            getScoreColor(percentage)
                                          )}
                                          onDoubleClick={() => handleDoubleClick(student.id, subTopic.id, score)}
                                        >
                                          {score}
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent>Double-click to edit</TooltipContent>
                                    </Tooltip>
                                  </div>
                                )}
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-center font-semibold">
                            {subjectScore.score}/{subjectScore.maxScore}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={cn("font-bold", getScoreColor(subjectScore.percentage))}>
                              {subjectScore.percentage.toFixed(1)}%
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            {getTrendIcon(subjectScore.percentage, subjectAverage)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </CollapsibleContent>

        </Card>
      </Collapsible>
    </motion.div>
  );
}
