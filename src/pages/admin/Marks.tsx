import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function AdminMarks() {
  const [filterClass, setFilterClass] = useState("all");
  const [filterTerm, setFilterTerm] = useState("all");
  const [filterExam, setFilterExam] = useState("all");

  const { data: classes } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const { data } = await supabase.from("classes").select("*").order("order_index");
      return data ?? [];
    },
  });

  const { data: marks, isLoading } = useQuery({
    queryKey: ["admin-marks", filterClass, filterTerm, filterExam],
    queryFn: async () => {
      let q = supabase
        .from("marks")
        .select("*")
        .order("created_at", { ascending: false });
      if (filterTerm !== "all") q = q.eq("term", filterTerm);
      if (filterExam !== "all") q = q.eq("exam_type", filterExam);
      const { data } = await q;
      if (!data) return [];
      
      // Fetch student and related data
      const studentIds = [...new Set(data.map(m => m.student_id))];
      const [studentsRes, profilesRes] = await Promise.all([
        supabase.from("students").select("id, user_id, class_id, section_id").in("id", studentIds),
        supabase.from("profiles").select("user_id, name, email")
      ]);
      
      const studentMap = new Map(studentsRes.data?.map(s => [s.id, s]) ?? []);
      const profileMap = new Map(profilesRes.data?.map(p => [p.user_id, p]) ?? []);
      
      const classIds = [...new Set(studentsRes.data?.map(s => s.class_id) ?? [])];
      const sectionIds = [...new Set(studentsRes.data?.map(s => s.section_id) ?? [])];
      
      const [classesRes, sectionsRes] = await Promise.all([
        supabase.from("classes").select("id, name").in("id", classIds),
        supabase.from("sections").select("id, name").in("id", sectionIds)
      ]);
      
      const classMap = new Map(classesRes.data?.map(c => [c.id, c]) ?? []);
      const sectionMap = new Map(sectionsRes.data?.map(s => [s.id, s]) ?? []);
      
      let filtered = data.map(m => {
        const student = studentMap.get(m.student_id);
        const profile = student ? profileMap.get(student.user_id) : null;
        const cls = student ? classMap.get(student.class_id) : null;
        const section = student ? sectionMap.get(student.section_id) : null;
        
        return {
          ...m,
          students: {
            ...student,
            profile: profile,
            classes: cls,
            sections: section
          }
        };
      });
      
      // Apply class filter after fetching
      if (filterClass !== "all") {
        filtered = filtered.filter(m => m.students?.class_id === filterClass);
      }
      
      return filtered;
    },
  });

  const getGrade = (obtained: number, total: number) => {
    const pct = (obtained / total) * 100;
    if (pct >= 90) return { grade: "A+", color: "hsl(var(--success))" };
    if (pct >= 80) return { grade: "A", color: "hsl(var(--success))" };
    if (pct >= 70) return { grade: "B", color: "hsl(var(--info))" };
    if (pct >= 60) return { grade: "C", color: "hsl(var(--warning))" };
    if (pct >= 40) return { grade: "D", color: "hsl(38 80% 40%)" };
    return { grade: "F", color: "hsl(var(--destructive))" };
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Marks & Results</h1>
        <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>View all student marks across subjects</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Select value={filterClass} onValueChange={setFilterClass}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Classes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {classes?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterTerm} onValueChange={setFilterTerm}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All Terms" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Terms</SelectItem>
            <SelectItem value="Term1">Term 1</SelectItem>
            <SelectItem value="Term2">Term 2</SelectItem>
            <SelectItem value="Term3">Term 3</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterExam} onValueChange={setFilterExam}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Exam Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="unit_test">Unit Test</SelectItem>
            <SelectItem value="midterm">Midterm</SelectItem>
            <SelectItem value="final">Final</SelectItem>
            <SelectItem value="assignment">Assignment</SelectItem>
            <SelectItem value="practical">Practical</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "hsl(var(--border))" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ background: "hsl(var(--muted))" }}>
              <tr>
                {["Student", "Class", "Sec", "Subject", "Exam", "Term", "Marks", "Grade"].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold" style={{ color: "hsl(var(--muted-foreground))" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="text-center py-8" style={{ color: "hsl(var(--muted-foreground))" }}>Loading...</td></tr>
              ) : marks?.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8" style={{ color: "hsl(var(--muted-foreground))" }}>No marks found</td></tr>
              ) : marks?.map((m: any, i) => {
                const { grade, color } = getGrade(Number(m.marks_obtained), Number(m.total_marks));
                return (
                  <tr key={m.id} style={{ borderTop: "1px solid hsl(var(--border))" }}>
                    <td className="px-4 py-3 font-medium">{m.students?.profile?.name ?? "—"}</td>
                    <td className="px-4 py-3">{m.students?.classes?.name ?? "—"}</td>
                    <td className="px-4 py-3">{m.students?.sections?.name ?? "—"}</td>
                    <td className="px-4 py-3">{m.subject}</td>
                    <td className="px-4 py-3 capitalize">{m.exam_type.replace("_", " ")}</td>
                    <td className="px-4 py-3">{m.term}</td>
                    <td className="px-4 py-3 font-mono">{m.marks_obtained}/{m.total_marks}</td>
                    <td className="px-4 py-3 font-bold" style={{ color }}>{grade}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
