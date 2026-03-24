import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/store/authStore";

export default function StudentMarks() {
  const { profile } = useAuthStore();

  const { data: student } = useQuery({
    queryKey: ["my-student", profile?.user_id],
    queryFn: async () => {
      const { data } = await supabase.from("students").select("id").eq("user_id", profile!.user_id).single();
      return data;
    },
    enabled: !!profile?.user_id,
  });

  const { data: marks, isLoading } = useQuery({
    queryKey: ["my-marks", student?.id],
    queryFn: async () => {
      const { data } = await supabase.from("marks").select("*").eq("student_id", student!.id).order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!student?.id,
  });

  const getGrade = (o: number, t: number) => {
    const p = (o / t) * 100;
    if (p >= 90) return { g: "A+", c: "hsl(var(--success))" };
    if (p >= 80) return { g: "A", c: "hsl(var(--success))" };
    if (p >= 70) return { g: "B", c: "hsl(var(--info))" };
    if (p >= 60) return { g: "C", c: "hsl(var(--warning))" };
    if (p >= 40) return { g: "D", c: "hsl(38 80% 40%)" };
    return { g: "F", c: "hsl(var(--destructive))" };
  };

  return (
    <div className="space-y-6">
      <h1 className="page-title">My Results</h1>
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "hsl(var(--border))" }}>
        <table className="w-full text-sm">
          <thead style={{ background: "hsl(var(--muted))" }}>
            <tr>
              {["Subject", "Exam Type", "Term", "Marks", "Grade"].map(h => <th key={h} className="px-4 py-3 text-left font-semibold" style={{ color: "hsl(var(--muted-foreground))" }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={5} className="text-center py-8" style={{ color: "hsl(var(--muted-foreground))" }}>Loading...</td></tr>
              : marks?.length === 0 ? <tr><td colSpan={5} className="text-center py-8" style={{ color: "hsl(var(--muted-foreground))" }}>No marks yet</td></tr>
              : marks?.map(m => {
                const { g, c } = getGrade(Number(m.marks_obtained), Number(m.total_marks));
                return (
                  <tr key={m.id} style={{ borderTop: "1px solid hsl(var(--border))" }}>
                    <td className="px-4 py-3 font-medium">{m.subject}</td>
                    <td className="px-4 py-3 capitalize">{m.exam_type.replace("_", " ")}</td>
                    <td className="px-4 py-3">{m.term}</td>
                    <td className="px-4 py-3 font-mono">{m.marks_obtained}/{m.total_marks}</td>
                    <td className="px-4 py-3 font-bold" style={{ color: c }}>{g}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
