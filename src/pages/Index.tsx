import { useEffect } from "react";
import { Navigate } from "react-router-dom";

import { StudentDashboard } from "@/components/dashboard/StudentDashboard";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { useCurrentStudent } from "@/hooks/useSupabaseData";

const Index = () => {
  const { user, loading, isAdmin, isTeacher, isStudent, role } = useAuth();
  
  // Fetch current student data if applicable
  const { data: currentStudent, isLoading: isStudentLoading } = useCurrentStudent();

  if (loading || (isStudent && isStudentLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Teacher and Admin: Redirect to Dashboard
  if (isTeacher || isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // Student View
  if (isStudent) {
    if (currentStudent) {
      return (
        <StudentDashboard student={currentStudent} />
      );
    }
    return (
      <div className="flex h-[50vh] items-center justify-center text-muted-foreground">
        <p>Student profile not found. Please contact administrator.</p>
      </div>
    );
  }

  return null;
};

export default Index;
