import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/store/authStore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import MarksMemo from "@/components/MarksMemo";
import type { StudentInfo } from "@/services/marksService";

export default function StudentMarksMemo() {
  const { profile } = useAuthStore();
  const [filterTerm, setFilterTerm] = useState("all");
  const [filterExam, setFilterExam] = useState("all");
  const [filterYear, setFilterYear] = useState("all");

  const { data: student } = useQuery({
    queryKey: ["my-student", profile?.user_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("students")
        .select("id, user_id, roll_number, class_id, section_id")
        .eq("user_id", profile!.user_id)
        .single();
      return data;
    },
    enabled: !!profile?.user_id,
  });

  const { data: academicYears } = useQuery({
    queryKey: ["my-academic-years", student?.id],
    queryFn: async () => {
      if (!student) return [];
      const { data } = await supabase
        .from("marks")
        .select("academic_year")
        .eq("student_id", student.id)
        .order("academic_year", { ascending: false });
      const years = new Set(data?.map(m => m.academic_year) || []);
      return Array.from(years);
    },
    enabled: !!student?.id,
  });

  const { data: memoData, isLoading: memoLoading } = useQuery({
    queryKey: ["my-marks-memo", student?.id, filterTerm, filterExam, filterYear],
    queryFn: async () => {
      if (!student) return null;

      interface MarksFilters {
  term?: string;
  exam_type?: string;
  academic_year?: string;
}

const filters: MarksFilters = {};
      if (filterTerm !== "all") filters.term = filterTerm;
      if (filterExam !== "all") filters.exam_type = filterExam;
      if (filterYear !== "all") filters.academic_year = filterYear;

      const { data: marks } = await supabase
        .from("marks")
        .select("*")
        .eq("student_id", student.id)
        .order("created_at", { ascending: false });

      let filteredMarks = marks || [];
      if (filters.term) filteredMarks = filteredMarks.filter(m => m.term === filters.term);
      if (filters.exam_type) filteredMarks = filteredMarks.filter(m => m.exam_type === filters.exam_type);
      if (filters.academic_year) filteredMarks = filteredMarks.filter(m => m.academic_year === filters.academic_year);

      const [{ data: profileData }, { data: cls }, { data: section }] = await Promise.all([
        supabase.from("profiles").select("name, email").eq("user_id", student.user_id).single(),
        supabase.from("classes").select("name").eq("id", student.class_id).single(),
        supabase.from("sections").select("name").eq("id", student.section_id).single(),
      ]);

      const studentInfo: StudentInfo = {
        id: student.id,
        userId: student.user_id,
        name: profileData?.name || "",
        email: profileData?.email || "",
        rollNumber: student.roll_number,
        className: cls?.name || "",
        sectionName: section?.name || "",
        classId: student.class_id,
        sectionId: student.section_id,
      };

      let attendance;
      if (filterYear !== "all") {
        const { data: attendanceData } = await supabase
          .from("attendance")
          .select("status")
          .eq("student_id", student.id)
          .like("date", `${filterYear}%`);

        if (attendanceData?.length) {
          const total = attendanceData.length;
          const present = attendanceData.filter(a => a.status === "present").length;
          attendance = { total, present, percentage: Math.round((present / total) * 100) };
        }
      }

      return {
        student: studentInfo,
        marks: filteredMarks as any[],
        attendance,
      };
    },
    enabled: !!student?.id && !!profile,
  });

  const isLoading = !student || !memoData;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">My Marks Memo</h1>
        <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
          View and download your marks memo / report card
        </p>
      </div>

      <div className="flex gap-4 flex-wrap">
        <div>
          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Academic Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {academicYears?.map(y => (
                <SelectItem key={y} value={y}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Select value={filterTerm} onValueChange={setFilterTerm}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Term" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Terms</SelectItem>
              <SelectItem value="Term1">Term 1</SelectItem>
              <SelectItem value="Term2">Term 2</SelectItem>
              <SelectItem value="Term3">Term 3</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Select value={filterExam} onValueChange={setFilterExam}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Exam Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Exams</SelectItem>
              <SelectItem value="unit_test">Unit Test</SelectItem>
              <SelectItem value="midterm">Midterm</SelectItem>
              <SelectItem value="final">Final</SelectItem>
              <SelectItem value="assignment">Assignment</SelectItem>
              <SelectItem value="practical">Practical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {memoLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : memoData ? (
        <MarksMemo
          student={memoData.student}
          marks={memoData.marks}
          attendance={memoData.attendance}
          academicYear={filterYear !== "all" ? filterYear : academicYears?.[0] || "2024-25"}
          term={filterTerm !== "all" ? filterTerm : undefined}
          examType={filterExam !== "all" ? filterExam : undefined}
        />
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          No marks found with the selected filters
        </div>
      )}
    </div>
  );
}