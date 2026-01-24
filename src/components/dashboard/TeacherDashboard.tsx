import { motion } from "framer-motion";
import { Upload, Download, Settings } from "lucide-react";
import { AnalyticsDashboard } from "./AnalyticsDashboard";
import { Button } from "@/components/ui/button";
import { YearSelector } from "@/components/common/YearSelector";
import { useCurrentAcademicYear } from "@/hooks/useSupabaseData";
import { useState } from "react";

export function TeacherDashboard() {
  const { data: currentYear } = useCurrentAcademicYear();
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const activeYear = selectedYear || currentYear?.year_number || 2568;

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-between gap-4"
      >
        <div>
          <h2 className="text-2xl font-bold tracking-tight">แดชบอร์ดครู</h2>
          <p className="text-muted-foreground">
            การสอบ Pre-A-Level • ปีการศึกษา {activeYear}
          </p>
        </div>
        <div className="flex gap-2">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-4"
      >
        <span className="text-sm font-medium text-muted-foreground">ปีการศึกษา:</span>
        <YearSelector 
          value={selectedYear} 
          onValueChange={setSelectedYear}
          className="w-[260px]"
        />
      </motion.div>
        </div>
      </motion.div>

      {/* Year Selector */}


      {/* Analytics Dashboard */}
      <AnalyticsDashboard 
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
      />
    </div>
  );
}