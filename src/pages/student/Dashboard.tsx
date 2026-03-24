import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/store/authStore";
import { GraduationCap, ClipboardCheck, BookOpen, DollarSign } from "lucide-react";

export default function StudentDashboard() {
  const { profile } = useAuthStore();

  const { data: student } = useQuery({
    queryKey: ["my-student", profile?.user_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("students")
        .select("*, classes(name), sections(name)")
        .eq("user_id", profile!.user_id)
        .single();
      return data;
    },
    enabled: !!profile?.user_id,
  });

  const { data: attendanceSummary } = useQuery({
    queryKey: ["student-attendance-summary", student?.id],
    queryFn: async () => {
      const { data } = await supabase.from("attendance").select("status").eq("student_id", student!.id);
      const total = data?.length ?? 0;
      const present = data?.filter(a => a.status === "present").length ?? 0;
      return { total, present, percentage: total ? Math.round((present / total) * 100) : 0 };
    },
    enabled: !!student?.id,
  });

  const { data: marksSummary } = useQuery({
    queryKey: ["student-marks-summary", student?.id],
    queryFn: async () => {
      const { data } = await supabase.from("marks").select("marks_obtained, total_marks").eq("student_id", student!.id);
      if (!data?.length) return { avg: 0, count: 0 };
      const avg = data.reduce((s, m) => s + (Number(m.marks_obtained) / Number(m.total_marks)) * 100, 0) / data.length;
      return { avg: Math.round(avg), count: data.length };
    },
    enabled: !!student?.id,
  });

  const { data: feesSummary } = useQuery({
    queryKey: ["student-fees-summary", student?.id],
    queryFn: async () => {
      const { data } = await supabase.from("fees").select("total_fee, paid_amount, due_amount, status").eq("student_id", student!.id);
      const due = data?.reduce((s, f) => s + Number(f.due_amount), 0) ?? 0;
      return { due, hasPending: (data?.some(f => f.status !== "paid")) ?? false };
    },
    enabled: !!student?.id,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Student Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>Welcome back, {profile?.name}!</p>
      </div>

      {/* Profile card */}
      <div className="stat-card flex items-center gap-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold shrink-0"
          style={{ background: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))" }}>
          {profile?.name?.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 className="text-xl font-bold">{profile?.name}</h2>
          <div className="flex flex-wrap gap-3 mt-1">
            {student && <>
              <span className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>Class: <strong style={{ color: "hsl(var(--foreground))" }}>{(student as any).classes?.name}</strong></span>
              <span className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>Section: <strong style={{ color: "hsl(var(--foreground))" }}>{(student as any).sections?.name}</strong></span>
              <span className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>Roll: <strong style={{ color: "hsl(var(--foreground))" }}>{student.roll_number}</strong></span>
            </>}
          </div>
          <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>{profile?.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <ClipboardCheck className="w-5 h-5" style={{ color: "hsl(var(--success))" }} />
            <span className="font-semibold text-sm">Attendance</span>
          </div>
          <p className="text-3xl font-bold" style={{ color: "hsl(var(--success))" }}>{attendanceSummary?.percentage ?? 0}%</p>
          <p className="text-xs mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>{attendanceSummary?.present}/{attendanceSummary?.total} days present</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-5 h-5" style={{ color: "hsl(var(--primary))" }} />
            <span className="font-semibold text-sm">Average Score</span>
          </div>
          <p className="text-3xl font-bold" style={{ color: "hsl(var(--primary))" }}>{marksSummary?.avg ?? 0}%</p>
          <p className="text-xs mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>{marksSummary?.count} tests recorded</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5" style={{ color: feesSummary?.hasPending ? "hsl(var(--destructive))" : "hsl(var(--success))" }} />
            <span className="font-semibold text-sm">Fee Status</span>
          </div>
          <p className="text-3xl font-bold" style={{ color: feesSummary?.hasPending ? "hsl(var(--destructive))" : "hsl(var(--success))" }}>
            {feesSummary?.hasPending ? "Due" : "Clear"}
          </p>
          {feesSummary?.due ? <p className="text-xs mt-1" style={{ color: "hsl(var(--destructive))" }}>₹{feesSummary.due.toLocaleString()} pending</p>
            : <p className="text-xs mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>All fees paid</p>}
        </div>
      </div>
    </div>
  );
}
