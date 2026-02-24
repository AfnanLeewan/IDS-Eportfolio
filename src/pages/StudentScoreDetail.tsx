
import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { YearSelector } from "@/components/common/YearSelector";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
   useCurrentAcademicYear,
   useClassPrograms,
   useAssessments,
   useSubjectWithTopics,
   useStudentScores,
   useCurrentStudent
} from "@/hooks/useSupabaseData";

export default function StudentScoreDetail() {
   const navigate = useNavigate();
   const [searchParams, setSearchParams] = useSearchParams();
   const { user } = useAuth();
   const studentId = user?.id;

   // 1. Fetch Student Info (to get Class ID)
   const { data: currentStudent, isLoading: isStudentLoading } = useCurrentStudent();

   // 2. Year Selection
   const { data: currentYear } = useCurrentAcademicYear();
   const [selectedYear, setSelectedYear] = useState<number | null>(null);

   // Compute allowed years based on the student's current class
   const allowedYears = useMemo(() => {
      const studentClasses: any = currentStudent?.classes;
      if (studentClasses && studentClasses.academic_year) {
         return [studentClasses.academic_year];
      }
      return [];
   }, [currentStudent]);

   // Update selected year automatically if there's only one allowed year
   useEffect(() => {
      if (allowedYears.length === 1 && selectedYear !== allowedYears[0]) {
         setSelectedYear(allowedYears[0]);
      }
   }, [allowedYears, selectedYear]);

   const activeYear = selectedYear || currentYear?.year_number || 2568;

   // 3. Program Selection
   const { data: programs = [], isLoading: isProgramsLoading } = useClassPrograms(currentStudent?.class_id);
   const [selectedProgramId, setSelectedProgramId] = useState<string>("");

   // Initialize Program
   useEffect(() => {
      // If URL has programId, use it
      const urlProgramId = searchParams.get('programId');
      if (urlProgramId) {
         setSelectedProgramId(urlProgramId);
      } else if (programs.length > 0 && !selectedProgramId) {
         // Default to first active or first
         const defaultProgram = programs.find((p: any) => p.is_active) || programs[0];
         setSelectedProgramId(defaultProgram.id || defaultProgram.program_id); // Handle variation in object shape if any
      }
   }, [programs, searchParams]);

   // Update URL when program changes
   useEffect(() => {
      if (selectedProgramId) {
         setSearchParams(prev => {
            prev.set('programId', selectedProgramId);
            return prev;
         });
      }
   }, [selectedProgramId, setSearchParams]);

   // 4. Data Fetching based on Program
   const { data: assessments = [] } = useAssessments(selectedProgramId);
   const { data: rawSubjects = [], isLoading: subjectsLoading } = useSubjectWithTopics(selectedProgramId || undefined);
   const { data: allScores = [] } = useStudentScores(currentStudent?.id || ""); // Use Profile ID

   // Initialize with first subject
   const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");

   useEffect(() => {
      if (rawSubjects.length > 0 && !selectedSubjectId) {
         setSelectedSubjectId(rawSubjects[0].id);
      } else if (rawSubjects.length > 0 && !rawSubjects.find((s: any) => s.id === selectedSubjectId)) {
         // If selected subject is not in the new list (e.g. program changed), reset
         setSelectedSubjectId(rawSubjects[0].id);
      }
   }, [rawSubjects, selectedSubjectId]);

   const selectedSubject = useMemo(() => {
      return rawSubjects.find((s: any) => s.id === selectedSubjectId);
   }, [rawSubjects, selectedSubjectId]);

   // Filter Scores for Matrix
   const filteredScores = useMemo(() => {
      if (!studentId || !selectedSubjectId) return [];

      return allScores.filter((s: any) => {
         // Filter by Subject (via sub_topics? No, scores link to sub_topics)
         const isSubject = selectedSubject?.sub_topics?.some((st: any) => st.id === s.sub_topic_id);
         const isYear = activeYear ? s.academic_year === activeYear : true;

         return isSubject && isYear;
      });
   }, [allScores, selectedSubject, activeYear, selectedSubjectId, currentStudent?.id]);

   // Scores Map: [SubTopicID][AssessmentID] -> Score
   const scoreMatrix = useMemo(() => {
      const map = new Map<string, Map<string, number>>();
      filteredScores.forEach((s: any) => {
         if (!map.has(s.sub_topic_id)) {
            map.set(s.sub_topic_id, new Map());
         }
         map.get(s.sub_topic_id)?.set(s.assessment_id, s.score);
      });
      return map;
   }, [filteredScores]);

   // Rendering
   if (isStudentLoading || isProgramsLoading && !selectedProgramId) {
      return (
         <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
         </div>
      );
   }

   return (
      <div className="container mx-auto p-6 space-y-6 max-w-7xl animate-in fade-in duration-500">
         {/* Header */}
         <div className="flex items-center gap-4">
            <div>
               <h1 className="text-2xl font-bold"> คะแนนรายวิชา</h1>
               <p className="text-muted-foreground"> คะแนนรายวิชาแต่ละบทในแต่ละรอบการสอบ</p>
            </div>
         </div>

         {/* Filters */}
         <Card className="border-0 shadow-sm bg-muted/30">
            <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-end md:items-center justify-between">
               <div className="flex flex-col md:flex-row gap-4 w-full">
                  <div className="space-y-1.5 w-full md:w-[200px]">
                     <label className="text-xs font-semibold uppercase text-muted-foreground">ปีการศึกษา</label>
                     <YearSelector
                        value={selectedYear}
                        onValueChange={setSelectedYear}
                        className="w-full"
                        allowedYears={allowedYears}
                     />
                  </div>

                  <div className="space-y-1.5 w-full md:w-[250px]">
                     <label className="text-xs font-semibold uppercase text-muted-foreground">โปรแกรม</label>
                     <Select value={selectedProgramId} onValueChange={setSelectedProgramId}>
                        <SelectTrigger className="w-full bg-background">
                           <SelectValue placeholder="Select Program" />
                        </SelectTrigger>
                        <SelectContent>
                           {programs.map((p: any) => (
                              <SelectItem key={p.program_id} value={p.program_id}>{p.program_name}</SelectItem>
                           ))}
                        </SelectContent>
                     </Select>
                  </div>

                  <div className="space-y-1.5 w-full md:w-[300px]">
                     <label className="text-xs font-semibold uppercase text-muted-foreground">วิชา</label>
                     <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                        <SelectTrigger className="w-full bg-background">
                           <SelectValue placeholder="Select Subject" />
                        </SelectTrigger>
                        <SelectContent>
                           {rawSubjects.length > 0 ? (
                              rawSubjects.map((s: any) => (
                                 <SelectItem key={s.id} value={s.id}>{s.code} {s.name}</SelectItem>
                              ))
                           ) : (
                              <SelectItem value="none" disabled>No subjects found</SelectItem>
                           )}
                        </SelectContent>
                     </Select>
                  </div>
               </div>
            </CardContent>
         </Card>

         {/* Matrix Table */}
         {subjectsLoading ? (
            <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
         ) : !selectedSubject ? (
            <div className="text-center p-12 text-muted-foreground border-2 border-dashed rounded-xl">
               Please select a subject to view scores
            </div>
         ) : (
            <Card className="border-0 shadow-card overflow-hidden">
               <div className="overflow-x-auto">
                  <Table>
                     <TableHeader>
                        <TableRow className="bg-primary/5 hover:bg-primary/5">
                           <TableHead className="min-w-[200px] font-bold text-primary">บทเรียน</TableHead>
                           <TableHead className="w-[100px] text-center font-bold">คะแนนเต็ม</TableHead>
                           {assessments.map((a: any) => (
                              <TableHead key={a.id} className="text-center min-w-[120px] font-semibold">
                                 {a.title}
                              </TableHead>
                           ))}
                           <TableHead className="w-[120px] text-center font-bold text-primary bg-primary/5">คะแนนรวม</TableHead>
                        </TableRow>
                     </TableHeader>
                     <TableBody>
                        {selectedSubject.sub_topics?.map((st: any) => {
                           // Calculate Row คะแนนรวม
                           let rowTotal = 0;

                           return (
                              <TableRow key={st.id} className="hover:bg-muted/50">
                                 <TableCell className="font-medium">
                                    {st.name}
                                    <div className="text-[10px] text-muted-foreground hidden sm:block">ID: {st.id.slice(0, 8)}</div>
                                 </TableCell>
                                 <TableCell className="text-center text-muted-foreground">
                                    {st.max_score}
                                 </TableCell>

                                 {assessments.map((a: any) => {
                                    // Get Score
                                    const score = scoreMatrix.get(st.id)?.get(a.id);
                                    const hasScore = score !== undefined;
                                    if (hasScore) rowTotal += score;

                                    return (
                                       <TableCell key={a.id} className="text-center p-0">
                                          {hasScore ? (
                                             <div className="py-3 px-2 h-full w-full flex items-center justify-center">
                                                <span className={cn(
                                                   "font-medium",
                                                   score >= (st.max_score * 0.8) ? "text-emerald-600" :
                                                      score < (st.max_score * 0.5) ? "text-red-500" : "text-foreground"
                                                )}>
                                                   {score}
                                                </span>
                                             </div>
                                          ) : (
                                             <span className="text-muted-foreground/20">-</span>
                                          )}
                                       </TableCell>
                                    );
                                 })}

                                 <TableCell className="text-center font-bold bg-primary/5">
                                    {rowTotal}
                                    <span className="text-xs font-normal text-muted-foreground ml-1"> {/* Assuming max_score is GLOBAL maximum for the subtopic */}
                                    </span>
                                 </TableCell>
                              </TableRow>
                           );
                        })}

                        {/* Summary Row */}
                        <TableRow className="bg-muted/50 font-bold border-t-2">
                           <TableCell>คะแนนรวม</TableCell>
                           <TableCell className="text-center">
                              {selectedSubject.sub_topics?.reduce((a: number, b: any) => a + (b.max_score || 0), 0)}
                           </TableCell>
                           {assessments.map((a: any) => (
                              <TableCell key={a.id} className="text-center">
                                 {/* Sum of column */}
                                 {selectedSubject.sub_topics?.reduce((acc: number, st: any) => {
                                    return acc + (scoreMatrix.get(st.id)?.get(a.id) || 0);
                                 }, 0)}
                              </TableCell>
                           ))}
                           <TableCell className="text-center text-primary">
                              {/* Grand คะแนนรวม */}
                              {selectedSubject.sub_topics?.reduce((acc: number, st: any) => {
                                 let stTotal = 0;
                                 assessments.forEach((a: any) => {
                                    stTotal += (scoreMatrix.get(st.id)?.get(a.id) || 0);
                                 });
                                 return acc + stTotal;
                              }, 0)}
                           </TableCell>
                        </TableRow>
                     </TableBody>
                  </Table>
               </div>
            </Card>
         )}
      </div>
   );
}
