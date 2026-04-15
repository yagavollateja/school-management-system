import { supabase } from "@/integrations/supabase/client";

export interface StudentInfo {
  id: string;
  userId: string;
  name: string;
  email: string;
  rollNumber: number;
  className: string;
  sectionName: string;
  classId: string;
  sectionId: string;
}

export interface MarksEntry {
  id: string;
  student_id: string;
  subject: string;
  marks_obtained: number;
  total_marks: number;
  exam_type: string;
  term: string;
  academic_year: string;
  remarks: string | null;
}

export interface MarksMemoData {
  student: StudentInfo;
  marks: MarksEntry[];
  attendance?: {
    total: number;
    present: number;
    percentage: number;
  };
}

export const getStudentInfo = async (studentId: string): Promise<StudentInfo | null> => {
  const { data: student, error } = await supabase
    .from("students")
    .select("id, user_id, roll_number, class_id, section_id")
    .eq("id", studentId)
    .single();

  if (error || !student) return null;

  const [{ data: profile }, { data: cls }, { data: section }] = await Promise.all([
    supabase.from("profiles").select("name, email").eq("user_id", student.user_id).single(),
    supabase.from("classes").select("name").eq("id", student.class_id).single(),
    supabase.from("sections").select("name").eq("id", student.section_id).single(),
  ]);

  return {
    id: student.id,
    userId: student.user_id,
    name: profile?.name || "",
    email: profile?.email || "",
    rollNumber: student.roll_number,
    className: cls?.name || "",
    sectionName: section?.name || "",
    classId: student.class_id,
    sectionId: student.section_id,
  };
};

export const getStudentMarks = async (
  studentId: string,
  filters?: { term?: string; examType?: string; academicYear?: string }
): Promise<MarksEntry[]> => {
  let query = supabase
    .from("marks")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });

  if (filters?.term && filters.term !== "all") {
    query = query.eq("term", filters.term);
  }
  if (filters?.examType && filters.examType !== "all") {
    query = query.eq("exam_type", filters.examType);
  }
  if (filters?.academicYear && filters.academicYear !== "all") {
    query = query.eq("academic_year", filters.academicYear);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching marks:", error);
    return [];
  }

  return data || [];
};

export const getStudentAttendance = async (
  studentId: string,
  academicYear?: string
): Promise<{ total: number; present: number; percentage: number } | undefined> => {
  const { data: student } = await supabase
    .from("students")
    .select("class_id")
    .eq("id", studentId)
    .single();

  if (!student) return undefined;

  let query = supabase
    .from("attendance")
    .select("status")
    .eq("student_id", studentId);

  if (academicYear) {
    query = query.like("date", `${academicYear}%`);
  }

  const { data } = await query;

  if (!data) return { total: 0, present: 0, percentage: 0 };

  const total = data.length;
  const present = data.filter(a => a.status === "present").length;
  const percentage = Math.round((present / total) * 100);

  return { total, present, percentage };
};

export const getStudentMarksMemo = async (
  studentId: string,
  filters?: { term?: string; examType?: string; academicYear?: string }
): Promise<MarksMemoData | null> => {
  const [studentInfo, marks, attendance] = await Promise.all([
    getStudentInfo(studentId),
    getStudentMarks(studentId, filters),
    getStudentAttendance(studentId, filters?.academicYear),
  ]);

  if (!studentInfo) return null;

  return {
    student: studentInfo,
    marks,
    attendance,
  };
};

export const getStudentsByClass = async (classId: string) => {
  const { data: students } = await supabase
    .from("students")
    .select("id, user_id, roll_number, section_id")
    .eq("class_id", classId)
    .order("roll_number");

  if (!students) return [];

  const userIds = students.map(s => s.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, name, email")
    .in("user_id", userIds);

  const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

  return students.map(s => ({
    id: s.id,
    userId: s.user_id,
    name: profileMap.get(s.user_id)?.name || "",
    email: profileMap.get(s.user_id)?.email || "",
    rollNumber: s.roll_number,
    sectionId: s.section_id,
  }));
};

export const getAllAcademicYears = async (): Promise<string[]> => {
  const { data } = await supabase
    .from("marks")
    .select("academic_year")
    .order("academic_year", { ascending: false });

  const years = new Set(data?.map(m => m.academic_year) || []);
  return Array.from(years);
};

export const getTerms = () => ["Term1", "Term2", "Term3"];
export const getExamTypes = () => ["unit_test", "midterm", "final", "assignment", "practical"];