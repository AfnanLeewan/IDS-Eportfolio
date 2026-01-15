import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header, UserRole } from "@/components/layout/Header";
import { TeacherDashboard } from "@/components/dashboard/TeacherDashboard";
import { StudentDashboard } from "@/components/dashboard/StudentDashboard";
import { mockStudents } from "@/lib/mockData";

const Index = () => {
  const [currentRole, setCurrentRole] = useState<UserRole>("teacher");
  
  // For demo, use the first student
  const demoStudent = mockStudents[0];

  return (
    <div className="min-h-screen">
      <Header
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        studentName={demoStudent.name}
      />
      
      <main className="container py-8">
        <AnimatePresence mode="wait">
          {currentRole === "teacher" ? (
            <motion.div
              key="teacher"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <TeacherDashboard />
            </motion.div>
          ) : (
            <motion.div
              key="student"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <StudentDashboard student={demoStudent} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card/80 backdrop-blur-sm py-6">
        <div className="container text-center text-sm text-muted-foreground">
          <p>EduAssess Platform • Pre-A-Level Analytics System</p>
          <p className="mt-1 text-xs">
            Demo Mode — Toggle between Teacher and Student views above
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
