import { motion } from "framer-motion";
import { Upload, Download, Settings } from "lucide-react";
import { AnalyticsDashboard } from "./AnalyticsDashboard";
import { Button } from "@/components/ui/button";

export function TeacherDashboard() {
  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-between gap-4"
      >
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Teacher Dashboard</h2>
          <p className="text-muted-foreground">
            Pre-A-Level Examination • Academic Year 2025
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Download Template</span>
          </Button>
          <Button size="sm" className="gap-2 gradient-primary text-primary-foreground shadow-glow hover:opacity-90 transition-opacity">
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Upload Scores</span>
          </Button>
          <Button variant="ghost" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>

      {/* Analytics Dashboard */}
      <AnalyticsDashboard />
    </div>
  );
}