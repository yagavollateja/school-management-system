import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle, XCircle, Clock, Save } from "lucide-react";

type AttendanceStatus = "present" | "absent" | "late" | "excused";

export default function FacultyAttendance() {
  const { profile } = useAuthStore();
  const qc = useQueryClient();
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStatus>>({});

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
        .select("id, section_id, class_id, classes(name), sections(name)")
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

  const { data: students } = useQuery({
    queryKey: ["faculty-students", selectedSection],
    queryFn: async () => {
      if (!selectedSection) return [];
      
      const { data } = await supabase
        .from("students")
        .select("id, user_id, roll_number")
        .eq("section_id", selectedSection)
        .order("roll_number");
      
      if (!data) return [];
      
      const userIds = data.map(s => s.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name")
        .in("user_id", userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) ?? []);
      
      return data.map(s => ({
        ...s,
        profile: profileMap.get(s.user_id) ?? null,
      }));
    },
    enabled: !!selectedSection,
  });

  const { data: existingAttendance } = useQuery({
    queryKey: ["existing-attendance", selectedSection, date],
    queryFn: async () => {
      if (!students?.length) return [];
      const studentIds = students.map(s => s.id);
      const { data } = await supabase.from("attendance")
        .select("*").eq("date", date).in("student_id", studentIds);
      const map: Record<string, AttendanceStatus> = {};
      data?.forEach(a => { map[a.student_id] = a.status as AttendanceStatus; });
      setAttendanceMap(map);
      return data ?? [];
    },
    enabled: !!students?.length && !!date,
  });

  const saveAttendance = useMutation({
    mutationFn: async () => {
      if (!students?.length || !teacher?.id) return;
      const records = students.map(s => ({
        student_id: s.id,
        date,
        status: attendanceMap[s.id] ?? "absent",
        marked_by: teacher.id,
      }));
      const { error } = await supabase.from("attendance").upsert(records, { onConflict: "student_id,date" });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Attendance saved!"); qc.invalidateQueries({ queryKey: ["existing-attendance"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusConfig = {
    present: { icon: CheckCircle, color: "hsl(var(--success))", bg: "hsl(var(--success) / 0.1)" },
    absent: { icon: XCircle, color: "hsl(var(--destructive))", bg: "hsl(var(--destructive) / 0.1)" },
    late: { icon: Clock, color: "hsl(var(--warning))", bg: "hsl(var(--warning) / 0.1)" },
    excused: { icon: CheckCircle, color: "hsl(var(--info))", bg: "hsl(var(--info) / 0.1)" },
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Mark Attendance</h1>
          <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>Mark daily attendance for your assigned sections</p>
        </div>
        <Button onClick={() => saveAttendance.mutate()} disabled={!selectedSection || !students?.length || saveAttendance.isPending} className="gap-2">
          <Save className="w-4 h-4" /> Save Attendance
        </Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div>
          <Label className="text-xs mb-1 block">Date</Label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="h-9 px-3 rounded-md border text-sm" style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--card))", color: "hsl(var(--foreground))" }} />
        </div>
        <div>
          <Label className="text-xs mb-1 block">Section</Label>
          <Select value={selectedSection} onValueChange={setSelectedSection}>
            <SelectTrigger className="w-64"><SelectValue placeholder="Select section" /></SelectTrigger>
            <SelectContent>
              {uniqueSections.map((a: any) => (
                <SelectItem key={a.sectionId} value={a.sectionId}>
                  {a.className} — Section {a.sectionName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!selectedSection ? (
        <div className="stat-card text-center py-12">
          <p style={{ color: "hsl(var(--muted-foreground))" }}>Select a section to mark attendance</p>
        </div>
      ) : students?.length === 0 ? (
        <div className="stat-card text-center py-12">
          <p style={{ color: "hsl(var(--muted-foreground))" }}>No students in this section</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Quick buttons */}
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => {
              const m: Record<string, AttendanceStatus> = {};
              students?.forEach(s => { m[s.id] = "present"; });
              setAttendanceMap(m);
            }}>Mark All Present</Button>
            <Button size="sm" variant="outline" onClick={() => {
              const m: Record<string, AttendanceStatus> = {};
              students?.forEach(s => { m[s.id] = "absent"; });
              setAttendanceMap(m);
            }}>Mark All Absent</Button>
          </div>

          <div className="rounded-xl border overflow-hidden" style={{ borderColor: "hsl(var(--border))" }}>
            <table className="w-full text-sm">
              <thead style={{ background: "hsl(var(--muted))" }}>
                <tr>
                  {["Roll", "Student Name", "Present", "Absent", "Late", "Excused"].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold" style={{ color: "hsl(var(--muted-foreground))" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students?.map((s: any, i) => {
                  const status = attendanceMap[s.id];
                  return (
                    <tr key={s.id} style={{ borderTop: "1px solid hsl(var(--border))" }}>
                      <td className="px-4 py-3 font-mono text-xs">{s.roll_number}</td>
                      <td className="px-4 py-3 font-medium">{s.profile?.name ?? "—"}</td>
                      {(["present", "absent", "late", "excused"] as AttendanceStatus[]).map(st => (
                        <td key={st} className="px-4 py-3">
                          <button
                            onClick={() => setAttendanceMap(prev => ({ ...prev, [s.id]: st }))}
                            className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                            style={{
                              background: status === st ? statusConfig[st].bg : "transparent",
                              border: `2px solid ${status === st ? statusConfig[st].color : "hsl(var(--border))"}`,
                            }}
                          >
                            {status === st && React.createElement(statusConfig[st].icon, { className: "w-4 h-4", style: { color: statusConfig[st].color } })}
                          </button>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

import React from "react";
