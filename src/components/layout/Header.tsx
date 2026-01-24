import { motion } from "framer-motion";
import { GraduationCap, User, Users, Search, Bell, ChevronDown, Settings, LayoutDashboard, FileSpreadsheet, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ViewMode = "dashboard" | "management" | "scores" | "users";

interface HeaderProps {
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
}

export function Header({ viewMode = "dashboard", onViewModeChange }: HeaderProps) {
  const { profile, role, signOut, isAdmin, isTeacher } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const getRoleLabel = () => {
    switch (role) {
      case 'admin': return 'ผู้ดูแลระบบ';
      case 'teacher': return 'ครู';
      case 'student': return 'นักเรียน';
      default: return 'ผู้ใช้';
    }
  };

  const getRoleIcon = () => {
    switch (role) {
      case 'admin': return <Shield className="h-4 w-4" />;
      case 'teacher': return <Users className="h-4 w-4" />;
      case 'student': return <User className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const getInitials = () => {
    if (profile?.full_name) {
      return profile.full_name.charAt(0).toUpperCase();
    }
    if (profile?.email) {
      return profile.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

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
            <h1 className="text-lg font-bold tracking-tight text-foreground">IDS E-Portfolio system</h1>
          </div>
        </div>

        {/* Search Bar */}


        <div className="flex items-center gap-4">
          {/* View Mode Toggle (Admin and Teacher) */}
          {(isAdmin || isTeacher) && onViewModeChange && (
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
                <span className="hidden sm:inline">แดชบอร์ด</span>
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
                <span className="hidden sm:inline">คะแนน</span>
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
                <span className="hidden sm:inline">จัดการ</span>
              </Button>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewModeChange("users")}
                  className={cn(
                    "relative gap-2 px-3 rounded-lg transition-all",
                    viewMode === "users"
                      ? "bg-card shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-transparent"
                  )}
                >
                  <Shield className="h-4 w-4" />
                  <span className="hidden sm:inline">ผู้ใช้</span>
                </Button>
              )}
            </div>
          )}

          {/* Role Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50">
            {getRoleIcon()}
            <span className="text-sm font-medium">{getRoleLabel()}</span>
          </div>

  

          {/* User Info with Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2 cursor-pointer hover:bg-muted transition-colors">
                <div className="h-8 w-8 rounded-full gradient-primary flex items-center justify-center">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <span className="text-xs font-medium text-primary-foreground">
                      {getInitials()}
                    </span>
                  )}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-foreground">
                    {profile?.full_name || profile?.email || 'ผู้ใช้'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {getRoleLabel()}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{profile?.full_name || 'ผู้ใช้'}</p>
                <p className="text-xs text-muted-foreground">{profile?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                ออกจากระบบ
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.header>
  );
}
