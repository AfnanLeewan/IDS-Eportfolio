import { useState } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, BookOpen, GraduationCap, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClassManagement } from "./ClassManagement";
import { SubjectManagement } from "./SubjectManagement";
import { StudentManagement } from "./StudentManagement";

export function ManagementDashboard() {
  const [activeTab, setActiveTab] = useState("classes");

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-between gap-4"
      >
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Management</h2>
          <p className="text-muted-foreground">
            Configure classes, subjects, and manage students
          </p>
        </div>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-card shadow-card border-0 p-1 rounded-xl">
          <TabsTrigger
            value="classes"
            className="gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <GraduationCap className="h-4 w-4" />
            Classes
          </TabsTrigger>
          <TabsTrigger
            value="subjects"
            className="gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <BookOpen className="h-4 w-4" />
            Subjects
          </TabsTrigger>
          <TabsTrigger
            value="students"
            className="gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Users className="h-4 w-4" />
            Students
          </TabsTrigger>
        </TabsList>

        <TabsContent value="classes" className="mt-6">
          <ClassManagement />
        </TabsContent>

        <TabsContent value="subjects" className="mt-6">
          <SubjectManagement />
        </TabsContent>

        <TabsContent value="students" className="mt-6">
          <StudentManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
