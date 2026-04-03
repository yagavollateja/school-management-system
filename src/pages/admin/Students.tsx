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
import { Plus, Search, Edit, Trash2, UserPlus } from "lucide-react";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  class_id: z.string().uuid(),
  section_id: z.string().uuid(),
  roll_number: z.coerce.number().min(1),
  parent_name: z.string().optional(),
  parent_phone: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  date_of_birth: z.string().optional(),
});

type StudentForm = z.infer<typeof schema>;

export default function AdminStudents() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("all");
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [deletingStudent, setDeletingStudent] = useState<any>(null);

  const { register, handleSubmit, control, watch, reset, setValue, formState: { errors } } = useForm<StudentForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      class_id: "",
      section_id: "",
    },
  });
  const selectedClass = watch("class_id");

  const { data: classes } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const { data } = await supabase.from("classes").select("*").order("order_index");
      return data ?? [];
    },
  });

  const { data: sections } = useQuery({
    queryKey: ["sections", selectedClass],
    queryFn: async () => {
      if (!selectedClass) return [];
      const { data } = await supabase.from("sections").select("*").eq("class_id", selectedClass).order("name");
      return data ?? [];
    },
    enabled: !!selectedClass,
  });

  const { data: students, isLoading } = useQuery({
    queryKey: ["students-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("students")
        .select("*, classes(name), sections(name)")
        .order("created_at", { ascending: false });
      
      if (!data) return [];
      
      // Fetch profiles separately
      const userIds = data.map(s => s.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, email, phone")
        .in("user_id", userIds);
      
      // Merge profiles into students
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) ?? []);
      return data.map(s => ({
        ...s,
        profile: profileMap.get(s.user_id) ?? null
      }));
    },
  });

  const createStudent = useMutation({
    mutationFn: async (data: StudentForm) => {
      const { data: result, error } = await supabase.functions.invoke("admin-create-user", {
        body: { 
          name: data.name, 
          email: data.email, 
          password: data.password, 
          role: "student", 
          phone: data.phone,
          class_id: data.class_id,
          section_id: data.section_id,
          roll_number: data.roll_number,
          parent_name: data.parent_name,
          parent_phone: data.parent_phone,
          address: data.address,
          date_of_birth: data.date_of_birth
        }
      });
      if (error) throw new Error(error.message);
      if (result?.error) throw new Error(result.error);
    },
    onSuccess: () => {
      toast.success("Student created successfully!");
      qc.invalidateQueries({ queryKey: ["students-list"] });
      setOpen(false);
      reset();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteStudent = useMutation({
    mutationFn: async (student: any) => {
      const { error } = await supabase.from("students").delete().eq("id", student.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Student deleted!");
      qc.invalidateQueries({ queryKey: ["students-list"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = students?.filter(s => {
    const name = s.profile?.name?.toLowerCase() ?? "";
    const cls = filterClass === "all" || s.class_id === filterClass;
    return name.includes(search.toLowerCase()) && cls;
  });

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Students</h1>
          <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>Manage all student records</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><UserPlus className="w-4 h-4" /> Add Student</Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add New Student</DialogTitle></DialogHeader>
            <DialogDescription>Enter the student's details to create a new account.</DialogDescription>
            <form onSubmit={handleSubmit((d) => createStudent.mutate(d))} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Full Name *</Label>
                  <Input {...register("name")} placeholder="Student name" />
                  {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input {...register("email")} type="email" placeholder="student@school.edu" />
                  {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                </div>
                <div>
                  <Label>Password *</Label>
                  <Input {...register("password")} type="password" placeholder="Min 6 chars" />
                  {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input {...register("phone")} placeholder="Phone number" />
                </div>
                <div>
                  <Label>Class *</Label>
                  <Controller name="class_id" control={control} render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                      <SelectContent>{classes?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  )} />
                  {errors.class_id && <p className="text-xs text-destructive">Required</p>}
                </div>
                <div>
                  <Label>Section *</Label>
                  <Controller name="section_id" control={control} render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value} disabled={!selectedClass}>
                      <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
                      <SelectContent>{sections?.map(s => <SelectItem key={s.id} value={s.id}>Section {s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  )} />
                  {errors.section_id && <p className="text-xs text-destructive">Required</p>}
                </div>
                <div>
                  <Label>Roll Number *</Label>
                  <Input {...register("roll_number")} type="number" placeholder="Roll number" />
                  {errors.roll_number && <p className="text-xs text-destructive">Required</p>}
                </div>
                <div>
                  <Label>Date of Birth</Label>
                  <Input {...register("date_of_birth")} type="date" />
                </div>
                <div>
                  <Label>Parent Name</Label>
                  <Input {...register("parent_name")} placeholder="Parent/Guardian name" />
                </div>
                <div>
                  <Label>Parent Phone</Label>
                  <Input {...register("parent_phone")} placeholder="Parent phone" />
                </div>
              </div>
              <div>
                <Label>Address</Label>
                <Input {...register("address")} placeholder="Home address" />
              </div>
              <Button type="submit" className="w-full" disabled={createStudent.isPending}>
                {createStudent.isPending ? "Creating..." : "Create Student"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Student Dialog */}
        <Dialog open={!!editingStudent} onOpenChange={(open) => !open && setEditingStudent(null)}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Edit Student</DialogTitle></DialogHeader>
            <DialogDescription>Update the student's details.</DialogDescription>
            <form onSubmit={handleSubmit(async (data) => {
              if (!editingStudent) return;
              try {
                await supabase.from("profiles").update({ name: data.name, phone: data.phone ?? null }).eq("user_id", editingStudent.user_id);
                await supabase.from("students").update({
                  class_id: data.class_id,
                  section_id: data.section_id,
                  roll_number: data.roll_number,
                  parent_name: data.parent_name ?? null,
                  parent_phone: data.parent_phone ?? null,
                  address: data.address ?? null,
                  date_of_birth: data.date_of_birth ?? null,
                }).eq("id", editingStudent.id);
                toast.success("Student updated!");
                qc.invalidateQueries({ queryKey: ["students-list"] });
                setEditingStudent(null);
              } catch (e: any) {
                toast.error(e.message);
              }
            })} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Full Name *</Label>
                  <Input {...register("name")} placeholder="Student name" />
                </div>
                <div>
                  <Label>Class *</Label>
                  <Controller name="class_id" control={control} render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                      <SelectContent>{classes?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  )} />
                </div>
                <div>
                  <Label>Section *</Label>
                  <Controller name="section_id" control={control} render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value} disabled={!selectedClass}>
                      <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
                      <SelectContent>{sections?.map(s => <SelectItem key={s.id} value={s.id}>Section {s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  )} />
                </div>
                <div>
                  <Label>Roll Number *</Label>
                  <Input {...register("roll_number")} type="number" />
                </div>
                <div>
                  <Label>Date of Birth</Label>
                  <Input {...register("date_of_birth")} type="date" />
                </div>
                <div>
                  <Label>Parent Name</Label>
                  <Input {...register("parent_name")} />
                </div>
                <div>
                  <Label>Parent Phone</Label>
                  <Input {...register("parent_phone")} />
                </div>
              </div>
              <div>
                <Label>Address</Label>
                <Input {...register("address")} />
              </div>
              <Button type="submit" className="w-full">Save Changes</Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deletingStudent} onOpenChange={(open) => !open && setDeletingStudent(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Delete Student</DialogTitle></DialogHeader>
            <DialogDescription>Are you sure you want to delete {deletingStudent?.profile?.name}? This action cannot be undone.</DialogDescription>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setDeletingStudent(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => deleteStudent.mutate(deletingStudent)}>Delete</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "hsl(var(--muted-foreground))" }} />
          <Input className="pl-9" placeholder="Search students..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterClass} onValueChange={setFilterClass}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Classes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {classes?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "hsl(var(--border))" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ background: "hsl(var(--muted))" }}>
              <tr>
                {["Roll", "Name", "Email", "Class", "Section", "Parent", "Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold" style={{ color: "hsl(var(--muted-foreground))" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-8" style={{ color: "hsl(var(--muted-foreground))" }}>Loading...</td></tr>
              ) : filtered?.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8" style={{ color: "hsl(var(--muted-foreground))" }}>No students found</td></tr>
              ) : filtered?.map((s: any, i) => (
                <tr key={s.id} className={i % 2 === 0 ? "" : ""} style={{ borderTop: "1px solid hsl(var(--border))" }}>
                  <td className="px-4 py-3 font-mono text-xs">{s.roll_number}</td>
                  <td className="px-4 py-3 font-medium">{s.profile?.name ?? "—"}</td>
                  <td className="px-4 py-3" style={{ color: "hsl(var(--muted-foreground))" }}>{s.profile?.email ?? "—"}</td>
                  <td className="px-4 py-3">{s.classes?.name ?? "—"}</td>
                  <td className="px-4 py-3">{s.sections?.name ?? "—"}</td>
                  <td className="px-4 py-3" style={{ color: "hsl(var(--muted-foreground))" }}>{s.parent_name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                        setEditingStudent(s);
                        setValue("name", s.profile?.name ?? "");
                        setValue("class_id", s.class_id);
                        setValue("section_id", s.section_id);
                        setValue("roll_number", s.roll_number);
                        setValue("parent_name", s.parent_name ?? "");
                        setValue("parent_phone", s.parent_phone ?? "");
                        setValue("address", s.address ?? "");
                        setValue("date_of_birth", s.date_of_birth ?? "");
                      }}><Edit className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-red-500" onClick={() => setDeletingStudent(s)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
