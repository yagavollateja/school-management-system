import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, DollarSign } from "lucide-react";

const feeSchema = z.object({
  student_id: z.string().uuid(),
  fee_type: z.string(),
  total_fee: z.coerce.number().min(0),
  paid_amount: z.coerce.number().min(0),
  academic_year: z.string(),
  status: z.string(),
  remarks: z.string().optional(),
});

type FeeForm = z.infer<typeof feeSchema>;

const FEE_TYPES = ["tuition", "transport", "lab", "sports", "library", "other"];
const STATUSES = ["pending", "paid", "partial", "overdue"];

export default function AdminFees() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const { register, handleSubmit, control, reset } = useForm<FeeForm>({
    defaultValues: { academic_year: new Date().getFullYear().toString(), status: "pending", fee_type: "tuition", total_fee: 0, paid_amount: 0 },
  });

  const { data: students } = useQuery({
    queryKey: ["students-simple"],
    queryFn: async () => {
      const { data } = await supabase
        .from("students")
        .select("id, user_id, class_id, section_id");
      
      if (!data) return [];
      
      // Fetch profiles and class/section separately
      const userIds = data.map(s => s.user_id);
      const classIds = [...new Set(data.map(s => s.class_id))];
      const sectionIds = [...new Set(data.map(s => s.section_id))];
      
      const [profilesRes, classesRes, sectionsRes] = await Promise.all([
        supabase.from("profiles").select("user_id, name, email").in("user_id", userIds),
        supabase.from("classes").select("id, name").in("id", classIds),
        supabase.from("sections").select("id, name").in("id", sectionIds)
      ]);
      
      const profileMap = new Map(profilesRes.data?.map(p => [p.user_id, p]) ?? []);
      const classMap = new Map(classesRes.data?.map(c => [c.id, c]) ?? []);
      const sectionMap = new Map(sectionsRes.data?.map(s => [s.id, s]) ?? []);
      
      return data.map(s => ({
        ...s,
        profile: profileMap.get(s.user_id) ?? null,
        classes: classMap.get(s.class_id) ?? null,
        sections: sectionMap.get(s.section_id) ?? null
      }));
    },
  });

  const { data: fees, isLoading } = useQuery({
    queryKey: ["fees-list", filterStatus],
    queryFn: async () => {
      let q = supabase
        .from("fees")
        .select("*")
        .order("created_at", { ascending: false });
      if (filterStatus !== "all") q = q.eq("status", filterStatus);
      const { data } = await q;
      if (!data) return [];
      
      // Fetch related data separately
      const studentIds = [...new Set(data.map(f => f.student_id))];
      const [studentsRes, profilesRes] = await Promise.all([
        supabase.from("students").select("id, user_id, class_id, section_id").in("id", studentIds),
        supabase.from("profiles").select("user_id, name, email")
      ]);
      
      const studentMap = new Map(studentsRes.data?.map(s => [s.id, s]) ?? []);
      const profileMap = new Map(profilesRes.data?.map(p => [p.user_id, p]) ?? []);
      
      // Get class and section info
      const classIds = [...new Set(studentsRes.data?.map(s => s.class_id) ?? [])];
      const sectionIds = [...new Set(studentsRes.data?.map(s => s.section_id) ?? [])];
      
      const [classesRes, sectionsRes] = await Promise.all([
        supabase.from("classes").select("id, name").in("id", classIds),
        supabase.from("sections").select("id, name").in("id", sectionIds)
      ]);
      
      const classMap = new Map(classesRes.data?.map(c => [c.id, c]) ?? []);
      const sectionMap = new Map(sectionsRes.data?.map(s => [s.id, s]) ?? []);
      
      return data.map(f => {
        const student = studentMap.get(f.student_id);
        const profile = student ? profileMap.get(student.user_id) : null;
        const cls = student ? classMap.get(student.class_id) : null;
        const section = student ? sectionMap.get(student.section_id) : null;
        
        return {
          ...f,
          students: {
            ...student,
            profile: profile,
            classes: cls,
            sections: section
          }
        };
      });
    },
  });

  const addFee = useMutation({
    mutationFn: async (data: FeeForm) => {
      const computedStatus = data.paid_amount >= data.total_fee ? "paid" : data.paid_amount > 0 ? "partial" : data.status;
      const { error } = await supabase.from("fees").insert({
        student_id: data.student_id,
        fee_type: data.fee_type,
        total_fee: data.total_fee,
        paid_amount: data.paid_amount,
        academic_year: data.academic_year,
        status: computedStatus,
        remarks: data.remarks ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Fee record added!"); qc.invalidateQueries({ queryKey: ["fees-list"] }); setOpen(false); reset(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalCollected = fees?.reduce((s, f) => s + Number(f.paid_amount), 0) ?? 0;
  const totalDue = fees?.reduce((s, f) => s + Number(f.due_amount), 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Fee Management</h1>
          <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>Track fee payments and dues</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Add Fee</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Add Fee Record</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(d => addFee.mutate(d))} className="space-y-4">
              <div>
                <Label>Student *</Label>
                <Controller name="student_id" control={control} render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                    <SelectContent>
                      {students?.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.profile?.name} — {s.classes?.name} {s.sections?.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Fee Type</Label>
                  <Controller name="fee_type" control={control} render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{FEE_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                    </Select>
                  )} />
                </div>
                <div>
                  <Label>Academic Year</Label>
                  <Input {...register("academic_year")} />
                </div>
                <div>
                  <Label>Total Fee (₹) *</Label>
                  <Input {...register("total_fee")} type="number" placeholder="0" />
                </div>
                <div>
                  <Label>Paid Amount (₹) *</Label>
                  <Input {...register("paid_amount")} type="number" placeholder="0" />
                </div>
                <div>
                  <Label>Status</Label>
                  <Controller name="status" control={control} render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                    </Select>
                  )} />
                </div>
              </div>
              <div>
                <Label>Remarks</Label>
                <Input {...register("remarks")} placeholder="Optional note" />
              </div>
              <Button type="submit" className="w-full" disabled={addFee.isPending}>Save Fee Record</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Collected", value: `₹${totalCollected.toLocaleString()}`, color: "hsl(var(--success))" },
          { label: "Total Pending", value: `₹${totalDue.toLocaleString()}`, color: "hsl(var(--destructive))" },
          { label: "Records", value: fees?.length ?? 0, color: "hsl(var(--primary))" },
          { label: "Paid", value: fees?.filter(f => f.status === "paid").length ?? 0, color: "hsl(var(--success))" },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{s.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      <Select value={filterStatus} onValueChange={setFilterStatus}>
        <SelectTrigger className="w-44"><SelectValue placeholder="All Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          {STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
        </SelectContent>
      </Select>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "hsl(var(--border))" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ background: "hsl(var(--muted))" }}>
              <tr>
                {["Student", "Class", "Type", "Total", "Paid", "Due", "Year", "Status"].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold" style={{ color: "hsl(var(--muted-foreground))" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="text-center py-8" style={{ color: "hsl(var(--muted-foreground))" }}>Loading...</td></tr>
              ) : fees?.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8" style={{ color: "hsl(var(--muted-foreground))" }}>No fee records</td></tr>
              ) : fees?.map((f: any) => (
                <tr key={f.id} style={{ borderTop: "1px solid hsl(var(--border))" }}>
                  <td className="px-4 py-3 font-medium">{f.students?.profile?.name ?? "—"}</td>
                  <td className="px-4 py-3">{f.students?.classes?.name ?? "—"}</td>
                  <td className="px-4 py-3 capitalize">{f.fee_type}</td>
                  <td className="px-4 py-3 font-mono">₹{Number(f.total_fee).toLocaleString()}</td>
                  <td className="px-4 py-3 font-mono" style={{ color: "hsl(var(--success))" }}>₹{Number(f.paid_amount).toLocaleString()}</td>
                  <td className="px-4 py-3 font-mono" style={{ color: "hsl(var(--destructive))" }}>₹{Number(f.due_amount).toLocaleString()}</td>
                  <td className="px-4 py-3">{f.academic_year}</td>
                  <td className="px-4 py-3">
                    <span className={
                      f.status === "paid" ? "badge-success" :
                      f.status === "pending" ? "badge-warning" :
                      f.status === "partial" ? "badge-info" : "badge-danger"
                    }>
                      {f.status}
                    </span>
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
