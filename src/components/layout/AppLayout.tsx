import { Outlet, Navigate, useLocation } from "react-router-dom";
import { Header } from "./Header";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";


export const AppLayout = () => {
  const { user, loading, role, isStudent, isStudentLoading } = useAuth();
  const location = useLocation();

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
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="container py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card/80 backdrop-blur-sm py-6">
        <div className="container text-center text-sm text-muted-foreground">
          <p>แพลตฟอร์ม IDS E-Portfolio system</p>
          <p className="mt-1 text-xs">
            คุณเข้าสู่ระบบในฐานะ: {role === 'admin' ? 'ผู้ดูแลระบบ' : role === 'teacher' ? 'ครู' : 'นักเรียน'}
          </p>
        </div>
      </footer>
    </div>
  );
};
