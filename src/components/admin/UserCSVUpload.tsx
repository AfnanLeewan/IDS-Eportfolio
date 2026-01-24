import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Upload, FileText, Loader2, AlertTriangle, Check, Download, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCreateUser, useCreateStudent, useClasses } from "@/hooks/useSupabaseData";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

interface UserCSVRow {
  name: string;
  email: string;
  password: string;
  role: string;
  class?: string; // Optional class name for students
  student_id?: string; // Optional student ID (e.g. school ID)
}

export function UserCSVUpload() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<UserCSVRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  
  const createUserMutation = useCreateUser();
  const createStudentMutation = useCreateStudent();
  const { data: classes = [] } = useClasses();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseCSV(selectedFile);
    }
  };

  const parseCSV = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as any[];
        // Validate headers/content roughly
        const validRows = rows.filter(r => r.name && r.email && r.password && r.role).map(r => ({
          name: r.name,
          email: r.email.toLowerCase(),
          password: r.password,
          role: r.role.toLowerCase(), // Normalize role
          class: r['class'] || r['class_name'] || '',
          student_id: r['student_id'] || r['studentId'] || ''
        }));
        
        if (validRows.length === 0) {
          toast({
            title: "Error",
            description: "No valid rows found. Check column headers: name, email, password, role, class, student_id",
            variant: "destructive"
          });
          setFile(null);
        } else {
          setParsedData(validRows);
          setLogs([`Ready to process ${validRows.length} users.`]);
        }
      },
      error: (error) => {
        toast({ title: "CSV Parse Error", description: error.message, variant: "destructive" });
      }
    });
  };

  const processUpload = async () => {
    setIsProcessing(true);
    setProgress(0);
    const newLogs: string[] = [];
    let successCount = 0;
    
    // Helper to add log
    const addLog = (msg: string) => {
        setLogs(prev => [...prev, msg]);
    }

    for (let i = 0; i < parsedData.length; i++) {
        const row = parsedData[i];
        const progressValue = Math.round(((i) / parsedData.length) * 100);
        setProgress(progressValue);
        
        try {
            // Determine class ID
            let classId = "";
            if (row.class) {
                const matchedClass = classes.find(c => c.name.trim().toLowerCase() === row.class?.trim().toLowerCase());
                if (matchedClass) {
                    classId = matchedClass.id;
                } else {
                     addLog(`⚠️ Class not found: "${row.class}" for ${row.name}.`);
                }
            }

            // Determine student ID
            const studentId = row.student_id && row.student_id.trim() !== '' 
              ? row.student_id 
              : crypto.randomUUID();

            if (!row.student_id && row.role === 'student') {
               addLog(`ℹ️ No student_id provided for ${row.name}, generated random ID: ${studentId}`);
            }

            // Call Edge Function
            // Note: This requires the 'admin-create-user' function to be deployed/served
            const { data, error } = await supabase.functions.invoke('admin-create-user', {
              body: {
                email: row.email,
                password: row.password,
                fullName: row.name,
                role: row.role,
                studentId: studentId,
                classId: classId,
                confirmed: true
              }
            });

            if (error) {
              // Fallback to SQL (Previous Method) if Function fails or not found?
              // No, let's trust the error. 
              // BUT, if the user hasn't deployed the function, this will block them.
              // I will leave the old method as a fallback only if status is 404
              if (error.code === 'FUNCTION_NOT_FOUND' || error.status === 404) {
                   addLog(`⚠️ Edge Function not found. Falling back to SQL RPC...`);
                   const userId = await createUserMutation.mutateAsync({
                        email: row.email,
                        password: row.password,
                        fullName: row.name,
                        role: row.role
                   });
                   
                   // Handle student creation manually if fallback used
                   if (row.role === 'student' && userId) {
                       await createStudentMutation.mutateAsync({
                         id: studentId,
                         name: row.name,
                         email: row.email,
                         user_id: userId,
                         class_id: classId || undefined 
                     } as any); 
                   }
                   addLog(`✅ Created user (SQL Fallback): ${row.email}`);
              } else {
                  throw new Error(error.message || "Failed to invoke admin function");
              }
            } else {
               addLog(`✅ Created user: ${row.email} (${row.role})`);
            }
            successCount++;

        } catch (error: any) {
            addLog(`❌ Failed ${row.email}: ${error.message || 'Unknown error'}`);
        }
    }

    setProgress(100);
    setIsProcessing(false);
    toast({
        title: "Batch Process Complete",
        description: `Successfully processed ${successCount} of ${parsedData.length} users.`,
    });
  };

  const downloadTemplate = () => {
    const csvContent = "name,email,password,role,class,student_id\nJohn Doe,john@example.com,pass1234,student,M.6/1,64001\nTeacher A,teacher@school.com,securepass,teacher,,";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'user_import_template.csv';
    a.click();
  };

  const reset = () => {
    setFile(null);
    setParsedData([]);
    setLogs([]);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <Dialog open={open} onOpenChange={(o) => {
        if (!o) reset();
        setOpen(o);
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Users via CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file with columns: name, email, password, role, class (optional).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
            {/* Template Download */}
            <div className="flex justify-between items-center bg-muted/30 p-3 rounded-lg">
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Need the format?
                </div>
                <Button variant="ghost" size="sm" onClick={downloadTemplate} className="gap-1 text-primary">
                    <Download className="h-4 w-4" />
                    Download Template
                </Button>
            </div>

            {/* File Input */}
            {!file ? (
                <div 
                    className="border-2 border-dashed border-muted-foreground/25 rounded-xl p-8 text-center hover:bg-muted/50 transition cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept=".csv" 
                        onChange={handleFileChange} 
                    />
                    <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                    <p className="font-medium">Click to upload CSV</p>
                    <p className="text-sm text-muted-foreground mt-1">Supports bulk user creation</p>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-background">
                        <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-primary" />
                            <div>
                                <p className="font-medium text-sm truncate max-w-[200px]">{file.name}</p>
                                <p className="text-xs text-muted-foreground">{parsedData.length} users found</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={reset} disabled={isProcessing}>
                            <X className="h-4 w-4" /> // Check if X icon is imported
                        </Button>
                    </div>

                    {/* Progress */}
                    {isProcessing && (
                         <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                                <span>Processing...</span>
                                <span>{progress}%</span>
                            </div>
                            <Progress value={progress} className="h-2" />
                        </div>
                    )}

                    {/* Logs */}
                    <ScrollArea className="h-[200px] w-full rounded-md border p-4 bg-muted/50">
                        <div className="space-y-1">
                            {logs.map((log, i) => (
                                <p key={i} className="text-xs font-mono break-all text-muted-foreground">
                                    {log}
                                </p>
                            ))}
                            {logs.length === 0 && <p className="text-xs text-muted-foreground/50 text-center py-8">Logs will appear here...</p>}
                        </div>
                    </ScrollArea>
                </div>
            )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isProcessing}>
             Close
          </Button>
          <Button onClick={processUpload} disabled={!file || isProcessing || parsedData.length === 0}>
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Start Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
