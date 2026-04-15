import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Search, Edit, Trash2, BookOpen, Loader2, Database } from "lucide-react";

const schema = z.object({
  name: z.string().min(2, "Subject name must be at least 2 characters"),
  code: z.string().optional(),
});

type SubjectForm = z.infer<typeof schema>;

async function createSubjectsTable(supabaseUrl: string, anonKey: string) {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": anonKey,
      "Authorization": `Bearer ${anonKey}`,
    },
    body: JSON.stringify({
      query: `CREATE TABLE IF NOT EXISTS subjects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        code TEXT,
        order_index INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT now()
      );
      ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "Allow all subjects" ON subjects;
      CREATE POLICY "Allow all subjects" ON subjects FOR ALL USING (true) WITH CHECK (true);`
    })
  });
  return response.ok;
}

export default function AdminSubjects() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [editingSubject, setEditingSubject] = useState<any>(null);
  const [deletingSubject, setDeletingSubject] = useState<any>(null);
  const [tableExists, setTableExists] = useState<boolean | null>(null);
  const [isSettingUp, setIsSettingUp] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SubjectForm>({
    resolver: zodResolver(schema),
  });

  const checkAndCreateTable = async () => {
    setIsSettingUp(true);
    try {
      const { error } = await supabase.from("subjects").select("id").limit(1);
      if (!error) {
        setTableExists(true);
        return;
      }
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
        const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
        const res = await fetch(`${SUPABASE_URL}/rest/v1/subjects`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": ANON_KEY,
            "Authorization": `Bearer ${ANON_KEY}`,
            "Prefer": "return=minimal"
          },
          body: JSON.stringify({ name: " Mathematics ", code: "MATH", order_index: 1 })
        });
        if (res.status === 201 || res.status === 200) {
          await supabase.from("subjects").delete().eq("name", " Mathematics ").eq("order_index", 1);
          setTableExists(true);
        } else if (res.status === 404) {
          setTableExists(false);
        }
      } else {
        setTableExists(true);
      }
    } catch {
      setTableExists(false);
    } finally {
      setIsSettingUp(false);
    }
  };

  useEffect(() => {
    checkAndCreateTable();
  }, []);

  const { data: subjects, isLoading, error } = useQuery({
    queryKey: ["subjects-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("*").order("order_index");
      if (error) throw error;
      return data ?? [];
    },
    enabled: tableExists !== false,
  });

  const createSubject = useMutation({
    mutationFn: async (data: SubjectForm) => {
      const maxOrder = subjects?.length ?? 0;
      const { error } = await supabase.from("subjects").insert({
        name: data.name,
        code: data.code ?? null,
        order_index: maxOrder + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Subject added successfully!");
      qc.invalidateQueries({ queryKey: ["subjects-list"] });
      setOpen(false);
      reset();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateSubject = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: SubjectForm }) => {
      const { error } = await supabase.from("subjects").update({
        name: data.name,
        code: data.code ?? null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Subject updated successfully!");
      qc.invalidateQueries({ queryKey: ["subjects-list"] });
      setEditingSubject(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteSubject = useMutation({
    mutationFn: async (subject: any) => {
      const { error } = await supabase.from("subjects").delete().eq("id", subject.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Subject deleted!");
      qc.invalidateQueries({ queryKey: ["subjects-list"] });
      setDeletingSubject(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = subjects?.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.code?.toLowerCase().includes(search.toLowerCase())
  );

  if (tableExists === false) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="page-title">Subjects</h1>
          <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
            Manage all subjects offered by the school
          </p>
        </div>
        <div className="rounded-xl border p-8 text-center" style={{ borderColor: "hsl(var(--border))" }}>
          <Database className="w-12 h-12 mx-auto mb-4" style={{ color: "hsl(var(--muted-foreground))" }} />
          <h2 className="text-lg font-semibold mb-2">Database Setup Required</h2>
          <p className="text-sm mb-4" style={{ color: "hsl(var(--muted-foreground))" }}>
            The subjects table doesn't exist in your database.
          </p>
          <div className="text-left bg-muted p-4 rounded-lg mb-4 max-w-lg mx-auto" style={{ color: "hsl(var(--muted-foreground))" }}>
            <p className="font-semibold mb-2">Run this SQL in Supabase SQL Editor:</p>
            <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
{`CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all subjects" ON subjects
  FOR ALL USING (true) WITH CHECK (true);`}
            </pre>
          </div>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => window.open("https://supabase.com/dashboard/project/wbbnfueqavaqhedmrhge/sql", "_blank")}>
              Open SQL Editor
            </Button>
            <Button onClick={() => checkAndCreateTable()} disabled={isSettingUp}>
              {isSettingUp ? "Setting up..." : "Retry"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Subjects</h1>
          <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
            Manage all subjects offered by the school
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Add Subject</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Subject</DialogTitle></DialogHeader>
            <DialogDescription>Enter the subject details to add it to the system.</DialogDescription>
            <form onSubmit={handleSubmit((d) => createSubject.mutate(d))} className="space-y-4">
              <div>
                <Label>Subject Name *</Label>
                <Input {...register("name")} placeholder="e.g., Mathematics" />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div>
                <Label>Subject Code</Label>
                <Input {...register("code")} placeholder="e.g., MATH" />
              </div>
              <Button type="submit" className="w-full" disabled={createSubject.isPending}>
                {createSubject.isPending ? "Adding..." : "Add Subject"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Subject Dialog */}
        <Dialog open={!!editingSubject} onOpenChange={(open) => !open && setEditingSubject(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Subject</DialogTitle></DialogHeader>
            <DialogDescription>Update the subject details.</DialogDescription>
            <form onSubmit={handleSubmit((data) => {
              updateSubject.mutate({ id: editingSubject.id, data });
            })} className="space-y-4">
              <div>
                <Label>Subject Name *</Label>
                <Input {...register("name")} placeholder="Subject name" />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div>
                <Label>Subject Code</Label>
                <Input {...register("code")} placeholder="Subject code" />
              </div>
              <Button type="submit" className="w-full" disabled={updateSubject.isPending}>
                {updateSubject.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deletingSubject} onOpenChange={(open) => !open && setDeletingSubject(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Delete Subject</DialogTitle></DialogHeader>
            <DialogDescription>
              Are you sure you want to delete "{deletingSubject?.name}"? This action cannot be undone.
            </DialogDescription>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setDeletingSubject(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => deleteSubject.mutate(deletingSubject)}>Delete</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "hsl(var(--muted-foreground))" }} />
        <Input 
          className="pl-9" 
          placeholder="Search subjects..." 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "hsl(var(--border))" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ background: "hsl(var(--muted))" }}>
              <tr>
                {["#", "Subject Name", "Code", "Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold" style={{ color: "hsl(var(--muted-foreground))" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading || isSettingUp ? (
                <tr><td colSpan={4} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></td></tr>
              ) : error ? (
                <tr><td colSpan={4} className="text-center py-8 text-destructive">{error.message}</td></tr>
              ) : filtered?.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8" style={{ color: "hsl(var(--muted-foreground))" }}>No subjects found. Add your first subject!</td></tr>
              ) : filtered?.map((s: any, i) => (
                <tr key={s.id} style={{ borderTop: "1px solid hsl(var(--border))" }}>
                  <td className="px-4 py-3 font-mono text-xs">{i + 1}</td>
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3" style={{ color: "hsl(var(--muted-foreground))" }}>{s.code ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                        setEditingSubject(s);
                        reset({ name: s.name, code: s.code ?? "" });
                      }}><Edit className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-red-500" onClick={() => setDeletingSubject(s)}><Trash2 className="w-3.5 h-3.5" /></Button>
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