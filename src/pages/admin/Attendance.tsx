import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";

export default function AdminAttendance() {
  const [filterClass, setFilterClass] = useState("all");
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split("T")[0]);

  const { data: classes } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const { data } = await supabase.from("classes").select("*").order("order_index");
      return data ?? [];
    },
  });

  const { data: records, isLoading } = useQuery({
    queryKey: ["admin-attendance", filterClass, filterDate],
    queryFn: async () => {
      let q = supabase
        .from("attendance")
        .select("*, student_id")
        .eq("date", filterDate);
      const { data } = await q.order("created_at", { ascending: false });
      if (!data) return [];
      
      // Fetch student and related data
      const studentIds = [...new Set(data.map(r => r.student_id))];
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
      
      let filtered = data.map(r => {
        const student = studentMap.get(r.student_id);
        const profile = student ? profileMap.get(student.user_id) : null;
        const cls = student ? classMap.get(student.class_id) : null;
        const section = student ? sectionMap.get(student.section_id) : null;
        
        return {
          ...r,
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
        filtered = filtered.filter(r => r.students?.class_id === filterClass);
      }
      
      return filtered;
    },
  });

  const summary = {
    present: records?.filter(r => r.status === "present").length ?? 0,
    absent: records?.filter(r => r.status === "absent").length ?? 0,
    late: records?.filter(r => r.status === "late").length ?? 0,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Attendance Overview</h1>
        <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>View attendance records across all classes</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div>
          <Label className="text-xs mb-1 block">Date</Label>
          <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
            className="h-9 px-3 rounded-md border text-sm" style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--card))", color: "hsl(var(--foreground))" }} />
        </div>
        <div>
          <Label className="text-xs mb-1 block">Class</Label>
          <Select value={filterClass} onValueChange={setFilterClass}>
            <SelectTrigger className="w-44"><SelectValue placeholder="All Classes" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classes?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card text-center">
          <div className="text-2xl font-bold" style={{ color: "hsl(var(--success))" }}>{summary.present}</div>
          <div className="text-xs mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>Present</div>
        </div>
        <div className="stat-card text-center">
          <div className="text-2xl font-bold" style={{ color: "hsl(var(--destructive))" }}>{summary.absent}</div>
          <div className="text-xs mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>Absent</div>
        </div>
        <div className="stat-card text-center">
          <div className="text-2xl font-bold" style={{ color: "hsl(var(--warning))" }}>{summary.late}</div>
          <div className="text-xs mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>Late</div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "hsl(var(--border))" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ background: "hsl(var(--muted))" }}>
              <tr>
                {["Student", "Class", "Section", "Date", "Status"].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold" style={{ color: "hsl(var(--muted-foreground))" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="text-center py-8" style={{ color: "hsl(var(--muted-foreground))" }}>Loading...</td></tr>
              ) : records?.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8" style={{ color: "hsl(var(--muted-foreground))" }}>No records for this date</td></tr>
              ) : records?.map((r: any, i) => (
                <tr key={r.id} style={{ borderTop: "1px solid hsl(var(--border))" }}>
                  <td className="px-4 py-3 font-medium">{r.students?.profiles?.name ?? "—"}</td>
                  <td className="px-4 py-3">{r.students?.classes?.name ?? "—"}</td>
                  <td className="px-4 py-3">{r.students?.sections?.name ?? "—"}</td>
                  <td className="px-4 py-3" style={{ color: "hsl(var(--muted-foreground))" }}>{r.date}</td>
                  <td className="px-4 py-3">
                    <span className={
                      r.status === "present" ? "badge-success" :
                      r.status === "absent" ? "badge-danger" :
                      r.status === "late" ? "badge-warning" : "badge-info"
                    }>
                      {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
