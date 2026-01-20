import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header, UserRole, ViewMode } from "@/components/layout/Header";
import { TeacherDashboard } from "@/components/dashboard/TeacherDashboard";
import { StudentDashboard } from "@/components/dashboard/StudentDashboard";
import { ManagementDashboard } from "@/components/management/ManagementDashboard";
import { ScoresView } from "@/components/scores/ScoresView";
import { mockStudents } from "@/lib/mockData";

const Index = () => {
  const [currentRole, setCurrentRole] = useState<UserRole>("teacher");
  const [viewMode, setViewMode] = useState<ViewMode>("dashboard");
  
  // For demo, use the first student
  const demoStudent = mockStudents[0];

  // Reset to dashboard when switching to student role
  const handleRoleChange = (role: UserRole) => {
    setCurrentRole(role);
    if (role === "student") {
      setViewMode("dashboard");
    }
  };

  return (
    <div className="min-h-screen">
      <Header
        currentRole={currentRole}
        onRoleChange={handleRoleChange}
        studentName={demoStudent.name}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />
      
      <main className="container py-8">
        <AnimatePresence mode="wait">
          {currentRole === "teacher" ? (
            viewMode === "dashboard" ? (
              <motion.div
                key="teacher-dashboard"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <TeacherDashboard />
              </motion.div>
            ) : viewMode === "scores" ? (
              <motion.div
                key="teacher-scores"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <ScoresView />
              </motion.div>
            ) : (
              <motion.div
                key="teacher-management"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <ManagementDashboard />
              </motion.div>
            )
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
          <p>แพลตฟอร์ม EduAssess • ระบบวิเคราะห์ผลสอบ Pre-A-Level</p>
          <p className="mt-1 text-xs">
            โหมดทดลอง — สลับระหว่างมุมมองครูและนักเรียนด้านบน
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
