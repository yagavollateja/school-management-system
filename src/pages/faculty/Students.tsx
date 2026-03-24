import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/store/authStore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function FacultyStudents() {
  const { profile } = useAuthStore();
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [search, setSearch] = useState("");

  const { data: teacher } = useQuery({
    queryKey: ["my-teacher", profile?.user_id],
    queryFn: async () => {
      const { data } = await supabase.from("teachers").select("*, teacher_assignments(*, classes(name), sections(name))")
        .eq("user_id", profile!.user_id).single();
      return data;
    },
    enabled: !!profile?.user_id,
  });

  const assignments = (teacher as any)?.teacher_assignments ?? [];
  const uniqueSections = [...new Map(assignments.map((a: any) => [a.section_id, a])).values()];

  const { data: students, isLoading } = useQuery({
    queryKey: ["faculty-students-detail", selectedSection],
    queryFn: async () => {
      const { data } = await supabase
        .from("students")
        .select("*, profiles!students_user_id_fkey(name, email, phone), classes(name), sections(name)")
        .eq("section_id", selectedSection)
        .order("roll_number");
      return data ?? [];
    },
    enabled: !!selectedSection,
  });

  const filtered = students?.filter(s => (s as any).profiles?.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">My Students</h1>
        <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>View students in your assigned sections</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div>
          <Label className="text-xs mb-1 block">Section</Label>
          <Select value={selectedSection} onValueChange={setSelectedSection}>
            <SelectTrigger className="w-64"><SelectValue placeholder="Select section" /></SelectTrigger>
            <SelectContent>
              {uniqueSections.map((a: any) => (
                <SelectItem key={a.section_id} value={a.section_id}>{a.classes?.name} — Section {a.sections?.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs mb-1 block">Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "hsl(var(--muted-foreground))" }} />
            <Input className="pl-9 w-64" placeholder="Search by name..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "hsl(var(--border))" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ background: "hsl(var(--muted))" }}>
              <tr>
                {["Roll", "Name", "Email", "Phone", "Class", "Section", "Parent"].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold" style={{ color: "hsl(var(--muted-foreground))" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!selectedSection ? (
                <tr><td colSpan={7} className="text-center py-8" style={{ color: "hsl(var(--muted-foreground))" }}>Select a section to view students</td></tr>
              ) : isLoading ? (
                <tr><td colSpan={7} className="text-center py-8" style={{ color: "hsl(var(--muted-foreground))" }}>Loading...</td></tr>
              ) : filtered?.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8" style={{ color: "hsl(var(--muted-foreground))" }}>No students found</td></tr>
              ) : filtered?.map((s: any) => (
                <tr key={s.id} style={{ borderTop: "1px solid hsl(var(--border))" }}>
                  <td className="px-4 py-3 font-mono text-xs">{s.roll_number}</td>
                  <td className="px-4 py-3 font-medium">{s.profiles?.name ?? "—"}</td>
                  <td className="px-4 py-3" style={{ color: "hsl(var(--muted-foreground))" }}>{s.profiles?.email ?? "—"}</td>
                  <td className="px-4 py-3" style={{ color: "hsl(var(--muted-foreground))" }}>{s.profiles?.phone ?? "—"}</td>
                  <td className="px-4 py-3">{s.classes?.name ?? "—"}</td>
                  <td className="px-4 py-3">{s.sections?.name ?? "—"}</td>
                  <td className="px-4 py-3" style={{ color: "hsl(var(--muted-foreground))" }}>{s.parent_name ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
