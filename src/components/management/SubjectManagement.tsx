import { useState } from "react";
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
  useClasses,
  useClassSubjects,
  useAvailableSubjects,
  useAssignSubjectToClass,
  useRemoveSubjectFromClass,
} from "@/hooks/useSupabaseData";
import { Badge } from "@/components/ui/badge";

export function SubjectManagement() {
  // Database hooks
  const { data: allSubjects = [], isLoading: allSubjectsLoading } = useSubjectWithTopics('pre-a-level');
  const { data: classes = [] } = useClasses();
  const createSubject = useCreateSubject();
  const deleteSubject = useDeleteSubject();
  const createSubTopic = useCreateSubTopic();
  const deleteSubTopic = useDeleteSubTopic();
  const assignSubject = useAssignSubjectToClass();
  const removeSubject = useRemoveSubjectFromClass();

  // Local UI state
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [isCreateSubjectOpen, setIsCreateSubjectOpen] = useState(false);
  const [isCreateSubTopicOpen, setIsCreateSubTopicOpen] = useState(false);
  const [isAssignSubjectOpen, setIsAssignSubjectOpen] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [subjectForm, setSubjectForm] = useState({ name: "", code: "" });
  const [subTopicForm, setSubTopicForm] = useState({ name: "", maxScore: 20 });
  const { toast } = useToast();

  // Get class-specific subjects when a class is selected
  const { data: classSubjects = [] } = useClassSubjects(selectedClass);
  const { data: availableSubjects = [] } = useAvailableSubjects(selectedClass);

  // Determine which subjects to display
  const displaySubjects = selectedClass === "all" 
    ? allSubjects 
    : classSubjects.map(cs => ({
        ...cs.subjects,
        sub_topics: cs.subjects?.sub_topics || []
      }));

  const handleCreateSubject = () => {
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
      program_id: 'pre-a-level',
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
    if (selectedClass !== "all") {
      // Remove from class only
      if (!confirm(`Remove "${subjectName}" from this class?`)) return;
      
      removeSubject.mutate({ classId: selectedClass, subjectId });
    } else {
      // Delete subject globally
      if (!confirm(`Delete "${subjectName}" permanently? This will remove it from ALL classes and delete all sub-topics and scores.`)) return;
      
      deleteSubject.mutate(subjectId);
    }
  };

  const handleDeleteSubTopic = (subTopicId: string, subTopicName: string) => {
    if (!confirm(`Are you sure you want to delete "${subTopicName}"? This will also delete all student scores for this sub-topic.`)) {
      return;
    }

    deleteSubTopic.mutate(subTopicId);
  };

  const handleAssignSubject = (subjectId: string) => {
    if (!selectedClass || selectedClass === "all") {
      toast({
        title: "Error",
        description: "Please select a class first",
        variant: "destructive",
      });
      return;
    }

    assignSubject.mutate({ classId: selectedClass, subjectId }, {
      onSuccess: () => {
        setIsAssignSubjectOpen(false);
      }
    });
  };

  const openAddSubTopic = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    setIsCreateSubTopicOpen(true);
  };

  if (allSubjectsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Subjects & Sub-Topics</h3>
          <p className="text-sm text-muted-foreground">
            {selectedClass === "all" 
              ? "Manage all subjects or select a class to manage class-specific subjects"
              : "Manage subjects for the selected class"}
          </p>
        </div>
        <div className="flex gap-2">
          {selectedClass !== "all" && (
            <Dialog open={isAssignSubjectOpen} onOpenChange={setIsAssignSubjectOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Subject to Class
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Subject to Class</DialogTitle>
                  <p className="text-sm text-muted-foreground">
                    Select from available subjects to add to this class
                  </p>
                </DialogHeader>
                <div className="py-4">
                  {availableSubjects.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      All subjects are already assigned to this class.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {availableSubjects.map((subject) => (
                        <Card key={subject.id} className="p-3 hover:bg-muted/50 cursor-pointer transition-colors">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{subject.name}</p>
                              <p className="text-xs text-muted-foreground">Code: {subject.code}</p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleAssignSubject(subject.id)}
                              disabled={assignSubject.isPending}
                            >
                              {assignSubject.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Add"
                              )}
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )}
          <Dialog open={isCreateSubjectOpen} onOpenChange={setIsCreateSubjectOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 gradient-primary text-primary-foreground shadow-glow">
                <Plus className="h-4 w-4" />
                Create New Subject
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Subject</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  This subject will be available to assign to any class
                </p>
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
                <Button 
                  onClick={handleCreateSubject} 
                  className="gradient-primary text-primary-foreground"
                  disabled={createSubject.isPending}
                >
                  {createSubject.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Subject"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Class Filter */}
      <Card className="shadow-card border-0 rounded-2xl">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Label className="text-sm font-medium">Filter by Class:</Label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {classes.map((classGroup) => (
                  <SelectItem key={classGroup.id} value={classGroup.id}>
                    {classGroup.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedClass !== "all" && (
              <Badge variant="secondary">
                {displaySubjects.length} subjects assigned
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Subjects List */}
      <div className="space-y-4">
        {displaySubjects.length === 0 ? (
          <Card className="shadow-card border-0 rounded-2xl">
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">
                {selectedClass === "all" 
                  ? "No subjects yet. Click 'Create New Subject' to add one."
                  : "No subjects assigned to this class yet. Click 'Add Subject to Class' to assign subjects."}
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
                          Code: {subject.code} • {subject.sub_topics?.length || 0} sub-topics • {totalScore} total marks
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
                        onClick={() => handleDeleteSubject(subject.id, subject.name)}
                        disabled={deleteSubject.isPending || removeSubject.isPending}
                      >
                        {(deleteSubject.isPending || removeSubject.isPending) ? (
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
                              No sub-topics yet. Click "Add Sub-Topic" to create one.
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
                                      Max Score: {subTopic.max_score}
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
            <Button 
              onClick={handleCreateSubTopic} 
              className="gradient-primary text-primary-foreground"
              disabled={createSubTopic.isPending}
            >
              {createSubTopic.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Sub-Topic"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
