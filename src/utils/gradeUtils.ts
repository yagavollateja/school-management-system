export interface Mark {
  marks_obtained: number;
  total_marks: number;
  subject: string;
}

export interface GradeResult {
  grade: string;
  gradePoint: number;
  color: string;
  status: "Pass" | "Fail";
}

export const getGrade = (obtained: number, total: number): GradeResult => {
  const percentage = (obtained / total) * 100;
  
  if (percentage >= 90) {
    return { grade: "A+", gradePoint: 4.0, color: "hsl(142 70% 35%)", status: "Pass" };
  }
  if (percentage >= 80) {
    return { grade: "A", gradePoint: 4.0, color: "hsl(142 70% 40%)", status: "Pass" };
  }
  if (percentage >= 70) {
    return { grade: "B", gradePoint: 3.0, color: "hsl(210 100% 45%)", status: "Pass" };
  }
  if (percentage >= 60) {
    return { grade: "C", gradePoint: 2.0, color: "hsl(45 90% 50%)", status: "Pass" };
  }
  if (percentage >= 50) {
    return { grade: "D", gradePoint: 1.0, color: "hsl(30 90% 55%)", status: "Pass" };
  }
  return { grade: "F", gradePoint: 0.0, color: "hsl(0 70% 50%)", status: "Fail" };
};

export const calculateTotalMarks = (marks: { marks_obtained: number; total_marks: number }[]): number => {
  return marks.reduce((sum, m) => sum + Number(m.marks_obtained), 0);
};

export const calculateTotalMaxMarks = (marks: { marks_obtained: number; total_marks: number }[]): number => {
  return marks.reduce((sum, m) => sum + Number(m.total_marks), 0);
};

export const calculatePercentage = (obtained: number, total: number): number => {
  if (total === 0) return 0;
  return Number(((obtained / total) * 100).toFixed(2));
};

export const calculateOverallGrade = (marks: { marks_obtained: number; total_marks: number }[]): GradeResult => {
  const totalObtained = calculateTotalMarks(marks);
  const totalMax = calculateTotalMaxMarks(marks);
  return getGrade(totalObtained, totalMax);
};

export const groupMarksBySubject = (marks: Mark[]) => {
  const grouped = new Map<string, Mark[]>();
  
  marks.forEach(mark => {
    const existing = grouped.get(mark.subject) || [];
    existing.push(mark);
    grouped.set(mark.subject, existing);
  });
  
  return grouped;
};

export const getSubjectWiseAverage = (marks: Mark[]) => {
  const grouped = groupMarksBySubject(marks);
  const averages: { subject: string; obtained: number; max: number; percentage: number; grade: GradeResult }[] = [];
  
  grouped.forEach((subjectMarks, subject) => {
    const obtained = calculateTotalMarks(subjectMarks);
    const max = calculateTotalMaxMarks(subjectMarks);
    const percentage = calculatePercentage(obtained, max);
    const grade = getGrade(obtained, max);
    
    averages.push({ subject, obtained, max, percentage, grade });
  });
  
  return averages;
};

export const RANKING_RULES = [
  { min: 90, max: 100, rank: 1, label: "Outstanding" },
  { min: 80, max: 89, rank: 2, label: "Excellent" },
  { min: 70, max: 79, rank: 3, label: "Very Good" },
  { min: 60, max: 69, rank: 4, label: "Good" },
  { min: 50, max: 59, rank: 5, label: "Average" },
  { min: 0, max: 49, rank: 6, label: "Needs Improvement" },
];

export const calculateRank = (studentPercentage: number, allPercentages: number[]): number => {
  let rank = 1;
  allPercentages.forEach(p => {
    if (p > studentPercentage) rank++;
  });
  return rank;
};

export const getRankLabel = (rank: number): string => {
  const rule = RANKING_RULES.find(r => rank <= r.max && rank >= r.min);
  return rule?.label || "Needs Improvement";
};