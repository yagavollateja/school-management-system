import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, UserPlus, BookOpen, Trash2, Search, Edit } from "lucide-react";

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

const FALLBACK_SUBJECTS = ["Mathematics", "English", "Hindi", "Science", "Social Studies", "Computer", "Art", "Physical Education", "EVS", "GK"];

export default function AdminTeachers() {
  const qc = useQueryClient();
  const [openCreate, setOpenCreate] = useState(false);
  const [openAssign, setOpenAssign] = useState(false);
  const [search, setSearch] = useState("");
  const [editingTeacher, setEditingTeacher] = useState<any>(null);
  const [deletingTeacher, setDeletingTeacher] = useState<any>(null);

  const createForm = useForm<TeacherForm>({ resolver: zodResolver(teacherSchema) });
  const assignForm = useForm<AssignForm>({ 
    resolver: zodResolver(assignSchema),
    defaultValues: {
      teacher_id: "",
      class_id: "",
      section_id: "",
      subject: "",
    },
  });
  const selectedClassAssign = assignForm.watch("class_id");

  const { data: teachers, isLoading } = useQuery({
    queryKey: ["teachers-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("teachers")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (!data) return [];
      
      // Fetch profiles and assignments separately
      const userIds = data.map(t => t.user_id);
      const [profilesRes, assignmentsRes] = await Promise.all([
        supabase.from("profiles").select("user_id, name, email, phone").in("user_id", userIds),
        supabase.from("teacher_assignments").select("*, classes(name), sections(name)").in("teacher_id", data.map(t => t.id))
      ]);
      
      const profileMap = new Map(profilesRes.data?.map(p => [p.user_id, p]) ?? []);
      const assignmentsMap = new Map<string, any[]>();
      assignmentsRes.data?.forEach(a => {
        const list = assignmentsMap.get(a.teacher_id) ?? [];
        list.push(a);
        assignmentsMap.set(a.teacher_id, list);
      });
      
      return data.map(t => ({
        ...t,
        profile: profileMap.get(t.user_id) ?? null,
        teacher_assignments: assignmentsMap.get(t.id) ?? []
      }));
    },
  });

  const { data: classes } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const { data } = await supabase.from("classes").select("*").order("order_index");
      return data ?? [];
    },
  });

  const { data: subjectList } = useQuery({
    queryKey: ["subjects-list"],
    queryFn: async () => {
      const { data } = await supabase.from("subjects").select("name").order("order_index");
      return data?.map(s => s.name) ?? [];
    },
  });

  const availableSubjects = subjectList && subjectList.length > 0 ? subjectList : FALLBACK_SUBJECTS;

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
      const { data: result, error } = await supabase.functions.invoke("admin-create-user", {
        body: { 
          name: data.name, 
          email: data.email, 
          password: data.password, 
          role: "faculty", 
          phone: data.phone,
          qualification: data.qualification,
          experience_years: data.experience_years
        }
      });
      if (error) throw new Error(error.message);
      if (result?.error) throw new Error(result.error);
    },
    onSuccess: () => { toast.success("Teacher created!"); qc.invalidateQueries({ queryKey: ["teachers-list"] }); setOpenCreate(false); createForm.reset(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const assignTeacher = useMutation({
    mutationFn: async (data: AssignForm) => {
      const { error } = await supabase.from("teacher_assignments").insert({
        teacher_id: data.teacher_id,
        class_id: data.class_id,
        section_id: data.section_id,
        subject: data.subject,
      });
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

  const deleteTeacher = useMutation({
    mutationFn: async (teacher: any) => {
      // Delete teacher record first
      const { error } = await supabase.from("teachers").delete().eq("id", teacher.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Teacher deleted!");
      qc.invalidateQueries({ queryKey: ["teachers-list"] });
      setDeletingTeacher(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateTeacher = useMutation({
    mutationFn: async (data: { teacherId: string; name: string; phone: string; qualification: string; experience_years: number }) => {
      // Update profile
      const { data: teacher } = await supabase.from("teachers").select("user_id").eq("id", data.teacherId).single();
      if (teacher) {
        await supabase.from("profiles").update({ name: data.name, phone: data.phone ?? null }).eq("user_id", teacher.user_id);
      }
      // Update teacher record
      const { error } = await supabase.from("teachers").update({
        qualification: data.qualification ?? null,
        experience_years: data.experience_years ?? 0,
      }).eq("id", data.teacherId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Teacher updated!");
      qc.invalidateQueries({ queryKey: ["teachers-list"] });
      setEditingTeacher(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = teachers?.filter(t => t.profile?.name?.toLowerCase().includes(search.toLowerCase()));

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
              <DialogDescription>Assign a teacher to a specific class and section with a subject.</DialogDescription>
              <form onSubmit={assignForm.handleSubmit(d => assignTeacher.mutate(d))} className="space-y-4">
                <div>
                  <Label>Teacher</Label>
                  <Controller name="teacher_id" control={assignForm.control} render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                      <SelectContent>{teachers?.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.profile?.name}</SelectItem>)}</SelectContent>
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
                      <SelectContent>{availableSubjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
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
              <DialogDescription>Enter the teacher's details to create a new account.</DialogDescription>
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
                  {t.profile?.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold truncate">{t.profile?.name}</p>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingTeacher(t)}>
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-red-500" onClick={() => setDeletingTeacher(t)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs truncate" style={{ color: "hsl(var(--muted-foreground))" }}>{t.profile?.email}</p>
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

      {/* Edit Teacher Dialog */}
      <Dialog open={!!editingTeacher} onOpenChange={(open) => !open && setEditingTeacher(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Teacher</DialogTitle></DialogHeader>
          <DialogDescription>Update teacher details.</DialogDescription>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            updateTeacher.mutate({
              teacherId: editingTeacher.id,
              name: formData.get("name") as string,
              phone: formData.get("phone") as string,
              qualification: formData.get("qualification") as string,
              experience_years: parseInt(formData.get("experience_years") as string) || 0,
            });
          }} className="space-y-4">
            <div>
              <Label>Full Name</Label>
              <Input name="name" defaultValue={editingTeacher?.profile?.name} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input name="phone" defaultValue={editingTeacher?.profile?.phone} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Qualification</Label>
                <Input name="qualification" defaultValue={editingTeacher?.qualification} />
              </div>
              <div>
                <Label>Experience (years)</Label>
                <Input name="experience_years" type="number" defaultValue={editingTeacher?.experience_years} />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={updateTeacher.isPending}>Save Changes</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Teacher Confirmation Dialog */}
      <Dialog open={!!deletingTeacher} onOpenChange={(open) => !open && setDeletingTeacher(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Teacher</DialogTitle></DialogHeader>
          <DialogDescription>Are you sure you want to delete {deletingTeacher?.profile?.name}? This will remove their teacher record but not their login account.</DialogDescription>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setDeletingTeacher(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteTeacher.mutate(deletingTeacher)} disabled={deleteTeacher.isPending}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
