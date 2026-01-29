import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trash2, User, Search, UserPlus, ArrowRight, CheckCircle2, Users, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useClasses, useStudents, useCreateStudent, useUpdateStudent, useDeleteStudent, useDeleteStudents } from "@/hooks/useSupabaseData";
import { generateStudentId } from "@/lib/dataUtils";
import { Loader2 } from "lucide-react";

interface AuthorizedUser {
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
}

export function StudentManagement() {
  const { data: students = [], isLoading: studentsLoading } = useStudents();
  const { data: classes = [], isLoading: classesLoading } = useClasses();
  const createStudent = useCreateStudent();
  const updateStudent = useUpdateStudent();
  const deleteStudent = useDeleteStudent();
  const deleteStudents = useDeleteStudents();
  
  const [activeTab, setActiveTab] = useState("all");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Selection State
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // Dialog States
  const [isBulkAssignOpen, setIsBulkAssignOpen] = useState(false);
  const [isBulkMoveOpen, setIsBulkMoveOpen] = useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  
  // Data State
  const [authorizedUsers, setAuthorizedUsers] = useState<AuthorizedUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  // Form State for Bulk Actions
  const [targetClassId, setTargetClassId] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { toast } = useToast();

  // Fetch authorized users who don't have student records
  useEffect(() => {
    if (activeTab === "unassigned") {
      fetchAuthorizedUsers();
    }
  }, [activeTab]);

  const fetchAuthorizedUsers = async () => {
    setLoadingUsers(true);
    try {
      // Get all profiles
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select(`user_id, email, full_name`)
        .returns<AuthorizedUser[]>();

      if (profileError) throw profileError;

      // Get user roles (student)
      const { data: roles, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('role', 'student')
        .returns<{ user_id: string; role: string }[]>();

      if (roleError) throw roleError;

      // Get existing ACTIVE students
      const { data: existingStudents, error: studentsError } = await supabase
        .from('students')
        .select('user_id')
        .not('user_id', 'is', null)
        .eq('is_active', true)
        .returns<{ user_id: string }[]>();

      if (studentsError) throw studentsError;

      const existingUserIds = new Set(existingStudents?.map(s => s.user_id));
      const studentRoleUserIds = new Set(roles?.map(r => r.user_id));

      const availableUsers = profiles
        ?.filter(p => 
          p.user_id && 
          studentRoleUserIds.has(p.user_id) && 
          !existingUserIds.has(p.user_id)
        )
        .map(p => ({
          user_id: p.user_id,
          email: p.email || '',
          full_name: p.full_name || p.email || 'Unknown',
          role: 'student'
        })) || [];

      setAuthorizedUsers(availableUsers);
    } catch (error) {
      console.error('Error fetching authorized users:', error);
      toast({
        title: "Error",
        description: "Failed to load authorized users",
        variant: "destructive",
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const filteredStudents = students.filter((student) => {
    const matchesClass = selectedClass === "all" || student.class_id === selectedClass;
    const matchesSearch =
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesClass && matchesSearch;
  });

  const getClassName = (classId: string) => {
    return classes.find((c) => c.id === classId)?.name || "Unassigned";
  };

  // Bulk Handlers
  const handleSelectUser = (userId: string) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAllUsers = () => {
    if (selectedUserIds.length === authorizedUsers.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(authorizedUsers.map(u => u.user_id));
    }
  };

  const handleSelectStudent = (studentId: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
  };

  const handleSelectAllStudents = () => {
    if (selectedStudentIds.length === filteredStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredStudents.map(s => s.id));
    }
  };

  const handleBulkAssign = async () => {
    if (!targetClassId || selectedUserIds.length === 0) return;
    
    setIsProcessing(true);
    try {
      // Create a temporary list of current student IDs to avoid duplicates during generation
      let currentStudents = [...students]; 
      
      for (const userId of selectedUserIds) {
        const user = authorizedUsers.find(u => u.user_id === userId);
        if (!user) continue;

        const newId = generateStudentId(currentStudents);
        
        // Optimistically add to temp list so next ID generates correctly
        // Note: This matches the structure expected by generateStudentId (id, name...)
        // We assume generateStudentId only looks at 'id' property.
        const mockStudent = { 
            id: newId, 
            name: user.full_name || '', 
            class_id: targetClassId, 
            user_id: user.user_id,
            email: user.email,
            // other props...
        };
        currentStudents.push(mockStudent as any);

        await createStudent.mutateAsync({
          id: newId,
          name: user.full_name || '',
          class_id: targetClassId,
          email: user.email,
          user_id: user.user_id // Ensure we link the auth user!
        });
      }
      
      toast({
        title: "Success",
        description: `Successfully assigned ${selectedUserIds.length} students to class`,
      });
      setSelectedUserIds([]);
      setIsBulkAssignOpen(false);
      setTargetClassId("");
      fetchAuthorizedUsers(); // Refresh list
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to assign some students",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkMove = async () => {
    if (!targetClassId || selectedStudentIds.length === 0) return;
    
    setIsProcessing(true);
    try {
      for (const studentId of selectedStudentIds) {
        await updateStudent.mutateAsync({
          id: studentId,
          class_id: targetClassId,
        });
      }
      
      toast({
        title: "Success",
        description: `Successfully moved ${selectedStudentIds.length} students`,
      });
      setSelectedStudentIds([]);
      setIsBulkMoveOpen(false);
      setTargetClassId("");
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to move some students",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
     if (selectedStudentIds.length === 0) return;
     setIsProcessing(true);
     try {
        await deleteStudents.mutateAsync(selectedStudentIds);
        setSelectedStudentIds([]); // Clear selection upon success
        setIsBulkDeleteOpen(false);
     } catch (error) {
        // Error handling is inside deleteStudents onError but we catch here to stop spinner
        console.error(error);
     } finally {
        setIsProcessing(false);
     }
  };

  const handleDelete = (studentId: string) => {
    if (confirm("คุณแน่ใจหรือไม่ว่าต้องการลบระเบียนนักเรียนนี้")) {
      deleteStudent.mutate(studentId);
    }
  };

  if (studentsLoading || classesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold">จัดการรายชื่อนักเรียน</h3>
          <p className="text-sm text-muted-foreground">
            จัดการรายชื่อนักเรียนและการมอบหมายชั้นเรียน
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-card shadow-card border-0 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
          <TabsTrigger value="all" className="gap-2">
            <Users className="h-4 w-4" />
            รายชื่อนักเรียน ({students.length})
          </TabsTrigger>
          <TabsTrigger value="unassigned" className="gap-2">
            <UserPlus className="h-4 w-4" />
            ผู้ใช้ที่ยังไม่ถูกกำหนด role {authorizedUsers.length > 0 && `(${authorizedUsers.length})`}
          </TabsTrigger>
        </TabsList>

        {/* All Students Tab */}
        <TabsContent value="all" className="space-y-4">
          <Card className="shadow-card border-0 rounded-2xl">
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 sm:flex-row justify-between items-center mb-4">
                <div className="flex flex-col gap-4 sm:flex-row flex-1 w-full">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Filter by class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ทั้งหมด</SelectItem>
                      {classes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedStudentIds.length > 0 && (
                  <div className="flex gap-2">
                     <Button 
                        onClick={() => setIsBulkDeleteOpen(true)}
                        variant="destructive"
                        className="gap-2 shadow-glow"
                     >
                        <Trash2 className="h-4 w-4" />
                        ลบ ({selectedStudentIds.length})
                     </Button>
                     <Button 
                        onClick={() => setIsBulkMoveOpen(true)}
                        className="gap-2 gradient-primary text-primary-foreground shadow-glow"
                     >
                        <ArrowRight className="h-4 w-4" />
                        ย้าย ({selectedStudentIds.length})
                     </Button>
                  </div>
                )}
              </div>

              {/* Students List */}
              <div className="space-y-2">
                {filteredStudents.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">ไม่พบนักเรียน</p>
                ) : (
                  <>
                    <div className="flex items-center p-3 border-b mb-2">
                      <Checkbox 
                        checked={filteredStudents.length > 0 && selectedStudentIds.length === filteredStudents.length}
                        onCheckedChange={handleSelectAllStudents}
                        className="mr-3"
                      />
                      <span className="text-sm font-medium text-muted-foreground">เลือกทั้งหมด</span>
                    </div>
                    {filteredStudents.map((student, index) => (
                      <motion.div
                        key={student.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className="flex items-center justify-between rounded-xl bg-muted/50 p-3 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox 
                            checked={selectedStudentIds.includes(student.id)}
                            onCheckedChange={() => handleSelectStudent(student.id)}
                          />
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{student.name}</p>
                            <p className="text-xs text-muted-foreground">{student.id}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className="font-normal">
                            {getClassName(student.class_id)}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(student.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Unassigned Users Tab */}
        <TabsContent value="unassigned" className="space-y-4">
          <Card className="shadow-card border-0 rounded-2xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>ผู้ใช้ที่ยังไม่ถูกมอบหมาย</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    ผู้ใช้ที่มีบทบาท 'student' ที่ยังไม่ได้เชื่อมโยงกับระเบียนนักเรียน
                  </p>
                </div>
                {selectedUserIds.length > 0 && (
                  <Button 
                    onClick={() => setIsBulkAssignOpen(true)}
                    className="gap-2 gradient-primary text-primary-foreground shadow-glow"
                  >
                    <LinkIcon className="h-4 w-4" />
                    มอบหมาย ({selectedUserIds.length})
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loadingUsers ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : authorizedUsers.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium">ผู้ใช้ทั้งหมดถูกกำหนด roleแล้ว</h3>
                  <p className="text-muted-foreground">
                    ไม่มีผู้ใช้ที่ยังไม่ได้เชื่อมโยงกับระเบียนนักเรียน
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center p-3 border-b mb-2">
                    <Checkbox 
                      checked={authorizedUsers.length > 0 && selectedUserIds.length === authorizedUsers.length}
                      onCheckedChange={handleSelectAllUsers}
                      className="mr-3"
                    />
                    <span className="text-sm font-medium text-muted-foreground">เลือกทั้งหมด</span>
                  </div>
                  {authorizedUsers.map((user, index) => (
                    <motion.div
                      key={user.user_id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between rounded-xl bg-muted/30 p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox 
                          checked={selectedUserIds.includes(user.user_id)}
                          onCheckedChange={() => handleSelectUser(user.user_id)}
                        />
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/20">
                          <User className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                          <p className="font-medium">{user.full_name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">
                        ยังไม่ถูกกำหนด role
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bulk Assign Dialog */}
      <Dialog open={isBulkAssignOpen} onOpenChange={setIsBulkAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เพิ่มนักเรียนไปยังห้องเรียน</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p>เพิ่ม <strong>{selectedUserIds.length}</strong> ผู้ใช้ไปยัง:</p>
            <Select value={targetClassId} onValueChange={setTargetClassId}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกห้องเรียน" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              รหัสนักเรียนจะถูกสร้างขึ้นโดยอัตโนมัติ
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkAssignOpen(false)}>ยกเลิก</Button>
            <Button 
              onClick={handleBulkAssign} 
              disabled={!targetClassId || isProcessing}
              className="gradient-primary text-primary-foreground"
            >
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "ยืนยันการเพิ่ม"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Move Dialog */}
      <Dialog open={isBulkMoveOpen} onOpenChange={setIsBulkMoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ย้ายนักเรียนไปยังห้องเรียน</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p>ย้าย <strong>{selectedStudentIds.length}</strong> นักเรียนไปยัง:</p>
            <Select value={targetClassId} onValueChange={setTargetClassId}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกห้องเรียน" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkMoveOpen(false)}>ยกเลิก</Button>
            <Button 
              onClick={handleBulkMove} 
              disabled={!targetClassId || isProcessing}
              className="gradient-primary text-primary-foreground"
            >
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "ยืนยันการย้าย"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Bulk Delete Dialog */}
        <AlertDialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">ลบนักเรียนหลายคน</AlertDialogTitle>
            <AlertDialogDescription>
                คุณแน่ใจหรือไม่ว่าต้องการลบ <strong>{selectedStudentIds.length}</strong> นักเรียน?
                <br/><span className="text-destructive font-bold">การดำเนินการนี้ไม่สามารถย้อนกลับได้</span>
                <br/>คะแนนและบันทึกทั้งหมดที่เกี่ยวข้องกับนักเรียนเหล่านี้จะถูกลบอย่างถาวร
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction 
                onClick={handleBulkDelete}
                className="bg-destructive hover:bg-destructive/90"
                disabled={isProcessing}
            >
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Delete Users"}
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
