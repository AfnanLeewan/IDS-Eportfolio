
import { useState, useMemo, useRef, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ChevronLeft, 
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  ChevronDown,
  MoreHorizontal
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

import {
  useSubjectWithTopics,
  useClassScores,
  useUpdateStudentScore,
  useYearClasses,
  useAssessments
} from '@/hooks/useSupabaseData';
import { useAuth } from '@/contexts/AuthContext';
import { Student, Subject } from "@/lib/mockData";

// --- Utility Functions (Duplicated from ScoresView to be self-contained or could be moved to utils) ---
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

export default function SubjectDetail() {
  const { subjectId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  
  // Read params
  const programId = searchParams.get('programId') || '';
  const classId = searchParams.get('classId') || 'all';
  const assessmentId = searchParams.get('assessmentId') || 'latest';
  const yearStr = searchParams.get('year');
  const activeYear = yearStr ? parseInt(yearStr) : 2568; // Default year

  // State for Table
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Inline Editing State
  const [editingCell, setEditingCell] = useState<{ studentId: string; subTopicId: string } | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [cellLoadingState, setCellLoadingState] = useState<Record<string, boolean>>({});
  
  // Data Fetching
  const { data: subjects = [], isLoading: subjectsLoading } = useSubjectWithTopics(programId || 'none');
  const { data: studentsWithScoresFromDB = [], isLoading: studentsLoading } = useClassScores(classId);
  const { data: assessmentsData = [] } = useAssessments(programId);
  const assessments = assessmentsData as any[];
  const updateScoreMutation = useUpdateStudentScore();
  const { data: classesFromDB = [] } = useYearClasses(undefined); // Getting all classes mainly for name lookup

  // Identify Subject
  const subject = useMemo(() => {
    // Need to map subject first to match our structure
    const found = subjects.find((s: any) => s.id === subjectId);
    if (!found) return null;
    return {
      id: found.id,
      name: found.name,
      code: found.code,
      subTopics: found.sub_topics?.map((st: any) => ({
        id: st.id,
        name: st.name,
        maxScore: st.max_score,
      })) || []
    } as Subject;
  }, [subjects, subjectId]);
  
  // Process Scores
  const students = useMemo(() => {
    if (!studentsWithScoresFromDB) return [];
    
    // Calculate effective assessment ID
    const effectiveAssessmentId = assessmentId === 'latest' 
        ? (assessments.length > 0 ? assessments[0].id : '') 
        : assessmentId;

    return studentsWithScoresFromDB.map((dbStudent: any) => ({
      id: dbStudent.id,
      name: dbStudent.name,
      classId: dbStudent.class_id,
      scores: dbStudent.student_scores?.filter((score: any) => {
        if (effectiveAssessmentId) {
           return score.assessment_id === effectiveAssessmentId;
        }
        return true; 
      }).map((score: any) => ({
        subTopicId: score.sub_topic_id,
        score: score.score,
        assessmentId: score.assessment_id
      })) || []
    }));
  }, [studentsWithScoresFromDB, assessmentId, assessments]);

  // Filter Students
  const filteredStudents = useMemo(() => {
    if (!subject) return [];
    
    // 1. Filter by Class (if not handled by useClassScores 'all') AND Search
    // Note: useClassScores(classId) already filters by class on DB side unless classId is 'all'.
    
    return students.filter(student => {
       const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             student.id.toLowerCase().includes(searchQuery.toLowerCase());
       
       // Double check class if 'all' was passed but we want to be safe or if local filtering needed
       const matchesClass = classId === 'all' || student.classId === classId;
       
       return matchesSearch && matchesClass;
    });
  }, [students, searchQuery, classId, subject]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredStudents, currentPage]);

  // Calculate Stats
  const subjectStats = useMemo(() => {
     if (!subject || filteredStudents.length === 0) return { average: 0, highest: 0, lowest: 0, count: 0 };
     
     const percentages = filteredStudents.map(s => calculateSubjectScore(s, subject).percentage);
     return {
       average: percentages.reduce((a, b) => a + b, 0) / percentages.length,
       highest: Math.max(...percentages),
       lowest: Math.min(...percentages),
       count: filteredStudents.length
     };
  }, [subject, filteredStudents]);


  // Inline Edit Handlers
  useEffect(() => {
    if (editingCell && inputRef.current) {
       inputRef.current.focus();
       inputRef.current.select();
    }
  }, [editingCell]);
  
  const handleInlineScoreUpdate = async (studentId: string, subTopicId: string, newScore: number) => {
      const key = `${studentId}-${subTopicId}`;
      setCellLoadingState(prev => ({ ...prev, [key]: true }));

      // Find assessment ID
      let effectiveAssessmentId = assessmentId;
      if (effectiveAssessmentId === 'latest' && assessments.length > 0) {
          effectiveAssessmentId = assessments[0].id;
      }
      if (effectiveAssessmentId === 'all' || effectiveAssessmentId === 'latest') {
           // Fallback if still ambiguous, although 'latest' should be resolved.
           // If 'all', editing is weird. Assuming 'latest' for semantic correctness if user tries to edit.
           if (assessments.length > 0) effectiveAssessmentId = assessments[0].id;
      }

      try {
        await updateScoreMutation.mutateAsync({
           studentId,
           subTopicId,
           score: newScore,
           academicYear: activeYear,
           assessmentId: effectiveAssessmentId
        });
        toast.success("Score updated");
      } catch (err) {
        toast.error("Failed to update score");
      } finally {
        setCellLoadingState(prev => {
            const next = {...prev};
            delete next[key];
            return next;
        });
      }
  };

  const handleDoubleClick = (studentId: string, subTopicId: string, currentScore: number) => {
    if (assessmentId === 'all') return; // Prevent edit on 'all'
    setEditingCell({ studentId, subTopicId });
    setEditValue(currentScore.toString());
  };

  const handleSaveInline = (maxScore: number) => {
    if (!editingCell) return;
    const numValue = parseFloat(editValue);
    if (isNaN(numValue)) return;
    
    // Clamp
    const clamped = Math.max(0, Math.min(numValue, maxScore));
    handleInlineScoreUpdate(editingCell.studentId, editingCell.subTopicId, clamped);
    setEditingCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, maxScore: number) => {
    if (e.key === "Enter") handleSaveInline(maxScore);
    if (e.key === "Escape") setEditingCell(null);
  };

  // Rendering
  if (subjectsLoading || studentsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!subject) {
      return <div className="p-8">Subject not found</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/scores')}>
           <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
           <h1 className="text-2xl font-bold flex items-center gap-2">
             {subject.code} <span className="text-muted-foreground font-normal">| {subject.name}</span>
           </h1>
           <p className="text-muted-foreground text-sm">
             {filteredStudents.length} Students • Class Average: {subjectStats.average.toFixed(1)}%
           </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         <Card className="border-0 shadow-sm bg-card/50">
           <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Average</CardTitle></CardHeader>
           <CardContent><div className={cn("text-2xl font-bold", getScoreColor(subjectStats.average))}>{subjectStats.average.toFixed(1)}%</div></CardContent>
         </Card>
         <Card className="border-0 shadow-sm bg-card/50">
           <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Highest</CardTitle></CardHeader>
           <CardContent><div className="text-2xl font-bold text-emerald-600">{subjectStats.highest.toFixed(1)}%</div></CardContent>
         </Card>
         <Card className="border-0 shadow-sm bg-card/50">
           <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Lowest</CardTitle></CardHeader>
           <CardContent><div className="text-2xl font-bold text-red-600">{subjectStats.lowest.toFixed(1)}%</div></CardContent>
         </Card>
         <Card className="border-0 shadow-sm bg-card/50">
           <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Students</CardTitle></CardHeader>
           <CardContent><div className="text-2xl font-bold">{subjectStats.count}</div></CardContent>
         </Card>
      </div>

      {/* Toolbar */}
      <div className="flex justify-between items-center">
         <div className="relative w-72">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
           <Input 
             placeholder="Search students..." 
             className="pl-9"
             value={searchQuery}
             onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
           />
         </div>
      </div>

      {/* Table */}
      <Card className="border-0 shadow-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[50px]">#</TableHead>
              <TableHead className="w-[200px]">Student Name</TableHead>
              <TableHead className="w-[100px]">Class</TableHead>
              {subject.subTopics.map((subTopic) => (
                <TableHead key={subTopic.id} className="text-center min-w-[100px]">
                  <div className="flex flex-col items-center">
                    <span className="font-semibold text-foreground">{subTopic.name}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      (Max: {subTopic.maxScore})
                    </span>
                  </div>
                </TableHead>
              ))}
              <TableHead className="text-center w-[120px] bg-muted/20">คะแนนรวม</TableHead>
              <TableHead className="text-center w-[120px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedStudents.length === 0 ? (
               <TableRow><TableCell colSpan={subject.subTopics.length + 5} className="text-center h-24">No students found</TableCell></TableRow>
            ) : (
                paginatedStudents.map((student, index) => {
                  const stats = calculateSubjectScore(student, subject);
                  // Calculate absolute index for row numbering
                  const absoluteIndex = (currentPage - 1) * itemsPerPage + index + 1;
                  
                  return (
                    <TableRow key={student.id} className="group transition-colors hover:bg-muted/30">
                      <TableCell className="font-medium text-muted-foreground">{absoluteIndex}</TableCell>
                      <TableCell>
                        <div className="font-medium text-foreground">{student.name}</div>
                        <div className="text-xs text-muted-foreground">{student.id}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal text-muted-foreground">
                           {classesFromDB.find((c: any) => c.class_id === student.classId)?.class_name || student.classId}
                        </Badge>
                      </TableCell>
                      
                      {subject.subTopics.map((subTopic) => {
                        const scoreEntry = student.scores?.find((s) => s.subTopicId === subTopic.id);
                        const scoreValue = scoreEntry?.score ?? 0;
                        const isEditing = editingCell?.studentId === student.id && editingCell?.subTopicId === subTopic.id;
                        const key = `${student.id}-${subTopic.id}`;
                        const isLoading = cellLoadingState[key];
                        
                        return (
                          <TableCell key={subTopic.id} className="p-0 relative">
                             {isEditing ? (
                               <div className="px-2 py-1">
                                 <Input
                                   ref={inputRef}
                                   type="number"
                                   className="h-8 w-20 text-center mx-auto"
                                   value={editValue}
                                   onChange={e => setEditValue(e.target.value)}
                                   onKeyDown={e => handleKeyDown(e, subTopic.maxScore)}
                                   onBlur={() => handleSaveInline(subTopic.maxScore)}
                                 />
                               </div>
                             ) : (
                               <div 
                                 className="h-full w-full py-4 text-center cursor-pointer hover:bg-muted/50 transition-colors flex items-center justify-center relative"
                                 onDoubleClick={() => handleDoubleClick(student.id, subTopic.id, scoreValue)}
                               >
                                  {isLoading ? (
                                     <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                  ) : (
                                     <span className={cn(
                                        "font-medium",
                                        scoreValue === 0 && "text-muted-foreground/50",
                                        scoreValue === subTopic.maxScore && "text-emerald-600 font-bold"
                                     )}>
                                       {scoreValue}
                                     </span>
                                  )}
                               </div>
                             )}
                          </TableCell>
                        );
                      })}
                      
                      <TableCell className="text-center font-bold bg-muted/20">
                         <span className={getScoreColor(stats.percentage)}>{stats.percentage.toFixed(1)}%</span>
                         <div className="text-xs font-normal text-muted-foreground">{stats.score} / {stats.maxScore}</div>
                      </TableCell>
                      
                      <TableCell className="text-center">
                         <Badge 
                           variant="secondary" 
                           className={cn("w-24 justify-center pointer-events-none", getScoreBadge(stats.percentage).className)}
                         >
                           {getScoreBadge(stats.percentage).label}
                         </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <Pagination className="mt-4">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                href="#" 
                onClick={(e) => { e.preventDefault(); if(currentPage > 1) setCurrentPage(p => p - 1); }} 
                aria-disabled={currentPage === 1}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            
            {/* Simple Pagination Logic for brevity - better to use a sophisticated range generator */}
            {Array.from({ length: totalPages }).map((_, i) => (
               <PaginationItem key={i}>
                 <PaginationLink 
                   href="#" 
                   isActive={currentPage === i + 1}
                   onClick={(e) => { e.preventDefault(); setCurrentPage(i + 1); }}
                 >
                   {i + 1}
                 </PaginationLink>
               </PaginationItem>
            ))}

            <PaginationItem>
              <PaginationNext 
                href="#"
                onClick={(e) => { e.preventDefault(); if(currentPage < totalPages) setCurrentPage(p => p + 1); }}
                aria-disabled={currentPage === totalPages}
                className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

    </div>
  );
}
