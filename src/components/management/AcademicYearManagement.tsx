import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Plus, Archive, Star, Edit2, Check, Eye, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  useAcademicYears,
  useCreateAcademicYear,
  useSetCurrentAcademicYear,
  useArchiveAcademicYear,
  useUpdateAcademicYear,
  useDeleteAcademicYear,
  type AcademicYear,
} from '@/hooks/useSupabaseData';

export function AcademicYearManagement() {
  const { data: years = [], isLoading } = useAcademicYears();
  const createYear = useCreateAcademicYear();
  const setCurrentYear = useSetCurrentAcademicYear();
  const archiveYear = useArchiveAcademicYear();
  const updateYear = useUpdateAcademicYear();
  const deleteYear = useDeleteAcademicYear();
  const navigate = useNavigate();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState<AcademicYear | null>(null);

  const [newYear, setNewYear] = useState({
    yearNumber: new Date().getFullYear() + 543,
    displayName: '',
    startDate: '',
    endDate: '',
  });

  const [editFormData, setEditFormData] = useState({
    yearNumber: 0,
    displayName: '',
    startDate: '',
    endDate: '',
  });

  const handleCreateYear = () => {
    // Check for duplicate year
    if (years.some(y => y.year_number === newYear.yearNumber)) {
      toast.error(`ปีการศึกษา ${newYear.yearNumber} มีอยู่ในระบบแล้ว`);
      return;
    }

    const id = `ay-${newYear.yearNumber}`;
    createYear.mutate({
      id,
      year_number: newYear.yearNumber,
      display_name: newYear.displayName,
      start_date: newYear.startDate,
      end_date: newYear.endDate,
      is_active: true,
      is_current: false,
    }, {
      onSuccess: () => {
        setCreateDialogOpen(false);
        // Reset to next year
        const nextYear = newYear.yearNumber + 1;
        setNewYear({
          yearNumber: nextYear,
          displayName: '',
          startDate: '',
          endDate: '',
        });
      },
      onError: (error: any) => {
        if (error.message?.includes('duplicate key')) {
           toast.error(`ปีการศึกษา ${newYear.yearNumber} มีอยู่ในระบบแล้ว`);
        } else {
           toast.error(`เกิดข้อผิดพลาด: ${error.message || 'ไม่สามารถสร้างปีการศึกษาได้'}`);
        }
      }
    });
  };

  const handleUpdateYear = () => {
     if (!selectedYear) return;
     
     updateYear.mutate({
        id: selectedYear.id,
        year_number: editFormData.yearNumber,
        display_name: editFormData.displayName,
        start_date: editFormData.startDate,
        end_date: editFormData.endDate,
     }, {
        onSuccess: () => {
           setEditDialogOpen(false);
           setSelectedYear(null);
        }
     });
  };

  const handleSetCurrent = (yearId: string) => {
    setCurrentYear.mutate(yearId);
  };

  const handleArchive = () => {
    if (!selectedYear) return;
    archiveYear.mutate(selectedYear.id, {
      onSuccess: () => {
        setArchiveDialogOpen(false);
        setSelectedYear(null);
      },
    });
  };

  const handleDelete = () => {
     if (!selectedYear) return;
     deleteYear.mutate(selectedYear.id, {
        onSuccess: () => {
           setDeleteDialogOpen(false);
           setSelectedYear(null);
        }
     });
  };
  
  const openCreateDialog = () => {
    const maxYear = years.length > 0 
      ? Math.max(...years.map(y => y.year_number)) 
      : new Date().getFullYear() + 543 - 1; 
      
    setNewYear(prev => ({
      ...prev,
      yearNumber: maxYear + 1,
      displayName: `${maxYear + 1} (${maxYear - 543 + 1}-${maxYear - 543 + 2})`
    }));
    setCreateDialogOpen(true);
  }

  const openEditDialog = (year: AcademicYear) => {
     setSelectedYear(year);
     setEditFormData({
        yearNumber: year.year_number,
        displayName: year.display_name,
        startDate: year.start_date,
        endDate: year.end_date
     });
     setEditDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">กำลังโหลดข้อมูลปีการศึกษา...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">จัดการปีการศึกษา</h2>
          <p className="text-muted-foreground">
            จัดการและติดตามข้อมูลคะแนนแยกตามปีการศึกษา
          </p>
        </div>
        <Button 
          onClick={openCreateDialog}
          className="gap-2 gradient-primary text-primary-foreground rounded-xl"
        >
          <Plus className="h-4 w-4" />
          เพิ่มปีการศึกษา
        </Button>
      </div>

      {/* Years Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {years.map((year) => (
          <motion.div
            key={year.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className={`border-0 shadow-card ${year.is_current ? 'ring-2 ring-primary' : ''}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">{year.display_name}</CardTitle>
                    </div>
                    <CardDescription>
                      {new Date(year.start_date).toLocaleDateString('th-TH', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })} - {new Date(year.end_date).toLocaleDateString('th-TH', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                     <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => openEditDialog(year)}>
                        <Edit2 className="h-4 w-4" />
                     </Button>
                     {!year.is_current && (
                        <Button 
                           variant="ghost" 
                           size="icon" 
                           className="h-8 w-8 text-muted-foreground hover:text-destructive"
                           onClick={() => { setSelectedYear(year); setDeleteDialogOpen(true); }}
                        >
                           <Trash2 className="h-4 w-4" />
                        </Button>
                     )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  {year.is_current && (
                    <Badge className="bg-emerald-100 text-emerald-700 gap-1">
                      <Star className="h-3 w-3" />
                      ปีปัจจุบัน
                    </Badge>
                  )}
                  {!year.is_active && (
                    <Badge variant="secondary" className="bg-gray-100 text-gray-600 gap-1">
                      <Archive className="h-3 w-3" />
                      เก็บถาวร
                    </Badge>
                  )}
                </div>

                <div className="flex gap-2">
                  {/* For archived years: View Scores button (read-only) */}
                  {!year.is_active && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        window.localStorage.setItem('selectedYear', year.year_number.toString());
                        navigate('/', { state: { view: 'dashboard' } });
                      }}
                      className="flex-1 text-primary border-primary hover:bg-primary/10"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      ดูคะแนน (อ่านอย่างเดียว)
                    </Button>
                  )}
                  
                  {/* For active, non-current years: Set as current button */}
                  {!year.is_current && year.is_active && (
                    <div className="flex gap-2 flex-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSetCurrent(year.id)}
                          className="flex-1"
                          disabled={setCurrentYear.isPending}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          ตั้งเป็นปีปัจจุบัน
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedYear(year);
                            setArchiveDialogOpen(true);
                          }}
                          className=""
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Create Year Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เพิ่มปีการศึกษาใหม่</DialogTitle>
            <DialogDescription>
              กรอกข้อมูลปีการศึกษาที่ต้องการเพิ่ม
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="year-number">ปีการศึกษา (พ.ศ.)</Label>
              <Input
                id="year-number"
                type="number"
                value={newYear.yearNumber}
                onChange={(e) => setNewYear({ ...newYear, yearNumber: parseInt(e.target.value) })}
                placeholder="เช่น 2568"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="display-name">ชื่อแสดง</Label>
              <Input
                id="display-name"
                value={newYear.displayName}
                onChange={(e) => setNewYear({ ...newYear, displayName: e.target.value })}
                placeholder="เช่น 2568 (2025-2026)"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">วันที่เริ่ม</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={newYear.startDate}
                  onChange={(e) => setNewYear({ ...newYear, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">วันที่สิ้นสุด</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={newYear.endDate}
                  onChange={(e) => setNewYear({ ...newYear, endDate: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button 
              onClick={handleCreateYear}
              disabled={!newYear.yearNumber || !newYear.displayName || !newYear.startDate || !newYear.endDate || createYear.isPending}
              className="gradient-primary text-primary-foreground"
            >
              เพิ่มปีการศึกษา
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Year Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>แก้ไขปีการศึกษา</DialogTitle>
            <DialogDescription>
              แก้ไขข้อมูลปีการศึกษา
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-year-number">ปีการศึกษา (พ.ศ.)</Label>
              <Input
                id="edit-year-number"
                type="number"
                value={editFormData.yearNumber}
                onChange={(e) => setEditFormData({ ...editFormData, yearNumber: parseInt(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-display-name">ชื่อแสดง</Label>
              <Input
                id="edit-display-name"
                value={editFormData.displayName}
                onChange={(e) => setEditFormData({ ...editFormData, displayName: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-start-date">วันที่เริ่ม</Label>
                <Input
                  id="edit-start-date"
                  type="date"
                  value={editFormData.startDate}
                  onChange={(e) => setEditFormData({ ...editFormData, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-end-date">วันที่สิ้นสุด</Label>
                <Input
                  id="edit-end-date"
                  type="date"
                  value={editFormData.endDate}
                  onChange={(e) => setEditFormData({ ...editFormData, endDate: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button 
              onClick={handleUpdateYear}
              disabled={!editFormData.yearNumber || !editFormData.displayName || !editFormData.startDate || !editFormData.endDate || updateYear.isPending}
              className="gradient-primary text-primary-foreground"
            >
              <Edit2 className="h-4 w-4 mr-2"/>
              บันทึกการเปลี่ยนแปลง
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Year Dialog */}
      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>เก็บถาวรปีการศึกษา</AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ว่าต้องการเก็บถาวร {selectedYear?.display_name}? 
              ข้อมูลทั้งหมดจะถูกเก็บไว้ แต่ไม่สามารถแก้ไขได้ และห้องเรียนในปีนี้จะถูกปิดการใช้งาน
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleArchive}
              className="bg-amber-600 hover:bg-amber-700"
              disabled={archiveYear.isPending}
            >
              เก็บถาวร
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Delete Year Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">ลบปีการศึกษา</AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ว่าต้องการลบ {selectedYear?.display_name}? 
              <br/><span className="text-destructive font-bold">การกระทำนี้ไม่สามารถย้อนกลับได้</span> ข้อมูลการสอบ คะแนน และห้องเรียนที่เกี่ยวข้องอาจได้รับผลกระทบ
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteYear.isPending}
            >
              ลบข้อมูล
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
