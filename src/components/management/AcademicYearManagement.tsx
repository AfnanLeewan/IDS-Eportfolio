import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Plus, Archive, Star, Edit2, Check, X } from 'lucide-react';
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
  type AcademicYear,
} from '@/hooks/useSupabaseData';

export function AcademicYearManagement() {
  const { data: years = [], isLoading } = useAcademicYears();
  const createYear = useCreateAcademicYear();
  const setCurrentYear = useSetCurrentAcademicYear();
  const archiveYear = useArchiveAcademicYear();
  const updateYear = useUpdateAcademicYear();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState<AcademicYear | null>(null);

  const [newYear, setNewYear] = useState({
    yearNumber: new Date().getFullYear() + 543,
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
        // Fallback error handling if client checking missed something (e.g. concurrent race)
        if (error.message?.includes('duplicate key')) {
           toast.error(`ปีการศึกษา ${newYear.yearNumber} มีอยู่ในระบบแล้ว`);
        } else {
           toast.error(`เกิดข้อผิดพลาด: ${error.message || 'ไม่สามารถสร้างปีการศึกษาได้'}`);
        }
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
  
  const openCreateDialog = () => {
    // Auto-calculate next year
    const maxYear = years.length > 0 
      ? Math.max(...years.map(y => y.year_number)) 
      : new Date().getFullYear() + 543 - 1; // Fallback if no years
      
    setNewYear(prev => ({
      ...prev,
      yearNumber: maxYear + 1,
      displayName: `${maxYear + 1} (${maxYear - 543 + 1}-${maxYear - 543 + 2})` // Optional: Auto-fill display name too? Maybe just yearNumber for safety.
    }));
    setCreateDialogOpen(true);
  }

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
              <CardHeader>
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
                </div>

                <div className="flex gap-2">
                  {!year.is_current && year.is_active && (
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
                  )}
                  {year.is_active && !year.is_current && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedYear(year);
                        setArchiveDialogOpen(true);
                      }}
                      className="flex-1"
                    >
                      <Archive className="h-4 w-4 mr-1" />
                      เก็บถาวร
                    </Button>
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
    </div>
  );
}
