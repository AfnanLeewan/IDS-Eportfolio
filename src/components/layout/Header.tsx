import { motion } from "framer-motion";
import { GraduationCap, User, Users, Search, Bell, ChevronDown, Settings, LayoutDashboard, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type UserRole = "teacher" | "student";
export type ViewMode = "dashboard" | "management" | "scores";

interface HeaderProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  studentName?: string;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
}

export function Header({ currentRole, onRoleChange, studentName, viewMode = "dashboard", onViewModeChange }: HeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="sticky top-0 z-50 w-full border-b border-border/50 bg-card shadow-card"
    >
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary shadow-glow">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">EduAssess</h1>
            <p className="text-xs text-muted-foreground">Pre-A-Level Analytics</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full rounded-lg border border-border bg-muted/50 py-2 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* View Mode Toggle (Teacher Only) */}
          {currentRole === "teacher" && onViewModeChange && (
            <div className="flex rounded-xl bg-muted p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewModeChange("dashboard")}
                className={cn(
                  "relative gap-2 px-3 rounded-lg transition-all",
                  viewMode === "dashboard"
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-transparent"
                )}
              >
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewModeChange("scores")}
                className={cn(
                  "relative gap-2 px-3 rounded-lg transition-all",
                  viewMode === "scores"
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-transparent"
                )}
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span className="hidden sm:inline">Scores</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewModeChange("management")}
                className={cn(
                  "relative gap-2 px-3 rounded-lg transition-all",
                  viewMode === "management"
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-transparent"
                )}
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Manage</span>
              </Button>
            </div>
          )}

          {/* Role Toggle */}
          <div className="flex rounded-xl bg-muted p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRoleChange("teacher")}
              className={cn(
                "relative gap-2 px-4 rounded-lg transition-all",
                currentRole === "teacher"
                  ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-transparent"
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
                "relative gap-2 px-4 rounded-lg transition-all",
                currentRole === "student"
                  ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-transparent"
              )}
            >
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Student</span>
            </Button>
          </div>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
            <Bell className="h-5 w-5" />
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              3
            </span>
          </Button>

          {/* User Info */}
          <div className="flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2 cursor-pointer hover:bg-muted transition-colors">
            <div className="h-8 w-8 rounded-full gradient-primary flex items-center justify-center">
              <span className="text-xs font-medium text-primary-foreground">
                {currentRole === "teacher" ? "T" : "S"}
              </span>
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-foreground">
                {currentRole === "teacher" ? "Admin Teacher" : studentName || "Student"}
              </p>
              <p className="text-xs text-muted-foreground">
                {currentRole === "teacher" ? "Full Access" : "View Only"}
              </p>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
          </div>
        </div>
      </div>
    </motion.header>
  );
}
