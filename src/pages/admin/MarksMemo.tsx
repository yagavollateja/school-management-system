import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Search, Users } from "lucide-react";
import MarksMemo from "@/components/MarksMemo";
import type { StudentInfo, MarksEntry, MarksMemoData } from "@/services/marksService";

export default function AdminMarksMemo() {
  const [selectedStudent, setSelectedStudent] = useState<StudentInfo | null>(null);
  const [filterClass, setFilterClass] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTerm, setFilterTerm] = useState("all");
  const [filterExam, setFilterExam] = useState("all");
  const [filterYear, setFilterYear] = useState("all");

  const { data: classes } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const { data } = await supabase.from("classes").select("*").order("order_index");
      return data ?? [];
    },
  });

  const { data: sections } = useQuery({
    queryKey: ["sections", filterClass],
    queryFn: async () => {
      if (!filterClass) return [];
      const { data } = await supabase
        .from("sections")
        .select("*")
        .eq("class_id", filterClass)
        .order("name");
      return data ?? [];
    },
    enabled: !!filterClass,
  });

  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ["class-students", filterClass, filterSection],
    queryFn: async () => {
      if (!filterClass) return [];
      let query = supabase
        .from("students")
        .select("id, user_id, roll_number, section_id")
        .eq("class_id", filterClass);

      if (filterSection) {
        query = query.eq("section_id", filterSection);
      }

      const { data: studentData } = await query.order("roll_number");
      if (!studentData?.length) return [];

      const userIds = studentData.map(s => s.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, email")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return studentData.map(s => ({
        id: s.id,
        userId: s.user_id,
        name: profileMap.get(s.user_id)?.name || "",
        email: profileMap.get(s.user_id)?.email || "",
        rollNumber: s.roll_number,
        sectionId: s.section_id,
      }));
    },
    enabled: !!filterClass,
  });

  const { data: academicYears } = useQuery({
    queryKey: ["academic-years"],
    queryFn: async () => {
      const { data } = await supabase
        .from("marks")
        .select("academic_year")
        .order("academic_year", { ascending: false });
      const years = new Set(data?.map(m => m.academic_year) || []);
      return Array.from(years);
    },
  });

  const filteredStudents = students?.filter(
    s => !searchQuery || 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.rollNumber.toString().includes(searchQuery)
  ) ?? [];

  const { data: memoData, isLoading: memoLoading, refetch: loadMemo } = useQuery({
    queryKey: ["student-marks-memo", selectedStudent?.id, filterTerm, filterExam, filterYear],
    queryFn: async () => {
      if (!selectedStudent) return null;

      interface MarksFilters {
  term?: string;
  exam_type?: string;
  academic_year?: string;
}

const filters: MarksFilters = {};
      if (filterTerm !== "all") filters.term = filterTerm;
      if (filterExam !== "all") filters.exam_type = filterExam;
      if (filterYear !== "all") filters.academic_year = filterYear;

      const { data: marks, error } = await supabase
        .from("marks")
        .select("*")
        .eq("student_id", selectedStudent.id)
        .order("created_at", { ascending: false });

      let filteredMarks = marks || [];
      if (filters.term) filteredMarks = filteredMarks.filter(m => m.term === filters.term);
      if (filters.exam_type) filteredMarks = filteredMarks.filter(m => m.exam_type === filters.exam_type);
      if (filters.academic_year) filteredMarks = filteredMarks.filter(m => m.academic_year === filters.academic_year);

      const { data: cls } = await supabase.from("classes").select("name").eq("id", selectedStudent.classId).single();
      const { data: section } = await supabase.from("sections").select("name").eq("id", selectedStudent.sectionId).single();

      const student: StudentInfo = {
        ...selectedStudent,
        className: cls?.name || "",
        sectionName: section?.name || "",
      };

      let attendance;
      if (filterYear !== "all") {
        const { data: attendanceData } = await supabase
          .from("attendance")
          .select("status")
          .eq("student_id", selectedStudent.id)
          .like("date", `${filterYear}%`);

        if (attendanceData?.length) {
          const total = attendanceData.length;
          const present = attendanceData.filter(a => a.status === "present").length;
          attendance = { total, present, percentage: Math.round((present / total) * 100) };
        }
      }

      return {
        student,
        marks: filteredMarks as MarksEntry[],
        attendance,
      };
    },
    enabled: !!selectedStudent,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Marks Memo</h1>
        <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
          Generate and view student marks memo / report card
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <Label>Class</Label>
          <Select value={filterClass} onValueChange={setFilterClass}>
            <SelectTrigger>
              <SelectValue placeholder="Select Class" />
            </SelectTrigger>
            <SelectContent>
              {classes?.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Section</Label>
          <Select value={filterSection} onValueChange={setFilterSection}>
            <SelectTrigger>
              <SelectValue placeholder="All Sections" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sections</SelectItem>
              {sections?.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Academic Year</Label>
          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger>
              <SelectValue placeholder="All Years" />
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
          <Label>Term</Label>
          <Select value={filterTerm} onValueChange={setFilterTerm}>
            <SelectTrigger>
              <SelectValue placeholder="All Terms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Terms</SelectItem>
              <SelectItem value="Term1">Term 1</SelectItem>
              <SelectItem value="Term2">Term 2</SelectItem>
              <SelectItem value="Term3">Term 3</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search by name or roll number..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
      </div>

      {!selectedStudent ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {filteredStudents.length === 0 ? (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              {filterClass ? "No students found" : "Select a class to view students"}
            </div>
          ) : (
            filteredStudents.map(s => (
              <Card
                key={s.id}
                className="cursor-pointer hover:border-primary transition-colores"
                onClick={() => setSelectedStudent(s)}
              >
                <CardContent className="pt-4">
                  <p className="font-medium text-sm truncate">{s.name}</p>
                  <p className="text-xs text-muted-foreground">Roll: {s.rollNumber}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : memoLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : memoData ? (
        <div>
          <Button variant="outline" onClick={() => setSelectedStudent(null)} className="mb-4">
            ← Back to Student List
          </Button>
          <MarksMemo
            student={memoData.student}
            marks={memoData.marks}
            attendance={memoData.attendance}
            academicYear={filterYear !== "all" ? filterYear : academicYears?.[0] || "2024-25"}
            term={filterTerm !== "all" ? filterTerm : undefined}
            examType={filterExam !== "all" ? filterExam : undefined}
          />
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          No marks found for this student with the selected filters
        </div>
      )}
    </div>
  );
}