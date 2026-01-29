import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, ChevronRight, BookOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  useSubjectWithTopics,
  useCreateSubject,
  useDeleteSubject,
  useCreateSubTopic,
  useDeleteSubTopic,
  useCurrentAcademicYear,
  useYearPrograms,
  useTeachersList,
  useAssignTeacher,
  useRemoveAssignment,
  useTeacherAssignments
} from "@/hooks/useSupabaseData";
import { Badge } from "@/components/ui/badge";
import { UserCog, X } from "lucide-react";

export function SubjectManagement() {
  const { data: currentYear } = useCurrentAcademicYear();
  const { data: programs = [], isLoading: programsLoading } = useYearPrograms(currentYear?.id || '');
  
  // Local UI state
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [isCreateSubjectOpen, setIsCreateSubjectOpen] = useState(false);
  const [isCreateSubTopicOpen, setIsCreateSubTopicOpen] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [subjectForm, setSubjectForm] = useState({ name: "", code: "" });
  const [subTopicForm, setSubTopicForm] = useState({ name: "", maxScore: 20 });
  const { toast } = useToast();

  // Auto-select first program when programs load
  useEffect(() => {
    if (programs.length > 0 && !selectedProgramId) {
      setSelectedProgramId(programs[0].program_id);
    }
  }, [programs, selectedProgramId]);

  // Database hooks
  const { data: allSubjects = [], isLoading: allSubjectsLoading } = useSubjectWithTopics(selectedProgramId || 'none');
  const createSubject = useCreateSubject();
  const deleteSubject = useDeleteSubject();
  const createSubTopic = useCreateSubTopic();
  const deleteSubTopic = useDeleteSubTopic();
  
  // Teacher Assignment Hooks
  const { data: teachers = [] } = useTeachersList();
  const { data: assignments = [] } = useTeacherAssignments();
  const assignTeacher = useAssignTeacher();
  const removeAssignment = useRemoveAssignment();
  
  const [isManageTeachersOpen, setIsManageTeachersOpen] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");

  // All subjects from the selected program
  const displaySubjects = allSubjects;

  const handleCreateSubject = () => {
    if (!selectedProgramId) {
      toast({
        title: "Error",
        description: "Please select a program first",
        variant: "destructive",
      });
      return;
    }

    if (!subjectForm.name.trim() || !subjectForm.code.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    const subjectId = subjectForm.code.toLowerCase();

    createSubject.mutate({
      id: subjectId,
      program_id: selectedProgramId,
      name: subjectForm.name,
      code: subjectForm.code.toUpperCase(),
      display_order: allSubjects.length,
    }, {
      onSuccess: () => {
        setSubjectForm({ name: "", code: "" });
        setIsCreateSubjectOpen(false);
      }
    });
  };

  const handleCreateSubTopic = () => {
    if (!selectedSubjectId || !subTopicForm.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a sub-topic name",
        variant: "destructive",
      });
      return;
    }

    const subject = displaySubjects.find(s => s.id === selectedSubjectId);
    const subTopicId = `${selectedSubjectId}-${subTopicForm.name.toLowerCase().replace(/\s+/g, '-')}`;

    createSubTopic.mutate({
      id: subTopicId,
      subject_id: selectedSubjectId,
      name: subTopicForm.name,
      max_score: subTopicForm.maxScore,
      display_order: subject?.sub_topics?.length || 0,
    }, {
      onSuccess: () => {
        setSubTopicForm({ name: "", maxScore: 20 });
        setIsCreateSubTopicOpen(false);
      }
    });
  };

  const handleDeleteSubject = (subjectId: string, subjectName: string) => {
    if (!confirm(`ลบวิชา "${subjectName}" หรือไม่? การลบจะลบบทเรียนและคะแนนทั้งหมด`)) return;
    
    deleteSubject.mutate(subjectId);
  };

  const handleDeleteSubTopic = (subTopicId: string, subTopicName: string) => {
    if (!confirm(`คุณแน่ใจหรือไม่ที่จะลบบทเรียน "${subTopicName}"? การลบจะลบคะแนนทั้งหมดของบทเรียนนี้`)) {
      return;
    }

    deleteSubTopic.mutate(subTopicId);
  };

  const openAddSubTopic = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    setIsCreateSubTopicOpen(true);
  };

  if (programsLoading || allSubjectsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentYear) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">
          ไม่พบปีการศึกษาปัจจุบัน กรุณาตั้งค่าปีการศึกษาก่อน
        </p>
      </Card>
    );
  }

  if (programs.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">
          ยังไม่มีโครงการในปีการศึกษานี้ กรุณาเพิ่มโครงการก่อน
        </p>
      </Card>
    );
  }

  const selectedProgram = programs.find(p => p.program_id === selectedProgramId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-2xl font-bold">วิชาและบทเรียน</h3>
          <p className="text-muted-foreground">
            จัดการวิชาและบทเรียนของโครงการต่างๆ
          </p>
        </div>

        {/* Program Selector */}
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <Label className="text-sm font-medium whitespace-nowrap">เลือกโครงการ:</Label>
            <Select value={selectedProgramId} onValueChange={setSelectedProgramId}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="เลือกโครงการ" />
              </SelectTrigger>
              <SelectContent>
                {programs.map((program: any) => (
                  <SelectItem key={program.program_id} value={program.program_id}>
                    {program.program_name}
                    {program.subject_count > 0 && ` (${program.subject_count} วิชา)`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedProgram && (
              <Badge variant="outline" className="ml-auto">
                ปีการศึกษา {currentYear.display_name}
              </Badge>
            )}
          </div>
          {selectedProgram?.program_description && (
            <p className="text-sm text-muted-foreground mt-2">
              {selectedProgram.program_description}
            </p>
          )}
        </Card>
      </div>


      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            วิชาทั้งหมดในโครงการ {selectedProgram?.program_name || ''}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            <strong>หมายเหตุ:</strong> เมื่อมอบหมายชั้นเรียนให้กับโครงการ ชั้นเรียนจะสามารถเข้าถึงวิชาทั้งหมดในโครงการโดยอัตโนมัติ
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCreateSubjectOpen} onOpenChange={setIsCreateSubjectOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                เพิ่มวิชาใหม่
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>เพิ่มวิชาใหม่</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  เพิ่มวิชาใหม่ในโครงการ {selectedProgram?.program_name}
                </p>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="subjectName">ชื่อวิชา</Label>
                  <Input
                    id="subjectName"
                    placeholder="e.g., Biology"
                    value={subjectForm.name}
                    onChange={(e) =>
                      setSubjectForm({ ...subjectForm, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subjectCode">รหัสวิชา</Label>
                  <Input
                    id="subjectCode"
                    placeholder="e.g., BIO"
                    maxLength={4}
                    value={subjectForm.code}
                    onChange={(e) =>
                      setSubjectForm({ ...subjectForm, code: e.target.value.toUpperCase() })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateSubjectOpen(false)}>
                  ยกเลิก
                </Button>
                <Button 
                  onClick={handleCreateSubject} 
                  className="gradient-primary text-primary-foreground"
                  disabled={createSubject.isPending}
                >
                  {createSubject.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      กำลังสร้าง...
                    </>
                  ) : (
                    "สร้างวิชา"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>


      {/* Subjects List */}
      <div className="space-y-4">
        {displaySubjects.length === 0 ? (
          <Card className="shadow-card border-0 rounded-2xl">
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">
                ยังไม่มีวิชา คลิก 'เพิ่มวิชาใหม่' เพื่อเพิ่มวิชา
              </p>
            </CardContent>
          </Card>
        ) : (
          displaySubjects.map((subject, index) => {
            const isExpanded = expandedSubject === subject.id;
            const totalScore = subject.sub_topics?.reduce((acc, st) => acc + st.max_score, 0) || 0;

            return (
              <motion.div
                key={subject.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="shadow-card border-0 rounded-2xl overflow-hidden">
                  <button
                    onClick={() => setExpandedSubject(isExpanded ? null : subject.id)}
                    className="flex w-full items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <motion.div
                        animate={{ rotate: isExpanded ? 90 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </motion.div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                        <BookOpen className="h-5 w-5 text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold">{subject.name}</p>
                        <p className="text-xs text-muted-foreground">
                          รหัสวิชา: {subject.code} • {subject.sub_topics?.length || 0} บทเรียน • {totalScore} คะแนนรวม
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-primary"
                        onClick={() => openAddSubTopic(subject.id)}
                      >
                        <Plus className="h-4 w-4" />
                        เพิ่มบทเรียน
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-primary"
                        onClick={() => {
                          setSelectedSubjectId(subject.id);
                          setIsManageTeachersOpen(true);
                        }}
                      >
                        <UserCog className="h-4 w-4" />
                        ผู้สอน
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteSubject(subject.id, subject.name)}
                        disabled={deleteSubject.isPending}
                      >
                        {deleteSubject.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t bg-muted/30 p-4">
                          {!subject.sub_topics || subject.sub_topics.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              ยังไม่มีบทเรียน กรุณาเพิ่มบทเรียน
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {subject.sub_topics.map((subTopic) => (
                                <div
                                  key={subTopic.id}
                                  className="flex items-center justify-between rounded-xl bg-card p-3"
                                >
                                  <div>
                                    <p className="font-medium">{subTopic.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      คะแนนเต็ม: {subTopic.max_score}
                                    </p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() => handleDeleteSubTopic(subTopic.id, subTopic.name)}
                                    disabled={deleteSubTopic.isPending}
                                  >
                                    {deleteSubTopic.isPending ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Add Sub-Topic Dialog */}
      <Dialog open={isCreateSubTopicOpen} onOpenChange={setIsCreateSubTopicOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>เพิ่มบทเรียน</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subTopicName">ชื่อบทเรียน</Label>
              <Input
                id="subTopicName"
                placeholder="e.g., Thermodynamics"
                value={subTopicForm.name}
                onChange={(e) =>
                  setSubTopicForm({ ...subTopicForm, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxScore">คะแนนเต็ม</Label>
              <Input
                id="maxScore"
                type="number"
                min={1}
                max={100}
                value={subTopicForm.maxScore}
                onChange={(e) =>
                  setSubTopicForm({ ...subTopicForm, maxScore: parseInt(e.target.value) || 0 })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateSubTopicOpen(false)}>
              ยกเลิก
            </Button>
            <Button 
              onClick={handleCreateSubTopic} 
              className="gradient-primary text-primary-foreground"
              disabled={createSubTopic.isPending}
            >
              {createSubTopic.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังเพิ่ม...
                </>
              ) : (
                "เพิ่มบทเรียน"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Teachers Dialog */}
      <Dialog open={isManageTeachersOpen} onOpenChange={setIsManageTeachersOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>มอบหมายผู้สอน</DialogTitle>
            <p className="text-sm text-muted-foreground">
              มอบหมายผู้สอนวิชา {displaySubjects.find(s => s.id === selectedSubjectId)?.name}
            </p>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="flex gap-2">
              <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="เลือกผู้สอน" />
                </SelectTrigger>
                <SelectContent>
                  {teachers
                    .filter(t => !assignments.some((a: any) => a.subject_id === selectedSubjectId && a.teacher_id === t.user_id))
                    .map((teacher: any) => (
                    <SelectItem key={teacher.user_id} value={teacher.user_id}>
                      {teacher.full_name || teacher.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={() => {
                  if (selectedSubjectId && selectedTeacherId) {
                    assignTeacher.mutate({ teacherId: selectedTeacherId, subjectId: selectedSubjectId });
                    setSelectedTeacherId("");
                  }
                }}
                disabled={!selectedTeacherId || assignTeacher.isPending}
              >
                มอบหมาย
              </Button>
            </div>

            <div className="space-y-2">
              <Label>ผู้สอน</Label>
              <div className="space-y-2">
                {assignments
                  .filter((a: any) => a.subject_id === selectedSubjectId)
                  .map((assignment: any) => {
                    const teacher = teachers.find((t: any) => t.user_id === assignment.teacher_id);
                    return (
                      <div key={assignment.unique_id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <UserCog className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{teacher?.full_name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{teacher?.email}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => removeAssignment.mutate({ 
                            teacherId: assignment.teacher_id, 
                            subjectId: assignment.subject_id 
                          })}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                {assignments.filter((a: any) => a.subject_id === selectedSubjectId).length === 0 && (
                  <p className="text-sm text-center text-muted-foreground py-4">
                    ยังไม่มีผู้สอน
                  </p>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
