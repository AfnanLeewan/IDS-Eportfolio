import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Users, GraduationCap, Layers, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateStudentId } from "@/lib/dataUtils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useCurrentAcademicYear,
  useYearClasses,
  useCreateClass,
  useUpdateClass,
  useDeleteClass,
  useClassPrograms,
  useStudents,
  useCreateStudent,
  useUpdateStudent,
  useDeleteStudent,
} from "@/hooks/useSupabaseData";
import { toast } from "sonner";

interface ClassFormData {
  name: string;
}

interface StudentFormData {
  id: string;
  name: string;
  email: string;
}

export function ClassManagement() {
  const { data: currentYear } = useCurrentAcademicYear();
  const { data: classes, isLoading } = useYearClasses(currentYear?.id || '');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isManageStudentsOpen, setIsManageStudentsOpen] = useState(false);
  const [selectedClassForStudents, setSelectedClassForStudents] = useState<any>(null);
  const [editingClass, setEditingClass] = useState<any>(null);
  const [formData, setFormData] = useState<ClassFormData>({ name: "" });

  const createClass = useCreateClass();
  const updateClass = useUpdateClass();
  const deleteClass = useDeleteClass();

  const handleCreate = () => {
    if (!currentYear) {
      toast.error('ไม่พบปีการศึกษาปัจจุบัน');
      return;
    }

    if (!formData.name.trim()) {
      toast.error('กรุณากรอกชื่อชั้นเรียน');
      return;
    }

    const classId = `class-${Date.now()}`;
    createClass.mutate({
      id: classId,
      name: formData.name,
      academic_year_id: currentYear.id,
      is_active: true,
    }, {
      onSuccess: () => {
        setIsCreateOpen(false);
        setFormData({ name: "" });
      },
    });
  };

  const handleUpdate = () => {
    if (!editingClass || !formData.name.trim()) {
      toast.error('กรุณากรอกชื่อชั้นเรียน');
      return;
    }

    updateClass.mutate({
      id: editingClass.class_id,
      name: formData.name,
    }, {
      onSuccess: () => {
        setIsEditDialogOpen(false);
        setEditingClass(null);
        setFormData({ name: "" });
      },
    });
  };

  const handleDelete = (classId: string) => {
    if (confirm('คุณแน่ใจหรือไม่ที่จะลบชั้นเรียนนี้? การลบจะลบข้อมูลนักเรียนและคะแนนทั้งหมด')) {
      deleteClass.mutate(classId);
    }
  };

  const openEditDialog = (classGroup: any) => {
    setEditingClass(classGroup);
    setFormData({ name: classGroup.class_name });
    setIsEditDialogOpen(true);
  };

  const openManageStudents = (classGroup: any) => {
    setSelectedClassForStudents(classGroup);
    setIsManageStudentsOpen(true);
  };

  if (!currentYear) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>ชั้นเรียน</CardTitle>
          <CardDescription>ไม่พบปีการศึกษาปัจจุบัน กรุณาตั้งค่าปีการศึกษาก่อน</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">ชั้นเรียน</h3>
          <p className="text-muted-foreground">
            ปีการศึกษา {currentYear.display_name}
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              เพิ่มชั้นเรียน
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>เพิ่มชั้นเรียนใหม่</DialogTitle>
              <DialogDescription>
                เพิ่มชั้นเรียนสำหรับปีการศึกษา {currentYear.display_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="className">ชื่อชั้นเรียน</Label>
                <Input
                  id="className"
                  placeholder="เช่น M.6/1, Pre-A-1"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div className="text-sm text-muted-foreground">
                หมายเหตุ: หลังจากสร้างชั้นเรียนแล้ว คุณสามารถเพิ่มนักเรียนและมอบหมายชั้นเรียนให้กับโครงการต่าง ๆ ได้
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                ยกเลิก
              </Button>
              <Button onClick={handleCreate} disabled={createClass.isPending}>
                {createClass.isPending ? 'กำลังเพิ่ม...' : 'เพิ่มชั้นเรียน'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-12">กำลังโหลด...</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes?.map((classGroup: any, index: number) => (
            <motion.div
              key={classGroup.class_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <ClassCard
                classGroup={classGroup}
                onEdit={() => openEditDialog(classGroup)}
                onDelete={() => handleDelete(classGroup.class_id)}
                onManageStudents={() => openManageStudents(classGroup)}
              />
            </motion.div>
          ))}
          
          {classes?.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              ยังไม่มีชั้นเรียน คลิกปุ่ม "เพิ่มชั้นเรียน" เพื่อเริ่มต้น
            </div>
          )}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>แก้ไขชั้นเรียน</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editClassName">ชื่อชั้นเรียน</Label>
              <Input
                id="editClassName"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleUpdate} disabled={updateClass.isPending}>
              {updateClass.isPending ? 'กำลังบันทึก...' : 'บันทึก'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Students Dialog */}
      {selectedClassForStudents && (
        <StudentManagementDialog
          classData={selectedClassForStudents}
          open={isManageStudentsOpen}
          onOpenChange={setIsManageStudentsOpen}
        />
      )}
    </div>
  );
}

function ClassCard({
  classGroup,
  onEdit,
  onDelete,
  onManageStudents,
}: {
  classGroup: any;
  onEdit: () => void;
  onDelete: () => void;
  onManageStudents: () => void;
}) {
  const { data: programs } = useClassPrograms(classGroup.class_id);

  return (
    <Card className="h-full hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <GraduationCap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{classGroup.class_name}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {classGroup.is_active ? 'ใช้งาน' : 'ไม่ใช้งาน'}
              </p>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onEdit}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{classGroup.student_count || 0} นักเรียน</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Layers className="h-4 w-4" />
          <span>{classGroup.program_count || 0} โครงการ</span>
        </div>

        {programs && programs.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {programs.slice(0, 3).map((program: any) => (
              <Badge key={program.program_id} variant="secondary" className="text-xs">
                {program.program_name}
              </Badge>
            ))}
            {programs.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{programs.length - 3}
              </Badge>
            )}
          </div>
        )}

        <Button 
          variant="outline" 
          className="w-full mt-2"
          onClick={onManageStudents}
        >
          <Users className="mr-2 h-4 w-4" />
          จัดการนักเรียน
        </Button>
      </CardContent>
    </Card>
  );
}

// Student Management Dialog Component
function StudentManagementDialog({
  classData,
  open,
  onOpenChange,
}: {
  classData: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: students, isLoading } = useStudents(classData.class_id);
  const createStudent = useCreateStudent();
  const deleteStudent = useDeleteStudent();
  
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [authorizedUsers, setAuthorizedUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [studentForm, setStudentForm] = useState<StudentFormData>({
    id: '',
    name: '',
    email: '',
  });

  // Fetch authorized users when dialog opens
  const fetchAuthorizedUsers = async () => {
    try {
      // Get all profiles
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select(`user_id, email, full_name`);
      
      if (profileError) throw profileError;

      // Get user roles (student)
      const { data: roles, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('role', 'student');

      if (roleError) throw roleError;

      // Get existing students (to exclude them)
      const { data: existingStudents, error: studentsError } = await supabase
        .from('students')
        .select('user_id')
        .not('user_id', 'is', null);

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
        })) || [];

      setAuthorizedUsers(availableUsers);
    } catch (error) {
      console.error('Error fetching authorized users:', error);
    }
  };

  const handleOpenAddDialog = (open: boolean) => {
    setIsAddStudentOpen(open);
    if (open) {
      fetchAuthorizedUsers();
    }
  };

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
  };

  const handleAddStudent = async () => {
    if (!selectedUserId) {
      toast.error('กรุณาเลือกผู้ใช้งาน');
      return;
    }

    const user = authorizedUsers.find(u => u.user_id === selectedUserId);
    if (!user) return;

    try {
        // Fetch all existing students to generate a unique ID
        const { data: allStudents } = await supabase
            .from('students')
            .select('id');
            
        const newId = generateStudentId(allStudents as any || []);

        createStudent.mutate({
        id: newId,
        name: user.full_name,
        class_id: classData.class_id,
        email: user.email || undefined,
        user_id: selectedUserId,
        }, {
        onSuccess: () => {
            setIsAddStudentOpen(false);
            setStudentForm({ id: '', name: '', email: '' });
            setSelectedUserId("");
        },
        });
    } catch (err) {
        console.error("Error generating ID", err);
        toast.error("Error generating Student ID");
    }
  };

  const handleDeleteStudent = (studentId: string, studentName: string) => {
    if (confirm(`คุณแน่ใจหรือไม่ที่จะลบนักเรียน "${studentName}"? การลบจะลบคะแนนทั้งหมดของนักเรียนคนนี้`)) {
      deleteStudent.mutate(studentId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>จัดการนักเรียน - {classData.class_name}</DialogTitle>
          <DialogDescription>
            รายชื่อนักเรียนในชั้นเรียน
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {isLoading ? (
            <div className="text-center py-8">กำลังโหลด...</div>
          ) : students && students.length > 0 ? (
            <div className="space-y-2">
              {students.map((student: any) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{student.name}</p>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        <span>รหัส: {student.id}</span>
                        {student.email && <span>• {student.email}</span>}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDeleteStudent(student.id, student.name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              ยังไม่มีนักเรียนในชั้นเรียนนี้
            </div>
          )}
        </div>

        <div className="border-t pt-4">
          <Dialog open={isAddStudentOpen} onOpenChange={handleOpenAddDialog}>
            <DialogTrigger asChild>
              <Button className="w-full">
                <UserPlus className="mr-2 h-4 w-4" />
                เพิ่มนักเรียน
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>เพิ่มนักเรียนใหม่</DialogTitle>
                <DialogDescription>
                  เพิ่มนักเรียนเข้าชั้นเรียน {classData.class_name}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                   <Label>เลือกผู้ใช้งาน *</Label>
                   <Select value={selectedUserId} onValueChange={handleUserSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกผู้ใช้งานที่มีสิทธิ์ (Student Role)" />
                    </SelectTrigger>
                    <SelectContent>
                      {authorizedUsers.length === 0 ? (
                        <SelectItem value="none" disabled>ไม่มีผู้ใช้ที่สามารถเพิ่มได้</SelectItem>
                      ) : (
                        authorizedUsers.map((user) => (
                          <SelectItem key={user.user_id} value={user.user_id}>
                            {user.full_name} ({user.email})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                   </Select>
                   <p className="text-xs text-muted-foreground">
                        ระบบจะสร้างรหัสนักเรียนให้อัตโนมัติ (เช่น STU0001) และดึงชื่อ/อีเมลจากข้อมูลผู้ใช้
                   </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsAddStudentOpen(false)}
                >
                  ยกเลิก
                </Button>
                <Button
                  onClick={handleAddStudent}
                  disabled={createStudent.isPending}
                >
                  {createStudent.isPending ? 'กำลังเพิ่ม...' : 'เพิ่มนักเรียน'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </DialogContent>
    </Dialog>
  );
}
