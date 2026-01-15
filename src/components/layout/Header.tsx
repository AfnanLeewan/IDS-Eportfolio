import { motion } from "framer-motion";
import { GraduationCap, User, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type UserRole = "teacher" | "student";

interface HeaderProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  studentName?: string;
}

export function Header({ currentRole, onRoleChange, studentName }: HeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="sticky top-0 z-50 w-full border-b bg-card/80 backdrop-blur-xl"
    >
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary shadow-glow">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">EduAssess</h1>
            <p className="text-xs text-muted-foreground">Pre-A-Level Analytics</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Role Toggle */}
          <div className="flex rounded-lg bg-muted p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRoleChange("teacher")}
              className={cn(
                "relative gap-2 px-4 transition-all",
                currentRole === "teacher"
                  ? "bg-card shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Teacher</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRoleChange("student")}
              className={cn(
                "relative gap-2 px-4 transition-all",
                currentRole === "student"
                  ? "bg-card shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Student</span>
            </Button>
          </div>

          {/* User Info */}
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
            <div className="h-8 w-8 rounded-full gradient-primary flex items-center justify-center">
              <span className="text-xs font-medium text-primary-foreground">
                {currentRole === "teacher" ? "T" : "S"}
              </span>
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium">
                {currentRole === "teacher" ? "Admin Teacher" : studentName || "Student"}
              </p>
              <p className="text-xs text-muted-foreground">
                {currentRole === "teacher" ? "Full Access" : "View Only"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
