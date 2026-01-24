import { motion } from "framer-motion";
import { GraduationCap, User, Users, Search, Bell, ChevronDown, Settings, LayoutDashboard, FileSpreadsheet, LogOut, Shield, Key, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useChangePassword } from "@/hooks/useSupabaseData";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const changePasswordMutation = useChangePassword();

  const handleChangePassword = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      return; 
    }

    try {
      await changePasswordMutation.mutateAsync(newPassword);
      setChangePasswordOpen(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error(error);
    }
  };

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
      className="sticky top-0 z-50 w-full border-b border-secondary/80 bg-secondary shadow-card"
    >
    
      <div className="container flex h-20 items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-white rounded-xl shadow-sm flex items-center justify-center">
            <img 
              src="/Logo.png" 
              alt="IDS Logo" 
              className="h-12 w-auto object-contain"
            />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">IDS E-Portfolio System</h1>
          </div>
        </div>

        {/* Search Bar */}


        <div className="flex items-center gap-4">
          {/* View Mode Toggle (Admin and Teacher) */}
          {(isAdmin || isTeacher) && onViewModeChange && (
            <div className="flex rounded-xl bg-white/10 p-1 border border-white/20">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewModeChange("dashboard")}
                className={cn(
                  "relative gap-2 px-3 rounded-lg transition-all font-medium",
                  viewMode === "dashboard"
                    ? "bg-primary text-white shadow-sm hover:bg-primary/90"
                    : "text-white/80 hover:text-white hover:bg-white/10"
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
                  "relative gap-2 px-3 rounded-lg transition-all font-medium",
                  viewMode === "scores"
                    ? "bg-primary text-white shadow-sm hover:bg-primary/90"
                    : "text-white/80 hover:text-white hover:bg-white/10"
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
                  "relative gap-2 px-3 rounded-lg transition-all font-medium",
                  viewMode === "management"
                    ? "bg-primary text-white shadow-sm hover:bg-primary/90"
                    : "text-white/80 hover:text-white hover:bg-white/10"
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
                    "relative gap-2 px-3 rounded-lg transition-all font-medium",
                    viewMode === "users"
                      ? "bg-primary text-white shadow-sm hover:bg-primary/90"
                      : "text-white/80 hover:text-white hover:bg-white/10"
                  )}
                >
                  <Shield className="h-4 w-4" />
                  <span className="hidden sm:inline">ผู้ใช้</span>
                </Button>
              )}
            </div>
          )}

          {/* Role Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white">
            {getRoleIcon()}
            <span className="text-sm font-medium">{getRoleLabel()}</span>
          </div>

  

          {/* User Info with Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 cursor-pointer hover:bg-white/20 transition-colors border border-white/20">
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <span className="text-xs font-medium text-white">
                      {getInitials()}
                    </span>
                  )}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-white">
                    {profile?.full_name || profile?.email || 'ผู้ใช้'}
                  </p>
                  <p className="text-xs text-white/70">
                    {getRoleLabel()}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 text-white/70 hidden sm:block" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{profile?.full_name || 'ผู้ใช้'}</p>
                <p className="text-xs text-muted-foreground">{profile?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setChangePasswordOpen(true)} className="cursor-pointer">
                <Key className="mr-2 h-4 w-4" />
                เปลี่ยนรหัสผ่าน
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                ออกจากระบบ
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Change Password Dialog */}
      <Dialog open={changePasswordOpen} onOpenChange={(open) => {
        setChangePasswordOpen(open);
        if (!open) {
          setNewPassword('');
          setConfirmPassword('');
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>เปลี่ยนรหัสผ่าน</DialogTitle>
            <DialogDescription>
              กำหนดรหัสผ่านใหม่สำหรับบัญชีของคุณ
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="new-password">รหัสผ่านใหม่</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="ระบุรหัสผ่านใหม่..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm-password">ยืนยันรหัสผ่านใหม่</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="ระบุรหัสผ่านใหม่อีกครั้ง..."
              />
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                 <p className="text-xs text-destructive">รหัสผ่านไม่ตรงกัน</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangePasswordOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleChangePassword} disabled={!newPassword || !confirmPassword || newPassword !== confirmPassword || changePasswordMutation.isPending}>
              {changePasswordMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              บันทึกรหัสผ่าน
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.header>
  );
}
