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
      const { data } = await supabase.from("teachers").select("id, user_id")
        .eq("user_id", profile!.user_id).single();
      return data;
    },
    enabled: !!profile?.user_id,
  });

  const { data: assignments } = useQuery({
    queryKey: ["teacher-assignments", teacher?.id],
    queryFn: async () => {
      if (!teacher?.id) return [];
      const { data } = await supabase
        .from("teacher_assignments")
        .select("id, section_id, class_id, subject, classes(name), sections(name)")
        .eq("teacher_id", teacher.id);
      return data ?? [];
    },
    enabled: !!teacher?.id,
  });

  const uniqueSections = assignments?.map((a: any) => ({
    ...a,
    sectionId: a.section_id,
    className: a.classes?.name,
    sectionName: a.sections?.name,
  })) ?? [];

  const { data: students, isLoading } = useQuery({
    queryKey: ["faculty-students-detail", selectedSection],
    queryFn: async () => {
      if (!selectedSection) return [];
      
      const { data } = await supabase
        .from("students")
        .select("id, user_id, roll_number, class_id, section_id, parent_name, parent_phone, address")
        .eq("section_id", selectedSection)
        .order("roll_number");
      
      if (!data || data.length === 0) return [];
      
      const userIds = data.map(s => s.user_id);
      if (userIds.length === 0) return data;
      
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, email, phone")
        .in("user_id", userIds);
      
      const classIds = [...new Set(data.map(s => s.class_id))];
      const [classesRes, sectionsRes] = await Promise.all([
        supabase.from("classes").select("id, name").in("id", classIds),
        supabase.from("sections").select("id, name").in("id", [selectedSection])
      ]);
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) ?? []);
      const classMap = new Map(classesRes.data?.map(c => [c.id, c]) ?? []);
      const sectionMap = new Map(sectionsRes.data?.map(s => [s.id, s]) ?? []);
      
      return data.map(s => ({
        ...s,
        profile: profileMap.get(s.user_id) ?? null,
        classes: classMap.get(s.class_id) ?? null,
        sections: sectionMap.get(s.section_id) ?? null,
      }));
    },
    enabled: !!selectedSection,
  });

  const filtered = students?.filter(s => s.profile?.name?.toLowerCase().includes(search.toLowerCase()));

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
                <SelectItem key={a.sectionId} value={a.sectionId}>{a.className} — Section {a.sectionName}</SelectItem>
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
                  <td className="px-4 py-3 font-medium">{s.profile?.name ?? "—"}</td>
                  <td className="px-4 py-3" style={{ color: "hsl(var(--muted-foreground))" }}>{s.profile?.email ?? "—"}</td>
                  <td className="px-4 py-3" style={{ color: "hsl(var(--muted-foreground))" }}>{s.profile?.phone ?? "—"}</td>
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
