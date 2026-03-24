import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/store/authStore";

export default function StudentFees() {
  const { profile } = useAuthStore();

  const { data: student } = useQuery({
    queryKey: ["my-student", profile?.user_id],
    queryFn: async () => {
      const { data } = await supabase.from("students").select("id").eq("user_id", profile!.user_id).single();
      return data;
    },
    enabled: !!profile?.user_id,
  });

  const { data: fees, isLoading } = useQuery({
    queryKey: ["my-fees", student?.id],
    queryFn: async () => {
      const { data } = await supabase.from("fees").select("*").eq("student_id", student!.id).order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!student?.id,
  });

  const totalDue = fees?.reduce((s, f) => s + Number(f.due_amount), 0) ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="page-title">Fee Status</h1>
      <div className="grid grid-cols-2 gap-4">
        <div className="stat-card">
          <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Total Due</p>
          <p className="text-2xl font-bold mt-1" style={{ color: totalDue > 0 ? "hsl(var(--destructive))" : "hsl(var(--success))" }}>
            ₹{totalDue.toLocaleString()}
          </p>
        </div>
        <div className="stat-card">
          <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Fee Records</p>
          <p className="text-2xl font-bold mt-1">{fees?.length ?? 0}</p>
        </div>
      </div>
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "hsl(var(--border))" }}>
        <table className="w-full text-sm">
          <thead style={{ background: "hsl(var(--muted))" }}>
            <tr>
              {["Type", "Year", "Total", "Paid", "Due", "Status"].map(h => <th key={h} className="px-4 py-3 text-left font-semibold" style={{ color: "hsl(var(--muted-foreground))" }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={6} className="text-center py-8" style={{ color: "hsl(var(--muted-foreground))" }}>Loading...</td></tr>
              : fees?.length === 0 ? <tr><td colSpan={6} className="text-center py-8" style={{ color: "hsl(var(--muted-foreground))" }}>No fee records</td></tr>
              : fees?.map(f => (
                <tr key={f.id} style={{ borderTop: "1px solid hsl(var(--border))" }}>
                  <td className="px-4 py-3 capitalize">{f.fee_type}</td>
                  <td className="px-4 py-3">{f.academic_year}</td>
                  <td className="px-4 py-3 font-mono">₹{Number(f.total_fee).toLocaleString()}</td>
                  <td className="px-4 py-3 font-mono" style={{ color: "hsl(var(--success))" }}>₹{Number(f.paid_amount).toLocaleString()}</td>
                  <td className="px-4 py-3 font-mono" style={{ color: "hsl(var(--destructive))" }}>₹{Number(f.due_amount).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={f.status === "paid" ? "badge-success" : f.status === "pending" ? "badge-warning" : f.status === "partial" ? "badge-info" : "badge-danger"}>
                      {f.status}
                    </span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
