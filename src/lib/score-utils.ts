export const calculateSubjectScore = (student: any, subject: any) => {
  let totalScore = 0;
  let totalMaxScore = 0;

  if (!subject.subTopics || !student.scores) {
    return { score: 0, maxScore: 0, percentage: 0 };
  }

  subject.subTopics.forEach((subTopic: any) => {
    const scoreEntry = student.scores.find((s: any) => s.subTopicId === subTopic.id);
    totalScore += scoreEntry?.score || 0;
    totalMaxScore += subTopic.maxScore;
  });

  return {
    score: totalScore,
    maxScore: totalMaxScore,
    percentage: totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0,
  };
};

export const getStudentTotalScore = (student: any, subjects: any[]) => {
  if (!subjects || !subjects.length) return { score: 0, maxScore: 0, percentage: 0 };
  
  let totalScore = 0;
  let totalMaxScore = 0;
  
  subjects.forEach(subject => {
    const { score, maxScore } = calculateSubjectScore(student, subject);
    totalScore += score;
    totalMaxScore += maxScore;
  });
  
  return {
    score: totalScore,
    maxScore: totalMaxScore,
    percentage: totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0
  };
};
