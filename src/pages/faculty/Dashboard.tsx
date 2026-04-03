import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/store/authStore";
import { Users, ClipboardCheck, BookOpen, Calendar } from "lucide-react";

export default function FacultyDashboard() {
  const { profile } = useAuthStore();

  const { data: teacherData } = useQuery({
    queryKey: ["faculty-teacher", profile?.user_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("teachers")
        .select("id, user_id")
        .eq("user_id", profile!.user_id)
        .single();
      return data;
    },
    enabled: !!profile?.user_id,
  });

  const { data: assignments } = useQuery({
    queryKey: ["teacher-assignments", teacherData?.id],
    queryFn: async () => {
      if (!teacherData?.id) return [];
      const { data } = await supabase
        .from("teacher_assignments")
        .select("id, section_id, subject, class_id")
        .eq("teacher_id", teacherData.id);
      return data ?? [];
    },
    enabled: !!teacherData?.id,
  });

  const { data: studentCount } = useQuery({
    queryKey: ["faculty-student-count", teacherData?.id],
    queryFn: async () => {
      if (!assignments?.length) return 0;
      const sectionIds = [...new Set(assignments.map((a: any) => a.section_id))];
      const { count } = await supabase
        .from("students")
        .select("id", { count: "exact", head: true })
        .in("section_id", sectionIds);
      return count ?? 0;
    },
    enabled: !!assignments?.length,
  });

  const { data: classData } = useQuery({
    queryKey: ["teacher-classes", assignments],
    queryFn: async () => {
      if (!assignments?.length) return [];
      const classIds = [...new Set(assignments.map((a: any) => a.class_id))];
      const { data } = await supabase.from("classes").select("id, name").in("id", classIds);
      const classMap = new Map(data?.map(c => [c.id, c]) ?? []);
      return classMap;
    },
    enabled: !!assignments?.length,
  });

  const { data: sectionData } = useQuery({
    queryKey: ["teacher-sections", assignments],
    queryFn: async () => {
      if (!assignments?.length) return [];
      const sectionIds = [...new Set(assignments.map((a: any) => a.section_id))];
      const { data } = await supabase.from("sections").select("id, name").in("id", sectionIds);
      const sectionMap = new Map(data?.map(s => [s.id, s]) ?? []);
      return sectionMap;
    },
    enabled: !!assignments?.length,
  });

  const enrichedAssignments = assignments?.map((a: any) => ({
    ...a,
    classes: classData?.get(a.class_id) ?? null,
    sections: sectionData?.get(a.section_id) ?? null,
  })) ?? [];

  const { data: todayAttendance } = useQuery({
    queryKey: ["faculty-today-attendance", teacherData?.id],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("attendance")
        .select("status")
        .eq("date", today)
        .eq("marked_by", teacherData!.id);
      return data ?? [];
    },
    enabled: !!teacherData?.id,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Faculty Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
          Welcome, {profile?.name}. Your assigned classes overview.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "My Students", value: studentCount ?? 0, icon: Users, color: "hsl(199 89% 48%)" },
          { label: "Assignments", value: enrichedAssignments.length, icon: BookOpen, color: "hsl(var(--success))" },
          { label: "Marked Today", value: todayAttendance?.length ?? 0, icon: ClipboardCheck, color: "hsl(var(--accent))" },
          { label: "Present Today", value: todayAttendance?.filter((a: any) => a.status === "present").length ?? 0, icon: Calendar, color: "hsl(var(--primary))" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>{label}</p>
                <p className="text-3xl font-bold mt-1">{value}</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="stat-card">
        <h3 className="font-semibold mb-4">My Assignments</h3>
        {enrichedAssignments.length === 0 ? (
          <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>No assignments yet. Contact admin to assign classes.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {enrichedAssignments.map((a: any) => (
              <div key={a.id} className="p-3 rounded-lg" style={{ background: "hsl(var(--muted))" }}>
                <p className="font-semibold text-sm">{a.subject}</p>
                <p className="text-xs mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
                  {a.classes?.name ?? "—"} — Section {a.sections?.name ?? "—"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
