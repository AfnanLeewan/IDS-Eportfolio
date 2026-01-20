import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trash2, User, Search, UserPlus, ArrowRight, CheckCircle2 } from "lucide-react";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useClasses, useStudents, useCreateStudent, useUpdateStudent, useDeleteStudent } from "@/hooks/useSupabaseData";
import { generateStudentId } from "@/lib/dataUtils";
import { Loader2 } from "lucide-react";

interface AuthorizedUser {
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
}

export function StudentManagement() {
  const { data: students = [], isLoading: studentsLoading } = useStudents();
  const { data: classes = [], isLoading: classesLoading } = useClasses();
  const createStudent = useCreateStudent();
  const updateStudent = useUpdateStudent();
  const deleteStudent = useDeleteStudent();
  
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<typeof students[0] | null>(null);
  
  // State for authorized users dropdown
  const [authorizedUsers, setAuthorizedUsers] = useState<AuthorizedUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [studentIdInput, setStudentIdInput] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [moveToClass, setMoveToClass] = useState("");
  const [usersOpen, setUsersOpen] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  const { toast } = useToast();

  // Fetch authorized users (student role) who don't have a student record yet
  useEffect(() => {
    if (isCreateOpen) {
      fetchAuthorizedUsers();
    }
  }, [isCreateOpen]);

  const fetchAuthorizedUsers = async () => {
    setLoadingUsers(true);
    try {
      // Get all profiles with student role
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select(`
          user_id,
          email,
          full_name
        `);

      if (profileError) throw profileError;

      // Get user roles
      const { data: roles, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('role', 'student');

      if (roleError) throw roleError;

      // Get existing students to filter them out
      const { data: existingStudents, error: studentsError } = await supabase
        .from('students')
        .select('user_id')
        .not('user_id', 'is', null);

      if (studentsError) throw studentsError;

      const existingUserIds = new Set(existingStudents?.map(s => s.user_id));
      const studentRoleUserIds = new Set(roles?.map(r => r.user_id));

      // Filter profiles: students who don't have a student record yet
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
          role: 'student'
        })) || [];

      setAuthorizedUsers(availableUsers);
    } catch (error) {
      console.error('Error fetching authorized users:', error);
      toast({
        title: "Error",
        description: "Failed to load authorized users",
        variant: "destructive",
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const filteredStudents = students.filter((student) => {
    const matchesClass = selectedClass === "all" || student.class_id === selectedClass;
    const matchesSearch =
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesClass && matchesSearch;
  });

  const getClassName = (classId: string) => {
    return classes.find((c) => c.id === classId)?.name || "Unassigned";
  };

  const handleCreate = () => {
    if (!selectedUserId || !studentIdInput.trim() || !selectedClassId) {
      toast({
        title: "Error",
        description: "Please select a user, enter Student ID, and assign to class",
        variant: "destructive",
      });
      return;
    }

    const selectedUser = authorizedUsers.find(u => u.user_id === selectedUserId);
    if (!selectedUser) return;

    createStudent.mutate({
      id: studentIdInput,
      name: selectedUser.full_name,
      class_id: selectedClassId,
      email: selectedUser.email,
    }, {
      onSuccess: () => {
        setSelectedUserId("");
        setStudentIdInput("");
        setSelectedClassId("");
        setIsCreateOpen(false);
      }
    });
  };

  const handleDelete = (studentId: string) => {
    if (confirm("Are you sure you want to delete this student record?")) {
      deleteStudent.mutate(studentId);
    }
  };

  const openMoveDialog = (student: typeof students[0]) => {
    setSelectedStudent(student);
    setMoveToClass("");
    setIsMoveOpen(true);
  };

  const handleMove = () => {
    if (!selectedStudent || !moveToClass) return;

    updateStudent.mutate({
      id: selectedStudent.id,
      class_id: moveToClass,
    }, {
      onSuccess: () => {
        setIsMoveOpen(false);
        setSelectedStudent(null);
        toast({
          title: "Success",
          description: `Student moved to ${getClassName(moveToClass)}`,
        });
      }
    });
  };

  const autoGenerateStudentId = () => {
    const newId = generateStudentId(students || []);
    setStudentIdInput(newId);
  };

  if (studentsLoading || classesLoading) {
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
          <h3 className="text-lg font-semibold">Students</h3>
          <p className="text-sm text-muted-foreground">
            Link authorized users to student records
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
              <DialogTitle>Link User to Student Record</DialogTitle>
              <p className="text-sm text-muted-foreground">
                Select an authorized user to create their student record
              </p>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Select Authorized User */}
              <div className="space-y-2">
                <Label>Select Authorized User</Label>
                <Popover open={usersOpen} onOpenChange={setUsersOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={usersOpen}
                      className="w-full justify-between"
                      disabled={loadingUsers}
                    >
                      {loadingUsers ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading users...
                        </span>
                      ) : selectedUserId ? (
                        authorizedUsers.find(u => u.user_id === selectedUserId)?.full_name
                      ) : (
                        "Select user..."
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search users..." />
                      <CommandEmpty>
                        {authorizedUsers.length === 0 ? (
                          <div className="p-4 text-center text-sm text-muted-foreground">
                            No authorized users without student records found.
                            <br />
                            Users must sign up first and have student role.
                          </div>
                        ) : (
                          "No user found."
                        )}
                      </CommandEmpty>
                      <CommandGroup>
                        {authorizedUsers.map((user) => (
                          <CommandItem
                            key={user.user_id}
                            onSelect={() => {
                              setSelectedUserId(user.user_id);
                              setUsersOpen(false);
                            }}
                          >
                            <CheckCircle2
                              className={`mr-2 h-4 w-4 ${
                                selectedUserId === user.user_id
                                  ? "opacity-100"
                                  : "opacity-0"
                              }`}
                            />
                            <div className="flex flex-col">
                              <span className="font-medium">{user.full_name}</span>
                              <span className="text-xs text-muted-foreground">{user.email}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
                {authorizedUsers.length === 0 && !loadingUsers && (
                  <p className="text-xs text-amber-600">
                    ℹ️ All authorized users already have student records, or no users with student role exist.
                  </p>
                )}
              </div>

              {/* Student ID Input */}
              <div className="space-y-2">
                <Label htmlFor="studentId">Student ID</Label>
                <div className="flex gap-2">
                  <Input
                    id="studentId"
                    placeholder="e.g., STU0009"
                    value={studentIdInput}
                    onChange={(e) => setStudentIdInput(e.target.value.toUpperCase())}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={autoGenerateStudentId}
                  >
                    Auto
                  </Button>
                </div>
              </div>

              {/* Assign to Class */}
              <div className="space-y-2">
                <Label htmlFor="assignClass">Assign to Class</Label>
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
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
              <Button 
                onClick={handleCreate} 
                className="gradient-primary text-primary-foreground"
                disabled={!selectedUserId || !studentIdInput || !selectedClassId || createStudent.isPending}
              >
                {createStudent.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Student Record"
                )}
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
                      {getClassName(student.class_id)}
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
                      disabled={deleteStudent.isPending}
                    >
                      {deleteStudent.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
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
                    Currently in: {getClassName(selectedStudent.class_id)}
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
                        .filter((c) => c.id !== selectedStudent.class_id)
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
              disabled={!moveToClass || updateStudent.isPending}
              className="gradient-primary text-primary-foreground"
            >
              {updateStudent.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Moving...
                </>
              ) : (
                "Move Student"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
