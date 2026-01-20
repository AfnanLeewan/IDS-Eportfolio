import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Student, Subject, preALevelProgram } from "@/lib/mockData";

interface ScoreEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student | null;
  subject: Subject | null;
  onSave: (studentId: string, scores: { subTopicId: string; score: number }[]) => void;
}

export function ScoreEditDialog({
  open,
  onOpenChange,
  student,
  subject,
  onSave,
}: ScoreEditDialogProps) {
  const [editedScores, setEditedScores] = useState<Record<string, number>>({});

  // Initialize scores when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && student && subject) {
      const initialScores: Record<string, number> = {};
      subject.subTopics.forEach((subTopic) => {
        const scoreEntry = student.scores.find((s) => s.subTopicId === subTopic.id);
        initialScores[subTopic.id] = scoreEntry?.score || 0;
      });
      setEditedScores(initialScores);
    }
    onOpenChange(isOpen);
  };

  const handleScoreChange = (subTopicId: string, value: string, maxScore: number) => {
    const numValue = parseInt(value) || 0;
    const clampedValue = Math.max(0, Math.min(numValue, maxScore));
    setEditedScores((prev) => ({ ...prev, [subTopicId]: clampedValue }));
  };

  const handleSave = () => {
    if (!student || !subject) return;
    const scores = Object.entries(editedScores).map(([subTopicId, score]) => ({
      subTopicId,
      score,
    }));
    onSave(student.id, scores);
    onOpenChange(false);
  };

  if (!student || !subject) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Scores - {student.name}</DialogTitle>
          <p className="text-sm text-muted-foreground">{subject.name}</p>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {subject.subTopics.map((subTopic) => (
            <div key={subTopic.id} className="flex items-center gap-4">
              <Label className="flex-1 text-sm">{subTopic.name}</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={subTopic.maxScore}
                  value={editedScores[subTopic.id] || 0}
                  onChange={(e) =>
                    handleScoreChange(subTopic.id, e.target.value, subTopic.maxScore)
                  }
                  className="w-20 text-center"
                />
                <span className="text-sm text-muted-foreground">/ {subTopic.maxScore}</span>
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="gradient-primary text-primary-foreground">
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
