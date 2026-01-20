import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Header, ViewMode } from "@/components/layout/Header";
import { TeacherDashboard } from "@/components/dashboard/TeacherDashboard";
import { StudentDashboard } from "@/components/dashboard/StudentDashboard";
import { ManagementDashboard } from "@/components/management/ManagementDashboard";
import { ScoresView } from "@/components/scores/ScoresView";
import UserManagement from "@/components/admin/UserManagement";
import { mockStudents } from "@/lib/mockData";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading, isAdmin, isTeacher, isStudent, role } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>("dashboard");
  
  // For demo, use the first student
  const demoStudent = mockStudents[0];

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const renderContent = () => {
    // Student can only see their dashboard
    if (isStudent) {
      return (
        <motion.div
          key="student"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <StudentDashboard student={demoStudent} />
        </motion.div>
      );
    }

    // Admin and Teacher views
    switch (viewMode) {
      case "dashboard":
        return (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <TeacherDashboard />
          </motion.div>
        );
      case "scores":
        return (
          <motion.div
            key="scores"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <ScoresView />
          </motion.div>
        );
      case "management":
        return (
          <motion.div
            key="management"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <ManagementDashboard />
          </motion.div>
        );
      case "users":
        return isAdmin ? (
          <motion.div
            key="users"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <UserManagement />
          </motion.div>
        ) : null;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen">
      <Header
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />
      
      <main className="container py-8">
        <AnimatePresence mode="wait">
          {renderContent()}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card/80 backdrop-blur-sm py-6">
        <div className="container text-center text-sm text-muted-foreground">
          <p>แพลตฟอร์ม EduAssess • ระบบวิเคราะห์ผลสอบ Pre-A-Level</p>
          <p className="mt-1 text-xs">
            คุณเข้าสู่ระบบในฐานะ: {role === 'admin' ? 'ผู้ดูแลระบบ' : role === 'teacher' ? 'ครู' : 'นักเรียน'}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
