// Mock data structure for the Assessment Platform

export interface SubTopic {
  id: string;
  name: string;
  maxScore: number;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  subTopics: SubTopic[];
}

export interface ExamProgram {
  id: string;
  name: string;
  subjects: Subject[];
}

export interface StudentScore {
  subTopicId: string;
  score: number;
}

export interface Student {
  id: string;
  name: string;
  classId: string;
  scores: StudentScore[];
}

export interface ClassGroup {
  id: string;
  name: string;
  program: string;
}

// Pre-A-Level Exam Program with 7 subjects
export const preALevelProgram: ExamProgram = {
  id: "pre-a-level",
  name: "Pre-A-Level",
  subjects: [
    {
      id: "physics",
      name: "Physics",
      code: "PHY",
      subTopics: [
        { id: "phy-mechanics", name: "Mechanics", maxScore: 25 },
        { id: "phy-waves", name: "Waves & Optics", maxScore: 20 },
        { id: "phy-electricity", name: "Electricity", maxScore: 25 },
        { id: "phy-nuclear", name: "Nuclear Physics", maxScore: 15 },
        { id: "phy-thermo", name: "Thermodynamics", maxScore: 15 },
      ],
    },
    {
      id: "chemistry",
      name: "Chemistry",
      code: "CHE",
      subTopics: [
        { id: "che-organic", name: "Organic Chemistry", maxScore: 30 },
        { id: "che-inorganic", name: "Inorganic Chemistry", maxScore: 25 },
        { id: "che-physical", name: "Physical Chemistry", maxScore: 25 },
        { id: "che-analytical", name: "Analytical Chemistry", maxScore: 20 },
      ],
    },
    {
      id: "biology",
      name: "Biology",
      code: "BIO",
      subTopics: [
        { id: "bio-cell", name: "Cell Biology", maxScore: 20 },
        { id: "bio-genetics", name: "Genetics", maxScore: 25 },
        { id: "bio-ecology", name: "Ecology", maxScore: 20 },
        { id: "bio-human", name: "Human Physiology", maxScore: 20 },
        { id: "bio-evolution", name: "Evolution", maxScore: 15 },
      ],
    },
    {
      id: "math",
      name: "Mathematics",
      code: "MAT",
      subTopics: [
        { id: "mat-algebra", name: "Algebra", maxScore: 25 },
        { id: "mat-calculus", name: "Calculus", maxScore: 30 },
        { id: "mat-statistics", name: "Statistics", maxScore: 20 },
        { id: "mat-geometry", name: "Geometry", maxScore: 25 },
      ],
    },
    {
      id: "english",
      name: "English",
      code: "ENG",
      subTopics: [
        { id: "eng-reading", name: "Reading Comprehension", maxScore: 30 },
        { id: "eng-writing", name: "Writing", maxScore: 30 },
        { id: "eng-grammar", name: "Grammar & Usage", maxScore: 20 },
        { id: "eng-vocabulary", name: "Vocabulary", maxScore: 20 },
      ],
    },
    {
      id: "thai",
      name: "Thai Language",
      code: "THA",
      subTopics: [
        { id: "tha-reading", name: "Reading", maxScore: 30 },
        { id: "tha-writing", name: "Writing", maxScore: 35 },
        { id: "tha-literature", name: "Literature", maxScore: 35 },
      ],
    },
    {
      id: "social",
      name: "Social Studies",
      code: "SOC",
      subTopics: [
        { id: "soc-history", name: "History", maxScore: 25 },
        { id: "soc-geography", name: "Geography", maxScore: 25 },
        { id: "soc-civics", name: "Civics", maxScore: 25 },
        { id: "soc-economics", name: "Economics", maxScore: 25 },
      ],
    },
  ],
};

export const classGroups: ClassGroup[] = [
  { id: "m6-1", name: "M.6/1", program: "pre-a-level" },
  { id: "m6-2", name: "M.6/2", program: "pre-a-level" },
  { id: "m6-3", name: "M.6/3", program: "pre-a-level" },
];

// Generate random scores for demonstration
const generateStudentScores = (subjects: Subject[]): StudentScore[] => {
  const scores: StudentScore[] = [];
  subjects.forEach((subject) => {
    subject.subTopics.forEach((subTopic) => {
      // Generate a score that's somewhat realistic (not completely random)
      const baseScore = Math.random() * 0.4 + 0.4; // 40-80% base
      const variation = (Math.random() - 0.5) * 0.3; // ±15% variation
      const percentage = Math.min(1, Math.max(0, baseScore + variation));
      scores.push({
        subTopicId: subTopic.id,
        score: Math.round(subTopic.maxScore * percentage),
      });
    });
  });
  return scores;
};

const studentNames = [
  "Somchai Prasert",
  "Nattapong Wongsa",
  "Pimchanok Siriwat",
  "Thanakorn Jitman",
  "Kanokwan Thongchai",
  "Worawit Suksawat",
  "Rattana Phongsri",
  "Pakorn Nitirat",
  "Siriporn Chaiyaphum",
  "Kritsada Bunmee",
  "Naree Wattana",
  "Surasak Kongphan",
  "Manee Rattanapong",
  "Wichai Somboon",
  "Duangjai Phonphat",
];

export const generateStudents = (): Student[] => {
  const students: Student[] = [];
  let studentIndex = 0;
  
  classGroups.forEach((classGroup) => {
    for (let i = 0; i < 5; i++) {
      const name = studentNames[studentIndex % studentNames.length];
      students.push({
        id: `STU${String(studentIndex + 1).padStart(4, "0")}`,
        name,
        classId: classGroup.id,
        scores: generateStudentScores(preALevelProgram.subjects),
      });
      studentIndex++;
    }
  });
  
  return students;
};

export const mockStudents = generateStudents();

// Helper functions
export const getSubjectScore = (student: Student, subjectId: string): { score: number; maxScore: number; percentage: number } => {
  const subject = preALevelProgram.subjects.find((s) => s.id === subjectId);
  if (!subject) return { score: 0, maxScore: 0, percentage: 0 };

  let totalScore = 0;
  let totalMaxScore = 0;

  subject.subTopics.forEach((subTopic) => {
    const scoreEntry = student.scores.find((s) => s.subTopicId === subTopic.id);
    totalScore += scoreEntry?.score || 0;
    totalMaxScore += subTopic.maxScore;
  });

  return {
    score: totalScore,
    maxScore: totalMaxScore,
    percentage: totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0,
  };
};

export const getTotalScore = (student: Student): { score: number; maxScore: number; percentage: number } => {
  let totalScore = 0;
  let totalMaxScore = 0;

  preALevelProgram.subjects.forEach((subject) => {
    const subjectScore = getSubjectScore(student, subject.id);
    totalScore += subjectScore.score;
    totalMaxScore += subjectScore.maxScore;
  });

  return {
    score: totalScore,
    maxScore: totalMaxScore,
    percentage: totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0,
  };
};

export const getClassAverage = (classId: string, subjectId: string): number => {
  const classStudents = mockStudents.filter((s) => s.classId === classId);
  if (classStudents.length === 0) return 0;

  const total = classStudents.reduce((acc, student) => {
    return acc + getSubjectScore(student, subjectId).percentage;
  }, 0);

  return total / classStudents.length;
};

export const getOverallClassAverage = (classId: string): number => {
  const classStudents = mockStudents.filter((s) => s.classId === classId);
  if (classStudents.length === 0) return 0;

  const total = classStudents.reduce((acc, student) => {
    return acc + getTotalScore(student).percentage;
  }, 0);

  return total / classStudents.length;
};

export const getSubTopicAverage = (subTopicId: string): number => {
  const subTopic = preALevelProgram.subjects
    .flatMap((s) => s.subTopics)
    .find((st) => st.id === subTopicId);
  
  if (!subTopic) return 0;

  const total = mockStudents.reduce((acc, student) => {
    const scoreEntry = student.scores.find((s) => s.subTopicId === subTopicId);
    return acc + ((scoreEntry?.score || 0) / subTopic.maxScore) * 100;
  }, 0);

  return total / mockStudents.length;
};
