import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { AppLayout } from "@/components/layout/AppLayout";
import { TeacherDashboard } from "@/components/dashboard/TeacherDashboard";
import { ScoresView } from "@/components/scores/ScoresView";
import { ManagementDashboard } from "@/components/management/ManagementDashboard";
import UserManagement from "@/components/admin/UserManagement";
import SubjectDetail from "@/pages/SubjectDetail";
import StudentScoreDetail from "@/pages/StudentScoreDetail";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            
            {/* Protected Layout Routes */}
            <Route element={<AppLayout />}>
              <Route path="/" element={<Index />} />
              <Route path="/dashboard" element={<TeacherDashboard />} />
              <Route path="/scores" element={<ScoresView />} />
              <Route path="/scores/:subjectId" element={<SubjectDetail />} />
              <Route path="/student/scores" element={<StudentScoreDetail />} />
              <Route path="/management" element={<ManagementDashboard />} />
              <Route path="/users" element={<UserManagement />} />
            </Route>

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
