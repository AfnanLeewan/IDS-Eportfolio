import { useState, useRef, useMemo } from "react";
import Papa from "papaparse";
import { Upload, Download, AlertTriangle, FileText, Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast"; // Adjust path if needed (might be from sonner direct or hook)
import { 
  useSubjects, 
  useClasses, 
  useStudents, // Should support filtering by program/class
  useCreateSubTopic,
  useUpsertStudentScores,
  useSubTopics,
  useYearPrograms,
  useTeacherAssignments
} from "@/hooks/useSupabaseData";
import { useAuth } from "@/contexts/AuthContext";

interface ScoreUploadDialogProps {
  programId?: string;
  subjectId?: string;
  activeYearId?: string;
  onSuccess?: () => void;
}

export function ScoreUploadDialog({ 
  programId: initialProgramId, 
  subjectId: initialSubjectId,
  activeYearId,
  onSuccess 
}: ScoreUploadDialogProps) {
  const { toast } = useToast();
  
  // State
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedProgramId, setSelectedProgramId] = useState(initialProgramId || "");
  const [selectedSubjectId, setSelectedSubjectId] = useState(initialSubjectId || "");
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  
  // Lesson/Subtopic processing state
  const [lessonColumns, setLessonColumns] = useState<string[]>([]);
  const [lessonMaxScores, setLessonMaxScores] = useState<Record<string, number>>({});
  const [existingLessons, setExistingLessons] = useState<Record<string, any>>({}); // Map name -> dbObject
  const [newLessons, setNewLessons] = useState<string[]>([]);
  
  // Hooks
  const { user, role } = useAuth();
  const isTeacher = role === 'teacher';
  const isAdmin = role === 'admin';
  
  const { data: programs = [] } = useYearPrograms(activeYearId || "");
  const { data: allSubjects = [] } = useSubjects(selectedProgramId);
  const { data: assignments = [] } = useTeacherAssignments(isTeacher ? user?.id : undefined);

  // Filter subjects for teachers
  const subjects = useMemo(() => {
    if (!allSubjects) return [];
    if (isTeacher && !isAdmin) {
      const assignedIds = new Set(assignments.map((a: any) => a.subject_id));
      return allSubjects.filter(s => assignedIds.has(s.id));
    }
    return allSubjects;
  }, [allSubjects, isTeacher, isAdmin, assignments]);

  const { data: subTopics = [] } = useSubTopics(selectedSubjectId);
  
  // We need students to generate template
  // Assuming useStudents returns all active students. We might want to filter by class in template generation but let's dump all for now.
  const { data: allStudents = [] } = useStudents(); 
  const { data: classes = [] } = useClasses();

  // Mutations
  const createSubTopic = useCreateSubTopic();
  const upsertScores = useUpsertStudentScores();

  // Reset state when opening
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setStep(1);
      setFile(null);
      setParsedData([]);
      setLessonColumns([]);
      setLessonMaxScores({});
    }
  };

  const handleDownloadTemplate = () => {
    if (!selectedProgramId) {
      toast({ title: "Error", description: "Please select a program first", variant: "destructive" });
      return;
    }

    // Filter students by program classes
    // This requires mapping classes to program. 
    // Simplified: Just ALL students with their classes.
    
    // CSV Structure: Student ID, Name, Class, [Existing Subtopics...]
    const csvHeaders = ["Student ID", "Name", "Class"];
    const existingSubTopics = subTopics.map(st => st.name);
    csvHeaders.push(...existingSubTopics);
    
    // Add placeholders if no subtopics
    if (existingSubTopics.length === 0) {
      csvHeaders.push("Lesson 1");
    }

    const csvRows = allStudents.map((s: any) => {
      // Find class name
      const className = classes.find(c => c.id === s.class_id)?.name || s.class_id;
      return [s.id, s.name, className, ...Array(csvHeaders.length - 3).fill("")];
    });

    const csvData = [csvHeaders, ...csvRows];
    const csvString = Papa.unparse(csvData);
    
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `score_template_${selectedSubjectId || "subject"}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;
    setFile(uploadedFile);
  };

  const handleParse = () => {
    if (!file || !selectedSubjectId) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          toast({ title: "Error parsing CSV", description: "Please check the file format", variant: "destructive" });
          return;
        }
        
        const data = results.data as any[];
        const meta = results.meta;
        const fileHeaders = meta.fields || [];
        
        if (!fileHeaders.includes("Student ID") && !fileHeaders.includes("student_id")) { // Basic validation
           // Try detection: Column 0 usually ID
        }

        // Identify Lesson Columns (Any column NOT in Excluded List)
        // Excluded: Student ID, ID, Name, Class, etc.
        const excludedHeaders = ["Student ID", "student_id", "id", "Name", "name", "Class", "class", "class_name", "No", "no"];
        const potentialLessons = fileHeaders.filter(h => !excludedHeaders.some(eh => eh.toLowerCase() === h.toLowerCase()));
        
        // Analyze Lessons
        const existing: Record<string, any> = {};
        const newL: string[] = [];
        const maxScores: Record<string, number> = {};

        potentialLessons.forEach(lessonName => {
          const match = subTopics.find(st => st.name.toLowerCase() === lessonName.toLowerCase());
          if (match) {
            existing[lessonName] = match;
            maxScores[lessonName] = match.max_score; // Default to existing max score
          } else {
            newL.push(lessonName);
            maxScores[lessonName] = 20; // Default new max score
          }
        });

        setParsedData(data);
        setHeaders(fileHeaders);
        setLessonColumns(potentialLessons);
        setExistingLessons(existing);
        setNewLessons(newL);
        setLessonMaxScores(maxScores);
        setStep(2);
      }
    });
  };

  const handleSubmit = async () => {
    try {
      // 1. Create New Sub-topics
      const subject = subjects.find(s => s.id === selectedSubjectId);
      const currentOrder = subject?.sub_topics?.length || subTopics.length || 0;
      
      const createdSubTopicsMap: Record<string, string> = {}; // Name -> ID

      // We need to wait for creations
      for (const [index, lessonName] of newLessons.entries()) {
        // Generate ID: subjectId-lessonNameSlug
        const slug = lessonName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        // Add timestamp to ensure uniqueness if lesson names are generic like 'Test'
        const uniqueSuffix = Date.now().toString().slice(-4);
        const subTopicId = `${selectedSubjectId}-${slug}-${uniqueSuffix}`;

        const result = await createSubTopic.mutateAsync({
          id: subTopicId,
          subject_id: selectedSubjectId,
          name: lessonName,
          max_score: lessonMaxScores[lessonName],
          display_order: currentOrder + index + 1
        });
        
        // Use the ID we generated (result should match, but let's be safe)
        if (result && result.id) {
          createdSubTopicsMap[lessonName] = result.id;
        } else {
           // Fallback if result is void/null (though Supabase usually returns it if .select() used)
           createdSubTopicsMap[lessonName] = subTopicId;
        }
      }

      // 2. Prepare Scores
      const scoresToUpsert: any[] = [];
      
      parsedData.forEach(row => {
        // Find student ID
        const studentId = row["Student ID"] || row["student_id"] || row["id"];
        if (!studentId) return;

        lessonColumns.forEach(lessonName => {
          const scoreVal = row[lessonName];
          if (scoreVal === "" || scoreVal === undefined) return;
          
          const score = parseFloat(scoreVal);
          if (isNaN(score)) return;

          // Resolve SubTopic ID
          let subTopicId = existingLessons[lessonName]?.id;
          if (!subTopicId) {
            subTopicId = createdSubTopicsMap[lessonName];
          }

          if (subTopicId) {
            scoresToUpsert.push({
              student_id: studentId,
              sub_topic_id: subTopicId,
              score: score
            });
          }
        });
      });

      // 3. Upsert Scores
      if (scoresToUpsert.length > 0) {
        await upsertScores.mutateAsync({ scores: scoresToUpsert });
      } else {
        toast({ title: "Warning", description: "No valid scores found to upload", variant: "default" });
      }

      setIsOpen(false);
      onSuccess?.();

    } catch (error: any) {
      console.error(error);
      toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg border-0 hover:from-indigo-600 hover:to-purple-700">
          <Upload className="h-4 w-4" />
          อัปโหลดคะแนน
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>อัปโหลดคะแนน (Upload Scores)</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Program</Label>
                <Select value={selectedProgramId} onValueChange={setSelectedProgramId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Program" />
                  </SelectTrigger>
                  <SelectContent>
                    {programs.map((p: any) => (
                      <SelectItem key={p.program_id} value={p.program_id}>{p.program_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subject</Label>
                <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>{s.code} - {s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-2 border-dashed rounded-xl p-8 text-center space-y-4 hover:bg-muted/50 transition-colors">
              <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
              <div>
                <p className="font-medium">Click to upload or drag and drop</p>
                <p className="text-sm text-muted-foreground">CSV files only</p>
              </div>
              <Input 
                type="file" 
                accept=".csv" 
                className="hidden" 
                id="file-upload"
                onChange={handleFileUpload}
              />
              <Button variant="outline" onClick={() => document.getElementById('file-upload')?.click()}>
                Select File
              </Button>
              {file && <p className="text-sm font-medium text-primary">{file.name}</p>}
            </div>

            <div className="flex justify-between items-center bg-muted/30 p-4 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>Need a template?</span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleDownloadTemplate} disabled={!selectedProgramId}>
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 py-4">
            <Alert>
              <Check className="h-4 w-4" />
              <AlertTitle>File Parsed Successfully</AlertTitle>
              <AlertDescription>
                Found {parsedData.length} records and {lessonColumns.length} potential score columns.
              </AlertDescription>
            </Alert>

            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-4">
                {lessonColumns.map(lesson => {
                  const exists = !!existingLessons[lesson];
                  return (
                    <div key={lesson} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-semibold">{lesson}</Label>
                        {exists ? (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Exists - Will Overwrite
                          </span>
                        ) : (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                            New Lesson
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Max Score</Label>
                          <Input 
                            type="number" 
                            value={lessonMaxScores[lesson]} 
                            onChange={(e) => setLessonMaxScores(prev => ({ ...prev, [lesson]: parseInt(e.target.value) || 0 }))}
                            className="h-8"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}

        <DialogFooter>
          {step === 1 ? (
            <Button onClick={handleParse} disabled={!file || !selectedSubjectId}>
              Next: Review
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button 
                onClick={handleSubmit} 
                disabled={upsertScores.isPending || createSubTopic.isPending}
                className="gradient-primary text-primary-foreground"
              >
                {(upsertScores.isPending || createSubTopic.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Upload
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
