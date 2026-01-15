import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, ChevronRight, BookOpen } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";

interface SubTopic {
  id: string;
  name: string;
  maxScore: number;
}

interface Subject {
  id: string;
  name: string;
  code: string;
  subTopics: SubTopic[];
}

const initialSubjects: Subject[] = [
  {
    id: "physics",
    name: "Physics",
    code: "PHY",
    subTopics: [
      { id: "phy-mechanics", name: "Mechanics", maxScore: 25 },
      { id: "phy-waves", name: "Waves & Optics", maxScore: 20 },
      { id: "phy-electricity", name: "Electricity", maxScore: 25 },
    ],
  },
  {
    id: "chemistry",
    name: "Chemistry",
    code: "CHE",
    subTopics: [
      { id: "che-organic", name: "Organic Chemistry", maxScore: 30 },
      { id: "che-inorganic", name: "Inorganic Chemistry", maxScore: 25 },
    ],
  },
  {
    id: "math",
    name: "Mathematics",
    code: "MAT",
    subTopics: [
      { id: "mat-algebra", name: "Algebra", maxScore: 25 },
      { id: "mat-calculus", name: "Calculus", maxScore: 30 },
    ],
  },
];

export function SubjectManagement() {
  const [subjects, setSubjects] = useState<Subject[]>(initialSubjects);
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [isCreateSubjectOpen, setIsCreateSubjectOpen] = useState(false);
  const [isCreateSubTopicOpen, setIsCreateSubTopicOpen] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [subjectForm, setSubjectForm] = useState({ name: "", code: "" });
  const [subTopicForm, setSubTopicForm] = useState({ name: "", maxScore: 20 });
  const { toast } = useToast();

  const handleCreateSubject = () => {
    if (!subjectForm.name.trim() || !subjectForm.code.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    const newSubject: Subject = {
      id: `subject-${Date.now()}`,
      name: subjectForm.name,
      code: subjectForm.code.toUpperCase(),
      subTopics: [],
    };

    setSubjects([...subjects, newSubject]);
    setSubjectForm({ name: "", code: "" });
    setIsCreateSubjectOpen(false);
    toast({
      title: "Success",
      description: `Subject "${subjectForm.name}" has been created`,
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

    const newSubTopic: SubTopic = {
      id: `subtopic-${Date.now()}`,
      name: subTopicForm.name,
      maxScore: subTopicForm.maxScore,
    };

    setSubjects(
      subjects.map((s) =>
        s.id === selectedSubjectId
          ? { ...s, subTopics: [...s.subTopics, newSubTopic] }
          : s
      )
    );
    setSubTopicForm({ name: "", maxScore: 20 });
    setIsCreateSubTopicOpen(false);
    toast({
      title: "Success",
      description: `Sub-topic "${subTopicForm.name}" has been added`,
    });
  };

  const handleDeleteSubject = (subjectId: string) => {
    setSubjects(subjects.filter((s) => s.id !== subjectId));
    toast({
      title: "Deleted",
      description: "Subject has been removed",
    });
  };

  const handleDeleteSubTopic = (subjectId: string, subTopicId: string) => {
    setSubjects(
      subjects.map((s) =>
        s.id === subjectId
          ? { ...s, subTopics: s.subTopics.filter((st) => st.id !== subTopicId) }
          : s
      )
    );
    toast({
      title: "Deleted",
      description: "Sub-topic has been removed",
    });
  };

  const openAddSubTopic = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    setIsCreateSubTopicOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Subjects & Sub-Topics</h3>
          <p className="text-sm text-muted-foreground">
            Define subjects and their grading sub-topics with max scores
          </p>
        </div>
        <Dialog open={isCreateSubjectOpen} onOpenChange={setIsCreateSubjectOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 gradient-primary text-primary-foreground shadow-glow">
              <Plus className="h-4 w-4" />
              Add Subject
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Subject</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="subjectName">Subject Name</Label>
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
                <Label htmlFor="subjectCode">Subject Code</Label>
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
                Cancel
              </Button>
              <Button onClick={handleCreateSubject} className="gradient-primary text-primary-foreground">
                Create Subject
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {subjects.map((subject, index) => {
          const isExpanded = expandedSubject === subject.id;
          const totalScore = subject.subTopics.reduce((acc, st) => acc + st.maxScore, 0);

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
                        Code: {subject.code} • {subject.subTopics.length} sub-topics • {totalScore} total marks
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
                      Add Sub-Topic
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteSubject(subject.id)}
                    >
                      <Trash2 className="h-4 w-4" />
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
                        {subject.subTopics.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No sub-topics yet. Click "Add Sub-Topic" to create one.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {subject.subTopics.map((subTopic) => (
                              <div
                                key={subTopic.id}
                                className="flex items-center justify-between rounded-xl bg-card p-3"
                              >
                                <div>
                                  <p className="font-medium">{subTopic.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Max Score: {subTopic.maxScore}
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => handleDeleteSubTopic(subject.id, subTopic.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
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
        })}
      </div>

      {/* Add Sub-Topic Dialog */}
      <Dialog open={isCreateSubTopicOpen} onOpenChange={setIsCreateSubTopicOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Sub-Topic</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subTopicName">Sub-Topic Name</Label>
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
              <Label htmlFor="maxScore">Maximum Score</Label>
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
              Cancel
            </Button>
            <Button onClick={handleCreateSubTopic} className="gradient-primary text-primary-foreground">
              Add Sub-Topic
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
