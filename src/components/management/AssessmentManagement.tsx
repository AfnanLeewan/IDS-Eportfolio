import { useState } from 'react';
import { Plus, Calendar, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { useAssessments, useCreateAssessment } from '@/hooks/useSupabaseData';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

interface AssessmentManagementProps {
  programId: string;
  programName: string;
}

export function AssessmentManagement({ programId, programName }: AssessmentManagementProps) {
  const { data: assessments, isLoading } = useAssessments(programId);
  const createAssessment = useCreateAssessment();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newAssessment, setNewAssessment] = useState({
    title: '',
    date: format(new Date(), 'yyyy-MM-dd'),
  });

  const handleAddAssessment = () => {
    if (!newAssessment.title) return;

    createAssessment.mutate({
      program_id: programId,
      title: newAssessment.title,
      date: newAssessment.date,
    }, {
      onSuccess: () => {
        setIsAddDialogOpen(false);
        setNewAssessment({
          title: '',
          date: format(new Date(), 'yyyy-MM-dd'),
        });
      },
    });
  };

  if (isLoading) {
    return <div className="text-center py-4">Loading assessments...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">การสอบในโครงการ</h3>
        <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          เพิ่มการสอบ
        </Button>
      </div>

      <div className="space-y-3">
        {assessments && assessments.length > 0 ? (
          assessments.map((assessment: any) => (
            <Card key={assessment.id} className="bg-muted/30">
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">{assessment.title}</p>
                  <div className="flex items-center text-sm text-muted-foreground mt-1">
                    <Calendar className="h-3 w-3 mr-1" />
                    {assessment.date && format(new Date(assessment.date), 'd MMMM yyyy', { locale: th })}
                  </div>
                </div>
                {/* Add Delete/Edit actions here if needed */}
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/10">
            <p>ยังไม่มีการสอบในโครงการนี้</p>
          </div>
        )}
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เพิ่มการสอบใหม่</DialogTitle>
            <DialogDescription>
              สร้างรายการสอบสำหรับ {programName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="assessment-name">ชื่อการสอบ</Label>
              <Input
                id="assessment-name"
                placeholder="เช่น กลางภาค, ปลายภาค, สอบย่อยครั้งที่ 1"
                value={newAssessment.title}
                onChange={(e) => setNewAssessment(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assessment-date">วันที่สอบ</Label>
              <Input
                id="assessment-date"
                type="date"
                value={newAssessment.date}
                onChange={(e) => setNewAssessment(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>ยกเลิก</Button>
            <Button 
              onClick={handleAddAssessment} 
              disabled={createAssessment.isPending || !newAssessment.title}
            >
              {createAssessment.isPending ? 'กำลังสร้าง...' : 'สร้างการสอบ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
