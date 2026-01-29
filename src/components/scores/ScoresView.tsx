import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
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
          if (selectedAssessmentId === 'all') {
            // If 'all', we shouldn't really be editing. 
            // For view, maybe show the LATEST? Or Average?
            // "it still use the same score" -> because find() picks first one.
            // Let's force pick LATEST if 'all' is selected to be safe, 
            // OR return all and let the UI handle it (complex).
            // Better: Show "Combined/Average" or just Latest.
            // Let's default 'all' to show LATEST for now to avoid duplications in the find().
            // Actually, if 'all' is selected, we should probably aggregate. 
            // But to fix the BUG, let's assume user wants to see specific assessment.
            return true;
          }
          return score.assessment_id === selectedAssessmentId;
        }).map((score: any) => ({
          subTopicId: score.sub_topic_id,
          score: score.score,
          assessmentId: score.assessment_id // Pass this down
        })) || []
      }));
    }
    return []; // Return empty if no data yet (or fall back to initialStudents if testing)
  }, [studentsWithScoresFromDB, selectedAssessmentId, assessments]);
  
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



  // CRUD handlers
  const handleEditClick = (student: Student, subject: Subject) => {
    setSelectedStudent(student);
    setSelectedSubjectForEdit(subject);
    setEditDialogOpen(true);
  };

  // Prevent editing if 'all' is selected
  const canEdit = selectedAssessmentId !== 'all';

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
          <div className="flex flex-col gap-4 items-center">
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
            <div className="flex items-center gap-3">
               <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                การสอบ:
              </label>
              <Select value={selectedAssessmentId} onValueChange={setSelectedAssessmentId}>
                <SelectTrigger className="w-[220px] rounded-xl">
                  <SelectValue placeholder="เลือกการสอบ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="latest">ล่าสุด  </SelectItem>
                  {assessments.map((a: any) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.title}
                    </SelectItem>
                  ))}
                  {/* <SelectItem value="all">ทั้งหมด (All Scores)</SelectItem> */}
                </SelectContent>
                </Select>

              </div>
                                          <div className="flex items-center gap-3">
                              
                               <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                ปีการศึกษา:
              </label>
                <YearSelector 
                  value={selectedYear} 
                  onValueChange={setSelectedYear}
                  className="w-[250px]"
                />
                
                
                </div>
              <div className="flex items-center gap-3">
                                               <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                ห้องเรียน:
              </label>
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
        {subjects.map((subject) => {
          // Calculate quick stats for the card
          const subjectStats = filteredStudents.length > 0 ? (() => {
             const percentages = filteredStudents.map(s => calculateSubjectScore(s, subject).percentage);
             return {
               average: percentages.reduce((a, b) => a + b, 0) / percentages.length,
               count: filteredStudents.length
             };
          })() : { average: 0, count: 0 };
          
          return (
            <motion.div
              key={subject.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card 
                className="border-0 shadow-card hover:shadow-lg transition-all cursor-pointer group"
                onClick={() => {
                   const params = new URLSearchParams();
                   if (selectedProgramId) params.set('programId', selectedProgramId);
                   if (selectedClass) params.set('classId', selectedClass);
                   if (selectedAssessmentId) params.set('assessmentId', selectedAssessmentId);
                   if (activeYear) params.set('year', activeYear.toString());
                   
                   navigate(`/scores/${subject.id}?${params.toString()}`);
                }}
              >
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                     <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                        <span className="text-lg font-bold text-primary-foreground">{subject.code}</span>
                     </div>
                     <div>
                        <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">{subject.name}</h3>
                        <p className="text-sm text-muted-foreground">
                           {subject.subTopics.length} บทเรียน • นักเรียน {subjectStats.count} คน
                        </p>
                     </div>
                  </div>
                  
                  <div className="text-right">
                     <p className="text-sm text-muted-foreground">ค่าเฉลี่ย</p>
                     <p className={cn("text-2xl font-bold", getScoreColor(subjectStats.average))}>
                        {subjectStats.average.toFixed(1)}%
                     </p>
                  </div>
                  
                  <ChevronDown className="-rotate-90 text-muted-foreground" />
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
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


