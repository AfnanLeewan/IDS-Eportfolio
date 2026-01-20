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
  Plus
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
  mockStudents,
  classGroups,
  preALevelProgram,
  getSubjectScore,
  getTotalScore,
  getClassAverage,
  Student,
  Subject,
} from "@/lib/mockData";
import { ScoreEditDialog } from "./ScoreEditDialog";
import { AddStudentScoreDialog } from "./AddStudentScoreDialog";
import { SubTopicComparisonChart } from "./SubTopicComparisonChart";
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

export function ScoresView({ students: initialStudents = mockStudents }: ScoresViewProps) {
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSubjects, setExpandedSubjects] = useState<string[]>([]);
  
  // CRUD state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedSubjectForEdit, setSelectedSubjectForEdit] = useState<Subject | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<{ student: Student; subject: Subject } | null>(null);

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesClass = selectedClass === "all" || student.classId === selectedClass;
      const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesClass && matchesSearch;
    });
  }, [students, selectedClass, searchQuery]);

  const subjects = selectedSubject === "all" 
    ? preALevelProgram.subjects 
    : preALevelProgram.subjects.filter(s => s.id === selectedSubject);

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

  const handleAddClick = (subject: Subject) => {
    setSelectedSubjectForEdit(subject);
    setAddDialogOpen(true);
  };

  const handleDeleteClick = (student: Student, subject: Subject) => {
    setStudentToDelete({ student, subject });
    setDeleteDialogOpen(true);
  };

  const handleSaveScores = (studentId: string, newScores: { subTopicId: string; score: number }[]) => {
    setStudents((prev) =>
      prev.map((student) => {
        if (student.id !== studentId) return student;
        const updatedScores = student.scores.map((score) => {
          const newScore = newScores.find((ns) => ns.subTopicId === score.subTopicId);
          return newScore ? { ...score, score: newScore.score } : score;
        });
        return { ...student, scores: updatedScores };
      })
    );
    toast.success("Scores updated successfully");
  };

  const handleInlineScoreUpdate = (studentId: string, subTopicId: string, newScore: number) => {
    setStudents((prev) =>
      prev.map((student) => {
        if (student.id !== studentId) return student;
        const updatedScores = student.scores.map((score) => {
          if (score.subTopicId === subTopicId) {
            return { ...score, score: newScore };
          }
          return score;
        });
        return { ...student, scores: updatedScores };
      })
    );
    toast.success("Score updated");
  };

  const handleAddStudent = (newStudent: {
    id: string;
    name: string;
    classId: string;
    scores: { subTopicId: string; score: number }[];
  }) => {
    // Check if student already exists
    const existingStudent = students.find((s) => s.id === newStudent.id);
    if (existingStudent) {
      // Add new scores to existing student
      setStudents((prev) =>
        prev.map((student) => {
          if (student.id !== newStudent.id) return student;
          const existingScoreIds = new Set(student.scores.map((s) => s.subTopicId));
          const additionalScores = newStudent.scores.filter(
            (ns) => !existingScoreIds.has(ns.subTopicId)
          );
          return {
            ...student,
            scores: [...student.scores, ...additionalScores],
          };
        })
      );
    } else {
      // Create new student with scores
      const fullStudent: Student = {
        id: newStudent.id,
        name: newStudent.name,
        classId: newStudent.classId,
        scores: newStudent.scores,
      };
      setStudents((prev) => [...prev, fullStudent]);
    }
    toast.success("Student added successfully");
  };

  const handleDeleteStudent = () => {
    if (!studentToDelete) return;
    const { student, subject } = studentToDelete;
    
    // Remove scores for this subject from the student
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id !== student.id) return s;
        const subTopicIds = new Set(subject.subTopics.map((st) => st.id));
        return {
          ...s,
          scores: s.scores.filter((score) => !subTopicIds.has(score.subTopicId)),
        };
      })
    );
    
    setDeleteDialogOpen(false);
    setStudentToDelete(null);
    toast.success("Student scores deleted successfully");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Score Report</h2>
          <p className="text-muted-foreground">
            View detailed scores for all students by class and subject
          </p>
        </div>
        <Button className="gap-2 gradient-primary text-primary-foreground rounded-xl">
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-card">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by student name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-border bg-muted/50 py-2.5 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            <div className="flex gap-3">
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="w-[160px] rounded-xl">
                  <SelectValue placeholder="Select Class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classGroups.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="w-[180px] rounded-xl">
                  <SelectValue placeholder="Select Subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {preALevelProgram.subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-0 shadow-card">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Students</p>
            <p className="text-3xl font-bold text-foreground">{filteredStudents.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-card">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Class Average</p>
            <p className="text-3xl font-bold text-emerald-600">
              {(filteredStudents.reduce((acc, s) => acc + getTotalScore(s).percentage, 0) / filteredStudents.length || 0).toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-card">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Highest Score</p>
            <p className="text-3xl font-bold text-blue-600">
              {Math.max(...filteredStudents.map(s => getTotalScore(s).percentage)).toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-card">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Lowest Score</p>
            <p className="text-3xl font-bold text-amber-600">
              {Math.min(...filteredStudents.map(s => getTotalScore(s).percentage)).toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sub-topic Comparison Chart */}
      <SubTopicComparisonChart students={filteredStudents} />

      {/* Scores by Subject */}
      <TooltipProvider>
        {subjects.map((subject) => (
          <SubjectScoreTable
            key={subject.id}
            subject={subject}
            students={filteredStudents}
            isExpanded={expandedSubjects.includes(subject.id)}
            onToggle={() => toggleSubject(subject.id)}
            getScoreColor={getScoreColor}
            getScoreBadge={getScoreBadge}
            getTrendIcon={getTrendIcon}
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
            onAdd={handleAddClick}
            onInlineScoreUpdate={handleInlineScoreUpdate}
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

      <AddStudentScoreDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        subject={selectedSubjectForEdit}
        onAdd={handleAddStudent}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Student Scores</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {studentToDelete?.student.name}'s scores for {studentToDelete?.subject.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteStudent} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface SubjectScoreTableProps {
  subject: Subject;
  students: Student[];
  isExpanded: boolean;
  onToggle: () => void;
  getScoreColor: (percentage: number) => string;
  getScoreBadge: (percentage: number) => { label: string; className: string };
  getTrendIcon: (studentScore: number, classAverage: number) => React.ReactNode;
  onEdit: (student: Student, subject: Subject) => void;
  onDelete: (student: Student, subject: Subject) => void;
  onAdd: (subject: Subject) => void;
  onInlineScoreUpdate: (studentId: string, subTopicId: string, newScore: number) => void;
}

function SubjectScoreTable({
  subject,
  students,
  isExpanded,
  onToggle,
  getScoreColor,
  getScoreBadge,
  getTrendIcon,
  onEdit,
  onDelete,
  onAdd,
  onInlineScoreUpdate,
}: SubjectScoreTableProps) {
  const [editingCell, setEditingCell] = useState<{ studentId: string; subTopicId: string } | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Calculate subject statistics
  const subjectStats = useMemo(() => {
    if (students.length === 0) {
      return { average: 0, highest: 0, lowest: 0, totalStudents: 0 };
    }
    
    const percentages = students.map(s => getSubjectScore(s, subject.id).percentage);
    const average = percentages.reduce((acc, p) => acc + p, 0) / percentages.length;
    const highest = Math.max(...percentages);
    const lowest = Math.min(...percentages);
    
    return {
      average,
      highest,
      lowest,
      totalStudents: students.length,
    };
  }, [students, subject.id]);

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
                      {subject.subTopics.length} sub-topics • Average: {subjectAverage.toFixed(1)}%
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

              {/* Add Button */}
              <div className="flex justify-end mb-4">
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAdd(subject);
                  }}
                  className="gap-2 gradient-primary text-primary-foreground"
                >
                  <Plus className="h-4 w-4" />
                  Add Student
                </Button>
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
                      <TableHead className="text-center font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => {
                      const subjectScore = getSubjectScore(student, subject.id);
                      const classGroup = classGroups.find(c => c.id === student.classId);
                      
                      return (
                        <TableRow key={student.id} className="hover:bg-muted/30">
                          <TableCell className="font-mono text-sm">{student.id}</TableCell>
                          <TableCell className="font-medium">{student.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="rounded-full">
                              {classGroup?.name || student.classId}
                            </Badge>
                          </TableCell>
                          {subject.subTopics.map((subTopic) => {
                            const scoreEntry = student.scores.find(
                              (s) => s.subTopicId === subTopic.id
                            );
                            const score = scoreEntry?.score || 0;
                            const percentage = (score / subTopic.maxScore) * 100;
                            const isEditing = editingCell?.studentId === student.id && editingCell?.subTopicId === subTopic.id;
                            
                            return (
                              <TableCell key={subTopic.id} className="text-center p-1">
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
                          <TableCell className="text-center">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(student, subject);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete Scores</TooltipContent>
                            </Tooltip>
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
