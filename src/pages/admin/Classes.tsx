import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { School, Users } from "lucide-react";

export default function AdminClasses() {
  const { data: classes } = useQuery({
    queryKey: ["classes-with-sections"],
    queryFn: async () => {
      const { data: cls } = await supabase.from("classes").select("*, sections(*)").order("order_index");
      const { data: students } = await supabase.from("students").select("class_id, section_id");
      return cls?.map(c => ({
        ...c,
        studentCount: students?.filter(s => s.class_id === c.id).length ?? 0,
        sections: c.sections?.map((sec: any) => ({
          ...sec,
          studentCount: students?.filter(s => s.section_id === sec.id).length ?? 0,
        })),
      })) ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Classes & Sections</h1>
        <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
          All classes are pre-configured with Sections A, B, C, D
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {classes?.map(cls => (
          <div key={cls.id} className="stat-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "hsl(var(--primary) / 0.1)" }}>
                <School className="w-5 h-5" style={{ color: "hsl(var(--primary))" }} />
              </div>
              <div>
                <h3 className="font-semibold">{cls.name}</h3>
                <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                  {cls.studentCount} total students
                </p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {cls.sections?.map((sec: any) => (
                <div key={sec.id} className="text-center p-2 rounded-lg" style={{ background: "hsl(var(--muted))" }}>
                  <div className="text-lg font-bold" style={{ color: "hsl(var(--primary))" }}>
                    {sec.studentCount}
                  </div>
                  <div className="text-xs font-medium">Sec {sec.name}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
