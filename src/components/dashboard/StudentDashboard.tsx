import { useState } from "react";
import { motion } from "framer-motion";
import { Award, TrendingUp, Target, BookOpen, Bell, X } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { SubjectRadarChart } from "./SubjectRadarChart";
import { ScoreBreakdown } from "./ScoreBreakdown";
import { SkillProfileComparison } from "./SkillProfileComparison";
import { SubTopicScoreChart } from "./SubTopicScoreChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Student,
  preALevelProgram,
  getSubjectScore,
  getTotalScore,
  getClassAverage,
  mockStudents,
} from "@/lib/mockData";

interface StudentDashboardProps {
  student: Student;
}

// Mock announcements data - in real app, this would come from a backend
const mockAnnouncements = [
  {
    id: "1",
    title: "ประกาศคะแนนวิชาชีววิทยา",
    message: "คะแนนหัวข้อ Cell Biology และ Genetics ได้รับการอัปเดตแล้ว ตรวจสอบผลได้เลย!",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    isNew: true,
    subject: "Biology",
  },
  {
    id: "2",
    title: "การประเมินวิชาคณิตศาสตร์เสร็จสิ้น",
    message: "คะแนนหัวข้อย่อย Algebra และ Calculus พร้อมให้ตรวจสอบแล้ว",
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    isNew: true,
    subject: "Mathematics",
  },
  {
    id: "3",
    title: "เพิ่มคะแนนปฏิบัติวิชาฟิสิกส์",
    message: "คะแนนสอบปฏิบัติหัวข้อ Mechanics ได้รับการบันทึกแล้ว",
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    isNew: false,
    subject: "Physics",
  },
];

const formatTimeAgo = (date: Date) => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return "เมื่อสักครู่";
  if (diffHours < 24) return `${diffHours} ชม. ที่แล้ว`;
  if (diffDays === 1) return "เมื่อวาน";
  return `${diffDays} วันที่แล้ว`;
};

export function StudentDashboard({ student }: StudentDashboardProps) {
  const [selectedSubject, setSelectedSubject] = useState(preALevelProgram.subjects[0].id);
  const [announcements, setAnnouncements] = useState(mockAnnouncements);
  const [showAnnouncements, setShowAnnouncements] = useState(true);

  const newAnnouncementsCount = announcements.filter((a) => a.isNew).length;

  const dismissAnnouncement = (id: string) => {
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  };

  const markAsRead = (id: string) => {
    setAnnouncements((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isNew: false } : a))
    );
  };
  const totalScore = getTotalScore(student);
  
  const selectedSubjectData = preALevelProgram.subjects.find(s => s.id === selectedSubject);
  
  // Calculate percentile
  const allScores = mockStudents.map((s) => getTotalScore(s).percentage);
  const sortedScores = [...allScores].sort((a, b) => a - b);
  const studentRank = sortedScores.filter((s) => s < totalScore.percentage).length;
  const percentile = ((studentRank / mockStudents.length) * 100).toFixed(0);

  // Calculate class rank
  const classStudents = mockStudents.filter((s) => s.classId === student.classId);
  const classScores = classStudents.map((s) => getTotalScore(s).percentage);
  const sortedClassScores = [...classScores].sort((a, b) => b - a);
  const classRank = sortedClassScores.findIndex((s) => s === totalScore.percentage) + 1;

  // Radar chart data
  const radarData = preALevelProgram.subjects.map((subject) => {
    const studentScore = getSubjectScore(student, subject.id).percentage;
    const classAvg = getClassAverage(student.classId, subject.id);
    return {
      subject: subject.code,
      studentScore,
      classAverage: classAvg,
      fullMark: 100,
    };
  });

  // Strength/Weakness analysis
  const subjectPerformance = preALevelProgram.subjects.map((subject) => ({
    ...subject,
    score: getSubjectScore(student, subject.id),
  }));
  const sortedSubjects = [...subjectPerformance].sort(
    (a, b) => b.score.percentage - a.score.percentage
  );
  const strengths = sortedSubjects.slice(0, 3);
  const weaknesses = sortedSubjects.slice(-3).reverse();

  return (
    <div className="space-y-6">
      {/* Announcements Box */}
      {showAnnouncements && announcements.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-primary/20 bg-primary/5 p-4 shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <Bell className="h-4 w-4 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">
                ประกาศ
                {newAnnouncementsCount > 0 && (
                  <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
                    {newAnnouncementsCount} ใหม่
                  </span>
                )}
              </h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => setShowAnnouncements(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {announcements.map((announcement, index) => (
              <motion.div
                key={announcement.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`group relative rounded-xl p-3 transition-colors ${
                  announcement.isNew
                    ? "bg-background border border-primary/30 shadow-sm"
                    : "bg-muted/50"
                }`}
                onClick={() => markAsRead(announcement.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {announcement.isNew && (
                        <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                      )}
                      <span className="font-medium text-sm text-foreground truncate">
                        {announcement.title}
                      </span>
                      <span className="text-xs text-primary font-medium px-2 py-0.5 rounded-full bg-primary/10">
                        {announcement.subject}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {announcement.message}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      {formatTimeAgo(announcement.timestamp)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      dismissAnnouncement(announcement.id);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl gradient-primary p-6 text-primary-foreground shadow-glow"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold">ยินดีต้อนรับ, {student.name}!</h2>
            <p className="text-primary-foreground/80">
              รหัสนักเรียน: {student.id} • ห้อง: {classStudents[0] && classStudents[0].classId.toUpperCase().replace("-", "/")}
            </p>
          </div>
          <div className="flex gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold">{totalScore.percentage.toFixed(0)}%</p>
              <p className="text-xs text-primary-foreground/70">คะแนนรวม</p>
            </div>
            <div className="h-12 w-px bg-primary-foreground/20" />
            <div className="text-center">
              <p className="text-3xl font-bold">#{classRank}</p>
              <p className="text-xs text-primary-foreground/70">อันดับในห้อง</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="คะแนนรวม"
          value={`${totalScore.score}/${totalScore.maxScore}`}
          subtitle={`${totalScore.percentage.toFixed(1)}% โดยรวม`}
          icon={Award}
          variant="primary"
        />
        <StatCard
          title="เปอร์เซ็นไทล์"
          value={`ท็อป ${100 - parseInt(percentile)}%`}
          subtitle={`ดีกว่า ${percentile}% ของนักเรียน`}
          icon={TrendingUp}
          variant="success"
        />
        <StatCard
          title="อันดับในห้อง"
          value={`#${classRank}`}
          subtitle={`จาก ${classStudents.length} คน`}
          icon={Target}
          variant="default"
        />
        <StatCard
          title="จำนวนวิชา"
          value={preALevelProgram.subjects.length}
          subtitle="โปรแกรม Pre-A-Level"
          icon={BookOpen}
          variant="default"
        />
      </div>

      {/* Charts & Analysis */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SubjectRadarChart data={radarData} studentName={student.name} />

        {/* Strengths & Weaknesses */}
        <Card className="shadow-card border-0 rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">
              การวิเคราะห์ผลการเรียน
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Strengths */}
            <div>
              <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-success">
                <TrendingUp className="h-4 w-4" />
                วิชาที่ทำได้ดีที่สุด
              </h4>
              <div className="space-y-2">
                {strengths.map((subject, index) => (
                  <motion.div
                    key={subject.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between rounded-xl bg-success/5 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10 text-sm font-bold text-success">
                        {index + 1}
                      </div>
                      <span className="font-medium">{subject.name}</span>
                    </div>
                    <span className="font-bold text-success">
                      {subject.score.percentage.toFixed(0)}%
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Weaknesses */}
            <div>
              <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-warning">
                <Target className="h-4 w-4" />
                วิชาที่ควรปรับปรุง
              </h4>
              <div className="space-y-2">
                {weaknesses.map((subject, index) => (
                  <motion.div
                    key={subject.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className="flex items-center justify-between rounded-xl bg-warning/5 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium",
                          subject.score.percentage < 60
                            ? "bg-destructive/10 text-destructive"
                            : "bg-warning/10 text-warning"
                        )}
                      >
                        !
                      </div>
                      <span className="font-medium">{subject.name}</span>
                    </div>
                    <span
                      className={cn(
                        "font-bold",
                        subject.score.percentage < 60
                          ? "text-destructive"
                          : "text-warning"
                      )}
                    >
                      {subject.score.percentage.toFixed(0)}%
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Skill Profile Comparison Chart */}
      <SkillProfileComparison student={student} />

      {/* Sub-topic Score Comparison with Subject Filter */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">การวิเคราะห์หัวข้อย่อย</h3>
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="เลือกวิชา" />
            </SelectTrigger>
            <SelectContent>
              {preALevelProgram.subjects.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedSubjectData && (
          <SubTopicScoreChart 
            student={student} 
            subject={selectedSubjectData}
          />
        )}
      </div>

      {/* Detailed Breakdown */}
      <ScoreBreakdown student={student} />
    </div>
  );
}
