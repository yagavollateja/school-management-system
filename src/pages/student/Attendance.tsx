import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/store/authStore";

export default function StudentAttendance() {
  const { profile } = useAuthStore();

  const { data: student } = useQuery({
    queryKey: ["my-student", profile?.user_id],
    queryFn: async () => {
      const { data } = await supabase.from("students").select("id").eq("user_id", profile!.user_id).single();
      return data;
    },
    enabled: !!profile?.user_id,
  });

  const { data: records, isLoading } = useQuery({
    queryKey: ["my-attendance", student?.id],
    queryFn: async () => {
      const { data } = await supabase.from("attendance").select("*").eq("student_id", student!.id).order("date", { ascending: false });
      return data ?? [];
    },
    enabled: !!student?.id,
  });

  const summary = { total: records?.length ?? 0, present: records?.filter(r => r.status === "present").length ?? 0 };

  return (
    <div className="space-y-6">
      <h1 className="page-title">My Attendance</h1>
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Days", value: summary.total, color: "hsl(var(--primary))" },
          { label: "Present", value: summary.present, color: "hsl(var(--success))" },
          { label: "Absent", value: summary.total - summary.present, color: "hsl(var(--destructive))" },
        ].map(s => (
          <div key={s.label} className="stat-card text-center">
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>{s.label}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "hsl(var(--border))" }}>
        <table className="w-full text-sm">
          <thead style={{ background: "hsl(var(--muted))" }}>
            <tr>
              {["Date", "Status", "Remarks"].map(h => <th key={h} className="px-4 py-3 text-left font-semibold" style={{ color: "hsl(var(--muted-foreground))" }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={3} className="text-center py-8" style={{ color: "hsl(var(--muted-foreground))" }}>Loading...</td></tr>
              : records?.length === 0 ? <tr><td colSpan={3} className="text-center py-8" style={{ color: "hsl(var(--muted-foreground))" }}>No records yet</td></tr>
              : records?.map(r => (
                <tr key={r.id} style={{ borderTop: "1px solid hsl(var(--border))" }}>
                  <td className="px-4 py-3 font-mono text-xs">{r.date}</td>
                  <td className="px-4 py-3">
                    <span className={r.status === "present" ? "badge-success" : r.status === "absent" ? "badge-danger" : r.status === "late" ? "badge-warning" : "badge-info"}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3" style={{ color: "hsl(var(--muted-foreground))" }}>{r.remarks ?? "—"}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
