import { motion } from "framer-motion";
import { Upload, Download, Settings } from "lucide-react";
import { AnalyticsDashboard } from "./AnalyticsDashboard";
import { Button } from "@/components/ui/button";
import { YearSelector } from "@/components/common/YearSelector";
import { useCurrentAcademicYear } from "@/hooks/useSupabaseData";
import { useState, useEffect } from "react";

export function TeacherDashboard() {
  const { data: currentYear } = useCurrentAcademicYear();
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const activeYear = selectedYear || currentYear?.year_number || 2568;

  useEffect(() => {
    const storedYear = window.localStorage.getItem('selectedYear');
    if (storedYear) {
      const yearNum = parseInt(storedYear, 10);
      if (!isNaN(yearNum)) {
        setSelectedYear(yearNum);
      }
      // Optional: Clear it so it doesn't persist if we navigate away and back significantly later? 
      // Or keep it? Let's clear it to treat it as a "one-time" navigation intent.
      window.localStorage.removeItem('selectedYear');
    }
  }, []);

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