import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Edit2 } from "lucide-react";

const markSchema = z.object({
  student_id: z.string().uuid(),
  subject: z.string().min(1),
  exam_type: z.string(),
  marks_obtained: z.coerce.number().min(0),
  total_marks: z.coerce.number().min(1),
  term: z.string(),
  academic_year: z.string(),
  remarks: z.string().optional(),
});

type MarkForm = z.infer<typeof markSchema>;

const EXAM_TYPES = ["unit_test", "midterm", "final", "assignment", "practical"];
const TERMS = ["Term1", "Term2", "Term3"];
const SUBJECTS = ["Mathematics", "English", "Hindi", "Science", "Social Studies", "Computer", "Art", "Physical Education", "EVS", "GK"];

export default function FacultyMarks() {
  const { profile } = useAuthStore();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string>("");

  const { register, handleSubmit, control, reset, setValue } = useForm<MarkForm>({
    defaultValues: { exam_type: "unit_test", term: "Term1", total_marks: 100, academic_year: new Date().getFullYear().toString() },
  });

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

  const { data: students } = useQuery({
    queryKey: ["faculty-students", selectedSection],
    queryFn: async () => {
      if (!selectedSection) return [];
      
      const { data } = await supabase.from("students")
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

  const { data: marks } = useQuery({
    queryKey: ["faculty-marks", selectedSection],
    queryFn: async () => {
      if (!students?.length) return [];
      
      const { data } = await supabase.from("marks")
        .select("id, student_id, subject, exam_type, marks_obtained, total_marks, term, created_at")
        .in("student_id", students.map(s => s.id))
        .order("created_at", { ascending: false });
      
      if (!data) return [];
      
      const studentMap = new Map(students.map(s => [s.id, s]));
      
      return data.map(m => ({
        ...m,
        students: studentMap.get(m.student_id) ?? null,
      }));
    },
    enabled: !!students?.length,
  });

  const addMark = useMutation({
    mutationFn: async (data: MarkForm) => {
      if (!teacher?.id) throw new Error("Teacher not found");
      const { error } = await supabase.from("marks").insert({
        student_id: data.student_id,
        subject: data.subject,
        exam_type: data.exam_type,
        marks_obtained: data.marks_obtained,
        total_marks: data.total_marks,
        term: data.term,
        academic_year: data.academic_year,
        remarks: data.remarks ?? null,
        uploaded_by: teacher.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Marks saved!"); qc.invalidateQueries({ queryKey: ["faculty-marks"] }); setOpen(false); reset(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const getGrade = (obtained: number, total: number) => {
    const pct = (obtained / total) * 100;
    if (pct >= 90) return "A+"; if (pct >= 80) return "A"; if (pct >= 70) return "B";
    if (pct >= 60) return "C"; if (pct >= 40) return "D"; return "F";
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Marks & Results</h1>
          <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>Upload and manage student marks</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" disabled={!selectedSection}><Plus className="w-4 h-4" /> Add Marks</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Upload Marks</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(d => addMark.mutate(d))} className="space-y-4">
              <div>
                <Label>Student *</Label>
                <Controller name="student_id" control={control} render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                    <SelectContent>{students?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.roll_number}. {s.profile?.name}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Subject *</Label>
                  <Controller name="subject" control={control} render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
                      <SelectContent>{SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  )} />
                </div>
                <div>
                  <Label>Exam Type *</Label>
                  <Controller name="exam_type" control={control} render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{EXAM_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace("_", " ")}</SelectItem>)}</SelectContent>
                    </Select>
                  )} />
                </div>
                <div><Label>Marks Obtained *</Label><Input {...register("marks_obtained")} type="number" /></div>
                <div><Label>Total Marks *</Label><Input {...register("total_marks")} type="number" /></div>
                <div>
                  <Label>Term *</Label>
                  <Controller name="term" control={control} render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{TERMS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  )} />
                </div>
                <div><Label>Academic Year</Label><Input {...register("academic_year")} /></div>
              </div>
              <div><Label>Remarks</Label><Input {...register("remarks")} placeholder="Optional" /></div>
              <Button type="submit" className="w-full" disabled={addMark.isPending}>Save Marks</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div>
        <Label className="text-xs mb-1 block">Filter by Section</Label>
        <Select value={selectedSection} onValueChange={setSelectedSection}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Select section" /></SelectTrigger>
          <SelectContent>
            {uniqueSections.map((a: any) => (
              <SelectItem key={a.sectionId} value={a.sectionId}>{a.className} — Section {a.sectionName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "hsl(var(--border))" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ background: "hsl(var(--muted))" }}>
              <tr>
                {["Student", "Subject", "Exam", "Term", "Marks", "Grade"].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold" style={{ color: "hsl(var(--muted-foreground))" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!selectedSection ? (
                <tr><td colSpan={6} className="text-center py-8" style={{ color: "hsl(var(--muted-foreground))" }}>Select a section to view marks</td></tr>
              ) : marks?.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8" style={{ color: "hsl(var(--muted-foreground))" }}>No marks uploaded yet</td></tr>
              ) : marks?.map((m: any) => (
                <tr key={m.id} style={{ borderTop: "1px solid hsl(var(--border))" }}>
                  <td className="px-4 py-3 font-medium">{m.students?.profile?.name ?? "—"}</td>
                  <td className="px-4 py-3">{m.subject}</td>
                  <td className="px-4 py-3 capitalize">{m.exam_type?.replace("_", " ")}</td>
                  <td className="px-4 py-3">{m.term}</td>
                  <td className="px-4 py-3 font-mono">{m.marks_obtained}/{m.total_marks}</td>
                  <td className="px-4 py-3 font-bold">{getGrade(Number(m.marks_obtained), Number(m.total_marks))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
