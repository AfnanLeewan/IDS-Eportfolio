import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, User, Search, UserPlus, ArrowRight } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface Student {
  id: string;
  name: string;
  classId: string;
}

interface ClassGroup {
  id: string;
  name: string;
}

const initialClasses: ClassGroup[] = [
  { id: "m6-1", name: "M.6/1" },
  { id: "m6-2", name: "M.6/2" },
  { id: "m6-3", name: "M.6/3" },
];

const initialStudents: Student[] = [
  { id: "STU0001", name: "Somchai Prasert", classId: "m6-1" },
  { id: "STU0002", name: "Nattapong Wongsa", classId: "m6-1" },
  { id: "STU0003", name: "Pimchanok Siriwat", classId: "m6-1" },
  { id: "STU0004", name: "Thanakorn Jitman", classId: "m6-2" },
  { id: "STU0005", name: "Kanokwan Thongchai", classId: "m6-2" },
  { id: "STU0006", name: "Worawit Suksawat", classId: "m6-2" },
  { id: "STU0007", name: "Rattana Phongsri", classId: "m6-3" },
  { id: "STU0008", name: "Pakorn Nitirat", classId: "m6-3" },
];

export function StudentManagement() {
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [classes] = useState<ClassGroup[]>(initialClasses);
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState({ name: "", studentId: "", classId: "" });
  const [moveToClass, setMoveToClass] = useState("");
  const { toast } = useToast();

  const filteredStudents = students.filter((student) => {
    const matchesClass = selectedClass === "all" || student.classId === selectedClass;
    const matchesSearch =
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesClass && matchesSearch;
  });

  const getClassName = (classId: string) => {
    return classes.find((c) => c.id === classId)?.name || "Unassigned";
  };

  const handleCreate = () => {
    if (!formData.name.trim() || !formData.studentId.trim() || !formData.classId) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    // Check for duplicate student ID
    if (students.some((s) => s.id === formData.studentId)) {
      toast({
        title: "Error",
        description: "Student ID already exists",
        variant: "destructive",
      });
      return;
    }

    const newStudent: Student = {
      id: formData.studentId,
      name: formData.name,
      classId: formData.classId,
    };

    setStudents([...students, newStudent]);
    setFormData({ name: "", studentId: "", classId: "" });
    setIsCreateOpen(false);
    toast({
      title: "Success",
      description: `Student "${formData.name}" has been added`,
    });
  };

  const handleDelete = (studentId: string) => {
    setStudents(students.filter((s) => s.id !== studentId));
    toast({
      title: "Deleted",
      description: "Student has been removed",
    });
  };

  const openMoveDialog = (student: Student) => {
    setSelectedStudent(student);
    setMoveToClass("");
    setIsMoveOpen(true);
  };

  const handleMove = () => {
    if (!selectedStudent || !moveToClass) return;

    setStudents(
      students.map((s) =>
        s.id === selectedStudent.id ? { ...s, classId: moveToClass } : s
      )
    );
    setIsMoveOpen(false);
    setSelectedStudent(null);
    toast({
      title: "Success",
      description: `Student moved to ${getClassName(moveToClass)}`,
    });
  };

  const generateStudentId = () => {
    const maxId = students.reduce((max, s) => {
      const num = parseInt(s.id.replace("STU", ""));
      return num > max ? num : max;
    }, 0);
    return `STU${String(maxId + 1).padStart(4, "0")}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Students</h3>
          <p className="text-sm text-muted-foreground">
            Manage students and assign them to classes
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 gradient-primary text-primary-foreground shadow-glow">
              <UserPlus className="h-4 w-4" />
              Add Student
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Student</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="studentId">Student ID</Label>
                <div className="flex gap-2">
                  <Input
                    id="studentId"
                    placeholder="e.g., STU0009"
                    value={formData.studentId}
                    onChange={(e) =>
                      setFormData({ ...formData, studentId: e.target.value.toUpperCase() })
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setFormData({ ...formData, studentId: generateStudentId() })
                    }
                  >
                    Auto
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="studentName">Full Name</Label>
                <Input
                  id="studentName"
                  placeholder="e.g., John Doe"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assignClass">Assign to Class</Label>
                <Select
                  value={formData.classId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, classId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((classGroup) => (
                      <SelectItem key={classGroup.id} value={classGroup.id}>
                        {classGroup.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} className="gradient-primary text-primary-foreground">
                Add Student
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="shadow-card border-0 rounded-2xl">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row">
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
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map((classGroup) => (
                  <SelectItem key={classGroup.id} value={classGroup.id}>
                    {classGroup.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Student List */}
      <Card className="shadow-card border-0 rounded-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Students ({filteredStudents.length})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredStudents.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No students found
              </p>
            ) : (
              filteredStudents.map((student, index) => (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="flex items-center justify-between rounded-xl bg-muted/50 p-3 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
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
                      {getClassName(student.classId)}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-primary"
                      onClick={() => openMoveDialog(student)}
                    >
                      <ArrowRight className="h-4 w-4" />
                      Move
                    </Button>
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
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Move Student Dialog */}
      <Dialog open={isMoveOpen} onOpenChange={setIsMoveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Move Student</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {selectedStudent && (
              <div className="space-y-4">
                <div className="rounded-xl bg-muted/50 p-4">
                  <p className="font-medium">{selectedStudent.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Currently in: {getClassName(selectedStudent.classId)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Move to Class</Label>
                  <Select value={moveToClass} onValueChange={setMoveToClass}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select new class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes
                        .filter((c) => c.id !== selectedStudent.classId)
                        .map((classGroup) => (
                          <SelectItem key={classGroup.id} value={classGroup.id}>
                            {classGroup.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMoveOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleMove}
              disabled={!moveToClass}
              className="gradient-primary text-primary-foreground"
            >
              Move Student
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
