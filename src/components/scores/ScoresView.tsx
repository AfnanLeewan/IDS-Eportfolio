import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { 
  ChevronDown, 
  Filter, 
  Download, 
  Search,
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react";
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

interface ScoresViewProps {
  students?: Student[];
}

export function ScoresView({ students = mockStudents }: ScoresViewProps) {
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSubjects, setExpandedSubjects] = useState<string[]>([]);

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

      {/* Scores by Subject */}
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
        />
      ))}
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
}

function SubjectScoreTable({
  subject,
  students,
  isExpanded,
  onToggle,
  getScoreColor,
  getScoreBadge,
  getTrendIcon,
}: SubjectScoreTableProps) {
  const subjectAverage = students.reduce((acc, s) => {
    return acc + getSubjectScore(s, subject.id).percentage;
  }, 0) / students.length || 0;

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
                <div className="flex items-center gap-4">
                  <Badge className={cn("rounded-full", getScoreBadge(subjectAverage).className)}>
                    {getScoreBadge(subjectAverage).label}
                  </Badge>
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 text-muted-foreground transition-transform",
                      isExpanded && "rotate-180"
                    )}
                  />
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
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
                            
                            return (
                              <TableCell key={subTopic.id} className="text-center">
                                <span className={cn("font-medium", getScoreColor(percentage))}>
                                  {score}
                                </span>
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
