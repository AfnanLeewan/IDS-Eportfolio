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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { classGroups, preALevelProgram, Subject } from "@/lib/mockData";

interface AddStudentScoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: Subject | null;
  onAdd: (student: {
    id: string;
    name: string;
    classId: string;
    scores: { subTopicId: string; score: number }[];
  }) => void;
}

export function AddStudentScoreDialog({
  open,
  onOpenChange,
  subject,
  onAdd,
}: AddStudentScoreDialogProps) {
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [classId, setClassId] = useState("");
  const [scores, setScores] = useState<Record<string, number>>({});

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && subject) {
      setStudentId("");
      setStudentName("");
      setClassId("");
      const initialScores: Record<string, number> = {};
      subject.subTopics.forEach((subTopic) => {
        initialScores[subTopic.id] = 0;
      });
      setScores(initialScores);
    }
    onOpenChange(isOpen);
  };

  const handleScoreChange = (subTopicId: string, value: string, maxScore: number) => {
    const numValue = parseInt(value) || 0;
    const clampedValue = Math.max(0, Math.min(numValue, maxScore));
    setScores((prev) => ({ ...prev, [subTopicId]: clampedValue }));
  };

  const handleAdd = () => {
    if (!subject || !studentId || !studentName || !classId) return;
    
    const scoreEntries = Object.entries(scores).map(([subTopicId, score]) => ({
      subTopicId,
      score,
    }));

    onAdd({
      id: studentId,
      name: studentName,
      classId,
      scores: scoreEntries,
    });
    onOpenChange(false);
  };

  if (!subject) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Student Score</DialogTitle>
          <p className="text-sm text-muted-foreground">{subject.name}</p>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Student ID</Label>
            <Input
              placeholder="e.g., STU0016"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Student Name</Label>
            <Input
              placeholder="Enter student name"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Class</Label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger>
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {classGroups.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="border-t pt-4">
            <Label className="text-base font-semibold">Sub-topic Scores</Label>
            <div className="space-y-3 mt-3">
              {subject.subTopics.map((subTopic) => (
                <div key={subTopic.id} className="flex items-center gap-4">
                  <Label className="flex-1 text-sm">{subTopic.name}</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={subTopic.maxScore}
                      value={scores[subTopic.id] || 0}
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
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!studentId || !studentName || !classId}
            className="gradient-primary text-primary-foreground"
          >
            Add Student
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
