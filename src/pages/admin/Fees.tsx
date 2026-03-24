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
  due_date: z.string().optional(),
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
  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<FeeForm>({
    resolver: zodResolver(feeSchema),
    defaultValues: { academic_year: new Date().getFullYear().toString(), status: "pending", fee_type: "tuition" },
  });

  const { data: students } = useQuery({
    queryKey: ["students-simple"],
    queryFn: async () => {
      const { data } = await supabase
        .from("students")
        .select("id, profiles!students_user_id_fkey(name), classes(name), sections(name)");
      return data ?? [];
    },
  });

  const { data: fees, isLoading } = useQuery({
    queryKey: ["fees-list", filterStatus],
    queryFn: async () => {
      let q = supabase
        .from("fees")
        .select(`*, students(*, profiles!students_user_id_fkey(name), classes(name), sections(name))`)
        .order("created_at", { ascending: false });
      if (filterStatus !== "all") q = q.eq("status", filterStatus);
      const { data } = await q;
      return data ?? [];
    },
  });

  const addFee = useMutation({
    mutationFn: async (data: FeeForm) => {
      const { error } = await supabase.from("fees").insert({
        ...data,
        due_date: data.due_date || null,
        remarks: data.remarks || null,
        status: data.paid_amount >= data.total_fee ? "paid" : data.paid_amount > 0 ? "partial" : data.status,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Fee record added!"); qc.invalidateQueries({ queryKey: ["fees-list"] }); setOpen(false); reset(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalCollected = fees?.reduce((s, f) => s + Number(f.paid_amount), 0) ?? 0;
  const totalDue = fees?.reduce((s, f) => s + Number(f.due_amount), 0) ?? 0;

  const filtered = filterStatus === "all" ? fees : fees?.filter(f => f.status === filterStatus);

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
                          {s.profiles?.name} — {s.classes?.name} {s.sections?.name}
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
                  <Label>Due Date</Label>
                  <Input {...register("due_date")} type="date" />
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

      {/* Filter */}
      <Select value={filterStatus} onValueChange={setFilterStatus}>
        <SelectTrigger className="w-44"><SelectValue placeholder="All Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          {STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
        </SelectContent>
      </Select>

      {/* Table */}
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
              ) : filtered?.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8" style={{ color: "hsl(var(--muted-foreground))" }}>No fee records</td></tr>
              ) : filtered?.map((f: any) => (
                <tr key={f.id} style={{ borderTop: "1px solid hsl(var(--border))" }}>
                  <td className="px-4 py-3 font-medium">{f.students?.profiles?.name ?? "—"}</td>
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
