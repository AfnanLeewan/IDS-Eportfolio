import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Award, TrendingUp, Target, BookOpen, Bell, X, Layout, Loader2 } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { SubjectRadarChart } from "./SubjectRadarChart";
import { ScoreBreakdown } from "./ScoreBreakdown";
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
  useStudentScores, 
  useSubjectWithTopics, 
  useClassScores,
  useNotifications,
  useMarkNotificationRead,
  useClassPrograms
} from "@/hooks/useSupabaseData";

interface StudentDashboardProps {
  student: any; // Database student object
}

const formatTimeAgo = (dateStr: string) => {
  const date = new Date(dateStr);
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
  const [showAnnouncements, setShowAnnouncements] = useState(true);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");

  // 1. Fetch Data
  const { data: studentPrograms = [] } = useClassPrograms(student.class_id);
  
  // Set default program if not set
  useEffect(() => {
    if (!selectedProgramId && studentPrograms.length > 0) {
      // Find active program or just the first one
      const defaultProgram = studentPrograms.find((p: any) => p.is_active) || studentPrograms[0];
      setSelectedProgramId(defaultProgram.id || defaultProgram.program_id);
    }
  }, [studentPrograms, selectedProgramId]);

  const { data: rawSubjects = [], isLoading: isSubjectsLoading } = useSubjectWithTopics(selectedProgramId || undefined);
  const { data: scores = [] } = useStudentScores(student.id);
  const { data: classStudents = [] } = useClassScores(student.class_id);
  
  // Notifications
  const { data: notifications = [] } = useNotifications(student.id);
  const markReadMutation = useMarkNotificationRead();

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleNotificationClick = (id: string, isRead: boolean) => {
    if (!isRead) {
      markReadMutation.mutate(id);
    }
  };

  // Reset selected subject when program changes
  useEffect(() => {
    if (rawSubjects.length > 0) {
      setSelectedSubjectId(rawSubjects[0].id);
    } else {
      setSelectedSubjectId("");
    }
  }, [selectedProgramId, rawSubjects]);

  // 2. Process Data
  const subjects = useMemo(() => {
    return rawSubjects.map((s: any) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      subTopics: (s.sub_topics || []).map((st: any) => ({
        id: st.id,
        name: st.name,
        maxScore: st.max_score || 0
      }))
    }));
  }, [rawSubjects]);

  const selectedSubject = subjects.find(s => s.id === selectedSubjectId);
  
  // Construct legacy-compatible student object for child components
  const legacyStudent = useMemo(() => ({
    id: student.id,
    name: student.name,
    classId: student.class_id,
    scores: scores.map((s: any) => ({ subTopicId: s.sub_topic_id, score: s.score }))
  }), [student, scores]);

  // Metrics Calculation
  const metrics = useMemo(() => {
    let earned = 0, max = 0;
    
    // Subject Performance
    const subjectPerf = subjects.map(subj => {
      let sEarned = 0, sMax = 0;
      subj.subTopics.forEach((st: any) => {
        const sc = scores.find((s: any) => s.sub_topic_id === st.id)?.score || 0;
        sEarned += sc;
        sMax += st.maxScore;
      });
      
      // Calculate Class Average for this subject
      let classTotal = 0;
      let studentCount = 0;
      
      if (classStudents.length > 0) {
        const sums = classStudents.map((cs: any) => {
           let studentSum = 0;
           if (!cs.student_scores) return 0;
           
           subj.subTopics.forEach((st: any) => {
             const sc = cs.student_scores.find((ss: any) => ss.sub_topic_id === st.id)?.score || 0;
             studentSum += sc;
           });
           return studentSum;
        });
        classTotal = sums.reduce((a: number, b: number) => a + b, 0);
        studentCount = classStudents.length;
      }
      
      const classAvgScore = studentCount > 0 ? classTotal / studentCount : 0;

      return {
        id: subj.id,
        name: subj.name,
        code: subj.code,
        score: sEarned,
        max: sMax,
        percentage: sMax ? (sEarned/sMax)*100 : 0,
        classAverage: sMax ? (classAvgScore/sMax)*100 : 0
      };
    });

    earned = subjectPerf.reduce((acc, s) => acc + s.score, 0);
    max = subjectPerf.reduce((acc, s) => acc + s.max, 0);

    // Rank Calculation
    const classStandings = classStudents.map((cs: any) => {
       let totalS = 0, totalM = 0;
       subjects.forEach(subj => {
          subj.subTopics.forEach((st: any) => {
             const sc = cs.student_scores?.find((ss: any) => ss.sub_topic_id === st.id)?.score || 0;
             totalS += sc;
             totalM += st.maxScore;
          });
       });
       return { id: cs.id, percentage: totalM ? (totalS/totalM)*100 : 0 };
    }).sort((a: any, b: any) => b.percentage - a.percentage);
    
    // Find my rank
    const myRank = classStandings.findIndex((cs: any) => cs.id === student.id) + 1;
    
    const percentile = classStandings.length > 1 
       ? ((classStandings.length - myRank) / (classStandings.length - 1)) * 100 
       : 100;

    return {
      totalScore: earned,
      totalMax: max,
      percentage: max ? (earned/max)*100 : 0,
      rank: myRank || 0,
      classSize: classStudents.length,
      percentile: percentile,
      subjectPerf
    };
  }, [subjects, scores, classStudents, student.id]);

  if (isSubjectsLoading && selectedProgramId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">กำลังเรียกข้อมูลโปรแกรม...</p>
      </div>
    );
  }

  // Radar Data
  const radarData = metrics.subjectPerf.map(s => ({
    subject: s.code,
    studentScore: s.percentage,
    classAverage: s.classAverage,
    fullMark: 100
  }));

  // Strengths & Weaknesses
  const sortedSubjects = [...metrics.subjectPerf].sort((a, b) => b.percentage - a.percentage);
  const strengths = sortedSubjects.slice(0, 3);
  const weaknesses = sortedSubjects.slice(-3).reverse();

  return (
    <div className="space-y-6">
      {/* Announcements Box */}
      {showAnnouncements && notifications.length > 0 && (
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
                {unreadCount > 0 && (
                  <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
                    {unreadCount} ใหม่
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
            {notifications.map((notification: any, index: number) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`group relative rounded-xl p-3 transition-colors cursor-pointer ${
                  !notification.is_read
                    ? "bg-background border border-primary/30 shadow-sm"
                    : "bg-muted/50"
                }`}
                onClick={() => handleNotificationClick(notification.id, notification.is_read)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {!notification.is_read && (
                        <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                      )}
                      <span className="font-medium text-sm text-foreground truncate">
                        {notification.title}
                      </span>
                      {notification.type === 'score_update' && (
                        <span className="text-xs text-primary font-medium px-2 py-0.5 rounded-full bg-primary/10">
                          Score Update
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      {formatTimeAgo(notification.created_at)}
                    </p>
                  </div>
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
              รหัสนักเรียน: {student.id} {student.classes?.name && `• ห้อง: ${student.classes.name}`}
            </p>
          </div>
          <div className="flex gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold">{metrics.percentage.toFixed(0)}%</p>
              <p className="text-xs text-primary-foreground/70">คะแนนรวม ({studentPrograms.find((p: any) => p.program_id === selectedProgramId)?.program_name || "All"})</p>
            </div>
            <div className="h-12 w-px bg-primary-foreground/20" />
            <div className="text-center">
              <p className="text-3xl font-bold">#{metrics.rank > 0 ? metrics.rank : "-"}</p>
              <p className="text-xs text-primary-foreground/70">อันดับในห้อง</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Program Filter Bar - Only show if student has multiple programs */}
      {studentPrograms.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-3 bg-card p-4 rounded-2xl border shadow-sm"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Layout className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">
                  เลือกหลักสูตร / โปรแกรม
                </p>
                <Select value={selectedProgramId} onValueChange={setSelectedProgramId}>
                  <SelectTrigger className="w-full sm:w-[300px] border-none shadow-none p-0 h-auto font-semibold text-lg hover:text-primary transition-colors focus:ring-0">
                    <SelectValue placeholder="เลือกโปรแกรม" />
                  </SelectTrigger>
                  <SelectContent>
                    {studentPrograms.map((p: any) => (
                      <SelectItem key={p.program_id} value={p.program_id}>
                        {p.program_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="hidden sm:block px-3 py-1 rounded-full bg-primary/5 text-primary text-xs font-medium">
                คุณมีทั้งหมด {studentPrograms.length} โปรแกรม
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="คะแนนรวม"
          value={`${metrics.totalScore}/${metrics.totalMax}`}
          subtitle={`${metrics.percentage.toFixed(1)}% โดยรวม`}
          icon={Award}
          variant="primary"
        />
        <StatCard
          title="เปอร์เซ็นไทล์"
          value={`ท็อป ${100 - Math.floor(metrics.percentile)}%`}
          subtitle={`ดีกว่า ${metrics.percentile.toFixed(0)}% ของนักเรียน`}
          icon={TrendingUp}
          variant="success"
        />
        <StatCard
          title="อันดับในห้อง"
          value={`#${metrics.rank}`}
          subtitle={`จาก ${metrics.classSize} คน`}
          icon={Target}
          variant="default"
        />
        <StatCard
          title="จำนวนวิชา"
          value={subjects.length}
          subtitle="โปรแกรมวิชา"
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
                      {subject.percentage.toFixed(0)}%
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
                          subject.percentage < 60
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
                        subject.percentage < 60
                          ? "text-destructive"
                          : "text-warning"
                      )}
                    >
                      {subject.percentage.toFixed(0)}%
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sub-topic Score Comparison with Subject Filter */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">การวิเคราะห์หัวข้อย่อย</h3>
          <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="เลือกวิชา" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((subject: any) => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedSubject && (
          <SubTopicScoreChart 
            student={legacyStudent} 
            subject={selectedSubject} 
          />
        )}
      </div>

      {/* Detailed Breakdown */}
      <ScoreBreakdown 
        subjects={subjects} 
        studentScores={scores} 
      />
    </div>
  );
}
