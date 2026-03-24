import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Search, UserPlus, BookOpen, Trash2 } from "lucide-react";

const teacherSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
  qualification: z.string().optional(),
  experience_years: z.coerce.number().min(0).optional(),
});

const assignSchema = z.object({
  teacher_id: z.string().uuid(),
  class_id: z.string().uuid(),
  section_id: z.string().uuid(),
  subject: z.string().min(1),
});

type TeacherForm = z.infer<typeof teacherSchema>;
type AssignForm = z.infer<typeof assignSchema>;

const SUBJECTS = ["Mathematics", "English", "Hindi", "Science", "Social Studies", "Computer", "Art", "Physical Education", "EVS", "GK"];

export default function AdminTeachers() {
  const qc = useQueryClient();
  const [openCreate, setOpenCreate] = useState(false);
  const [openAssign, setOpenAssign] = useState(false);
  const [search, setSearch] = useState("");

  const createForm = useForm<TeacherForm>({ resolver: zodResolver(teacherSchema) });
  const assignForm = useForm<AssignForm>({ resolver: zodResolver(assignSchema) });
  const selectedClassAssign = assignForm.watch("class_id");

  const { data: teachers, isLoading } = useQuery({
    queryKey: ["teachers-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("teachers")
        .select(`*, profiles!teachers_user_id_fkey(name, email, phone), teacher_assignments(*, classes(name), sections(name))`)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: classes } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const { data } = await supabase.from("classes").select("*").order("order_index");
      return data ?? [];
    },
  });

  const { data: sections } = useQuery({
    queryKey: ["sections", selectedClassAssign],
    queryFn: async () => {
      if (!selectedClassAssign) return [];
      const { data } = await supabase.from("sections").select("*").eq("class_id", selectedClassAssign).order("name");
      return data ?? [];
    },
    enabled: !!selectedClassAssign,
  });

  const createTeacher = useMutation({
    mutationFn: async (data: TeacherForm) => {
      const { data: session } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.session?.access_token}` },
        body: JSON.stringify({ name: data.name, email: data.email, password: data.password, role: "faculty", phone: data.phone }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      const { error } = await supabase.from("teachers").insert({
        user_id: result.user_id,
        qualification: data.qualification ?? null,
        experience_years: data.experience_years ?? 0,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Teacher created!"); qc.invalidateQueries({ queryKey: ["teachers-list"] }); setOpenCreate(false); createForm.reset(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const assignTeacher = useMutation({
    mutationFn: async (data: AssignForm) => {
      const { error } = await supabase.from("teacher_assignments").insert(data);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Assignment saved!"); qc.invalidateQueries({ queryKey: ["teachers-list"] }); setOpenAssign(false); assignForm.reset(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteAssignment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("teacher_assignments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teachers-list"] }),
  });

  const filtered = teachers?.filter(t => (t as any).profiles?.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Faculty Management</h1>
          <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>Manage teachers and their class assignments</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={openAssign} onOpenChange={setOpenAssign}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2"><BookOpen className="w-4 h-4" /> Assign Subject</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Assign Teacher to Class</DialogTitle></DialogHeader>
              <form onSubmit={assignForm.handleSubmit(d => assignTeacher.mutate(d))} className="space-y-4">
                <div>
                  <Label>Teacher</Label>
                  <Controller name="teacher_id" control={assignForm.control} render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                      <SelectContent>{teachers?.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.profiles?.name}</SelectItem>)}</SelectContent>
                    </Select>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Class</Label>
                    <Controller name="class_id" control={assignForm.control} render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger>
                        <SelectContent>{classes?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    )} />
                  </div>
                  <div>
                    <Label>Section</Label>
                    <Controller name="section_id" control={assignForm.control} render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value} disabled={!selectedClassAssign}>
                        <SelectTrigger><SelectValue placeholder="Section" /></SelectTrigger>
                        <SelectContent>{sections?.map(s => <SelectItem key={s.id} value={s.id}>Section {s.name}</SelectItem>)}</SelectContent>
                      </Select>
                    )} />
                  </div>
                </div>
                <div>
                  <Label>Subject</Label>
                  <Controller name="subject" control={assignForm.control} render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                      <SelectContent>{SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  )} />
                </div>
                <Button type="submit" className="w-full" disabled={assignTeacher.isPending}>Save Assignment</Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild>
              <Button className="gap-2"><UserPlus className="w-4 h-4" /> Add Teacher</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add New Teacher</DialogTitle></DialogHeader>
              <form onSubmit={createForm.handleSubmit(d => createTeacher.mutate(d))} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Full Name *</Label><Input {...createForm.register("name")} placeholder="Teacher name" /></div>
                  <div><Label>Email *</Label><Input {...createForm.register("email")} type="email" /></div>
                  <div><Label>Password *</Label><Input {...createForm.register("password")} type="password" placeholder="Min 6 chars" /></div>
                  <div><Label>Phone</Label><Input {...createForm.register("phone")} /></div>
                  <div><Label>Qualification</Label><Input {...createForm.register("qualification")} placeholder="e.g. B.Ed, M.Sc" /></div>
                  <div><Label>Experience (years)</Label><Input {...createForm.register("experience_years")} type="number" /></div>
                </div>
                <Button type="submit" className="w-full" disabled={createTeacher.isPending}>{createTeacher.isPending ? "Creating..." : "Create Teacher"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "hsl(var(--muted-foreground))" }} />
        <Input className="pl-9" placeholder="Search teachers..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading ? <p className="col-span-3 text-center py-8" style={{ color: "hsl(var(--muted-foreground))" }}>Loading...</p>
          : filtered?.length === 0 ? <p className="col-span-3 text-center py-8" style={{ color: "hsl(var(--muted-foreground))" }}>No teachers found</p>
          : filtered?.map((t: any) => (
            <div key={t.id} className="stat-card space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ background: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))" }}>
                  {t.profiles?.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{t.profiles?.name}</p>
                  <p className="text-xs truncate" style={{ color: "hsl(var(--muted-foreground))" }}>{t.profiles?.email}</p>
                  {t.qualification && <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{t.qualification} · {t.experience_years}yr exp</p>}
                </div>
              </div>
              {t.teacher_assignments?.length > 0 && (
                <div>
                  <p className="text-xs font-medium mb-2" style={{ color: "hsl(var(--muted-foreground))" }}>Assignments:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {t.teacher_assignments.map((a: any) => (
                      <div key={a.id} className="flex items-center gap-1 px-2 py-1 rounded-full text-xs" style={{ background: "hsl(var(--primary) / 0.08)", color: "hsl(var(--primary))" }}>
                        {a.classes?.name} {a.sections?.name} · {a.subject}
                        <button onClick={() => deleteAssignment.mutate(a.id)} className="ml-0.5 hover:opacity-70"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
