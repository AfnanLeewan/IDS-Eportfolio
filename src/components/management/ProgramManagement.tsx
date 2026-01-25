import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, Trash2, BookOpen, Users, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  useCurrentAcademicYear,
  useYearPrograms,
  useCreateExamProgram,
  useUpdateExamProgram,
  useDeleteExamProgram,
  useProgramClasses,
  useYearClasses,
  useAssignClassToProgram,
  useRemoveClassFromProgram,
} from '@/hooks/useSupabaseData';
import { toast } from 'sonner';

interface ProgramFormData {
  name: string;
  description: string;
}

import { AssessmentManagement } from './AssessmentManagement';
import { FileText } from 'lucide-react';

export function ProgramManagement() {
  const { data: currentYear } = useCurrentAcademicYear();
  const { data: programs, isLoading } = useYearPrograms(currentYear?.id || '');
  const { data: yearClasses } = useYearClasses(currentYear?.id || '');

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isManageClassesDialogOpen, setIsManageClassesDialogOpen] = useState(false);
  const [isManageAssessmentsDialogOpen, setIsManageAssessmentsDialogOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<any>(null);
  
  const [formData, setFormData] = useState<ProgramFormData>({
    name: '',
    description: '',
  });

  const createProgram = useCreateExamProgram();
  const updateProgram = useUpdateExamProgram();
  const deleteProgram = useDeleteExamProgram();
  const assignClass = useAssignClassToProgram();
  const removeClass = useRemoveClassFromProgram();

  const { data: programClasses } = useProgramClasses(selectedProgram?.program_id || '');

  const handleAdd = () => {
    if (!currentYear) {
      toast.error('ไม่พบปีการศึกษาปัจจุบัน');
      return;
    }

    if (!formData.name.trim()) {
      toast.error('กรุณากรอกชื่อโครงการ');
      return;
    }

    const programId = `prog-${Date.now()}`;
    createProgram.mutate({
      id: programId,
      name: formData.name,
      description: formData.description,
      academic_year_id: currentYear.id,
      is_active: true,
    }, {
      onSuccess: () => {
        setIsAddDialogOpen(false);
        setFormData({ name: '', description: '' });
      },
    });
  };

  const handleEdit = () => {
    if (!selectedProgram || !formData.name.trim()) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    updateProgram.mutate({
      id: selectedProgram.program_id,
      name: formData.name,
      description: formData.description,
    }, {
      onSuccess: () => {
        setIsEditDialogOpen(false);
        setSelectedProgram(null);
        setFormData({ name: '', description: '' });
      },
    });
  };

  const handleDelete = (programId: string) => {
    if (confirm('คุณแน่ใจหรือไม่ที่จะลบโครงการนี้? การลบจะลบข้อมูลทั้งหมดที่เกี่ยวข้อง')) {
      deleteProgram.mutate(programId);
    }
  };

  const handleAssignClass = (classId: string) => {
    if (!selectedProgram) return;
    
    assignClass.mutate({
      programId: selectedProgram.program_id,
      classId,
    });
  };

  const handleRemoveClass = (classId: string) => {
    if (!selectedProgram) return;
    
    removeClass.mutate({
      programId: selectedProgram.program_id,
      classId,
    });
  };

  const openEditDialog = (program: any) => {
    setSelectedProgram(program);
    setFormData({
      name: program.program_name,
      description: program.program_description || '',
    });
    setIsEditDialogOpen(true);
  };

  const openManageClassesDialog = (program: any) => {
    setSelectedProgram(program);
    setIsManageClassesDialogOpen(true);
  };

  const openManageAssessmentsDialog = (program: any) => {
    setSelectedProgram(program);
    setIsManageAssessmentsDialogOpen(true);
  };

  if (!currentYear) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>โครงการสอบ</CardTitle>
          <CardDescription>ไม่พบปีการศึกษาปัจจุบัน กรุณาตั้งค่าปีการศึกษาก่อน</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">โครงการสอบ</h3>
          <p className="text-muted-foreground">
            ปีการศึกษา {currentYear.display_name}
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          เพิ่มโครงการ
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">กำลังโหลด...</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {programs?.map((program: any) => (
            <motion.div
              key={program.program_id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="h-full hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{program.program_name}</CardTitle>
                      <CardDescription className="mt-1">
                        {program.program_description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <span>{program.subject_count || 0} วิชา</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-muted-foreground" />
                      <span>{program.class_count || 0} ชั้นเรียน</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => openManageClassesDialog(program)}
                    >
                      <Users className="mr-2 h-4 w-4" />
                      จัดการชั้นเรียน
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => openManageAssessmentsDialog(program)}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      การสอบ
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(program)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(program.program_id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Program Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เพิ่มโครงการสอบ</DialogTitle>
            <DialogDescription>
              เพิ่มโครงการสอบใหม่สำหรับปีการศึกษา {currentYear.display_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="program-name">ชื่อโครงการ</Label>
              <Input
                id="program-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="เช่น Pre-A-Level, Pre-SCIUS"
              />
            </div>

            <div>
              <Label htmlFor="program-description">รายละเอียด</Label>
              <Textarea
                id="program-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="รายละเอียดเกี่ยวกับโครงการ"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleAdd} disabled={createProgram.isPending}>
              {createProgram.isPending ? 'กำลังเพิ่ม...' : 'เพิ่มโครงการ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Program Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>แก้ไขโครงการสอบ</DialogTitle>
            <DialogDescription>
              แก้ไขข้อมูลโครงการสอบ
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-program-name">ชื่อโครงการ</Label>
              <Input
                id="edit-program-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="edit-program-description">รายละเอียด</Label>
              <Textarea
                id="edit-program-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleEdit} disabled={updateProgram.isPending}>
              {updateProgram.isPending ? 'กำลังบันทึก...' : 'บันทึก'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Classes Dialog */}
      <Dialog open={isManageClassesDialogOpen} onOpenChange={setIsManageClassesDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>จัดการชั้นเรียนในโครงการ</DialogTitle>
            <DialogDescription>
              {selectedProgram?.program_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>ชั้นเรียนในโครงการ</Label>
              <div className="mt-2 space-y-2">
                {programClasses && programClasses.length > 0 ? (
                  programClasses.map((pc: any) => (
                    <div
                      key={pc.class_id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{pc.class_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {pc.student_count} นักเรียน
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveClass(pc.class_id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    ยังไม่มีชั้นเรียนในโครงการ
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label>เพิ่มชั้นเรียน</Label>
              <div className="mt-2 space-y-2">
                {yearClasses
                  ?.filter((yc: any) => !programClasses?.some((pc: any) => pc.class_id === yc.class_id))
                  .map((yc: any) => (
                    <div
                      key={yc.class_id}
                      className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
                    >
                      <div>
                        <p className="font-medium">{yc.class_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {yc.student_count} นักเรียน
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAssignClass(yc.class_id)}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        เพิ่ม
                      </Button>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setIsManageClassesDialogOpen(false)}>
              ปิด
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Assessments Dialog */}
      <Dialog open={isManageAssessmentsDialogOpen} onOpenChange={setIsManageAssessmentsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>จัดการการสอบ</DialogTitle>
            <DialogDescription>
              {selectedProgram?.program_name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedProgram && (
            <AssessmentManagement 
              programId={selectedProgram.program_id} 
              programName={selectedProgram.program_name} 
            />
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsManageAssessmentsDialogOpen(false)}>
              ปิด
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
