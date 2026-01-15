import { motion } from "framer-motion";
import { Users, BookOpen, TrendingUp, AlertTriangle, Upload, Download, Settings } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { SubjectRadarChart } from "./SubjectRadarChart";
import { ClassComparisonChart } from "./ClassComparisonChart";
import { WeaknessHeatmap } from "./WeaknessHeatmap";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  mockStudents,
  preALevelProgram,
  classGroups,
  getOverallClassAverage,
  getSubjectScore,
  getSubTopicAverage,
} from "@/lib/mockData";

export function TeacherDashboard() {
  // Calculate stats
  const totalStudents = mockStudents.length;
  const overallAverage =
    classGroups.reduce((acc, c) => acc + getOverallClassAverage(c.id), 0) /
    classGroups.length;

  // Calculate class averages for all subjects (for radar chart - school average)
  const schoolRadarData = preALevelProgram.subjects.map((subject) => {
    const classAverages = classGroups.map((c) => {
      const classStudents = mockStudents.filter((s) => s.classId === c.id);
      const avg =
        classStudents.reduce(
          (acc, s) => acc + getSubjectScore(s, subject.id).percentage,
          0
        ) / classStudents.length;
      return avg;
    });
    const schoolAvg = classAverages.reduce((a, b) => a + b, 0) / classAverages.length;
    
    return {
      subject: subject.code,
      studentScore: schoolAvg, // Using as "Current Cohort"
      classAverage: 65, // Placeholder for "Previous Year" or target
      fullMark: 100,
    };
  });

  // Class comparison data
  const classComparisonData = classGroups.map((c) => ({
    className: c.name,
    average: getOverallClassAverage(c.id),
  }));

  // Sub-topic performance data
  const subTopicPerformance = preALevelProgram.subjects.flatMap((subject) =>
    subject.subTopics.map((subTopic) => ({
      id: subTopic.id,
      name: subTopic.name,
      subject: subject.name,
      averagePercentage: getSubTopicAverage(subTopic.id),
    }))
  );

  // Find weakest areas
  const weakAreas = subTopicPerformance.filter((st) => st.averagePercentage < 60).length;

  return (
    <div className="space-y-8">
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

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Students"
          value={totalStudents}
          subtitle={`Across ${classGroups.length} classes`}
          icon={Users}
          variant="primary"
        />
        <StatCard
          title="Subjects Tracked"
          value={preALevelProgram.subjects.length}
          subtitle={`${preALevelProgram.subjects.reduce((acc, s) => acc + s.subTopics.length, 0)} sub-topics`}
          icon={BookOpen}
          variant="default"
        />
        <StatCard
          title="Overall Average"
          value={`${overallAverage.toFixed(1)}%`}
          subtitle="School-wide performance"
          icon={TrendingUp}
          trend={{ value: 3.2, label: "vs last term" }}
          variant="success"
        />
        <StatCard
          title="Areas of Concern"
          value={weakAreas}
          subtitle="Sub-topics below 60%"
          icon={AlertTriangle}
          variant="warning"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SubjectRadarChart
          data={schoolRadarData}
          studentName="School Average vs Target"
        />
        <ClassComparisonChart
          data={classComparisonData}
          title="Class Performance Comparison"
        />
      </div>

      {/* Weakness Analysis */}
      <WeaknessHeatmap data={subTopicPerformance} />

      {/* Recent Upload Activity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">Recent Uploads</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { subject: "Physics", class: "M.6/1", date: "2 hours ago", status: "complete" },
              { subject: "Chemistry", class: "M.6/2", date: "5 hours ago", status: "complete" },
              { subject: "Mathematics", class: "M.6/3", date: "1 day ago", status: "pending" },
            ].map((upload, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between rounded-lg border bg-muted/30 p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <BookOpen className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{upload.subject}</p>
                    <p className="text-xs text-muted-foreground">{upload.class}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{upload.date}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      upload.status === "complete"
                        ? "bg-success/10 text-success"
                        : "bg-warning/10 text-warning"
                    }`}
                  >
                    {upload.status}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
