import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, UserCheck, School, TrendingUp, DollarSign, ClipboardCheck } from "lucide-react";

export default function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [students, teachers, classes, fees, attendance] = await Promise.all([
        supabase.from("students").select("id", { count: "exact", head: true }),
        supabase.from("teachers").select("id", { count: "exact", head: true }),
        supabase.from("classes").select("id", { count: "exact", head: true }),
        supabase.from("fees").select("total_fee, paid_amount, status"),
        supabase.from("attendance").select("status").eq("date", new Date().toISOString().split("T")[0]),
      ]);

      const totalFees = fees.data?.reduce((s, f) => s + Number(f.total_fee), 0) ?? 0;
      const paidFees = fees.data?.reduce((s, f) => s + Number(f.paid_amount), 0) ?? 0;
      const presentToday = attendance.data?.filter(a => a.status === "present").length ?? 0;
      const totalToday = attendance.data?.length ?? 0;

      return {
        students: students.count ?? 0,
        teachers: teachers.count ?? 0,
        classes: classes.count ?? 0,
        totalFees,
        paidFees,
        presentToday,
        totalToday,
      };
    },
  });

  const { data: classDistribution } = useQuery({
    queryKey: ["class-distribution"],
    queryFn: async () => {
      const { data: classes } = await supabase.from("classes").select("id, name, order_index").order("order_index");
      const { data: students } = await supabase.from("students").select("class_id");
      return classes?.map(c => ({
        ...c,
        count: students?.filter(s => s.class_id === c.id).length ?? 0,
      })) ?? [];
    },
  });

  const statCards = [
    { label: "Total Students", value: stats?.students ?? 0, icon: Users, color: "hsl(199 89% 48%)", bg: "hsl(199 89% 48% / 0.1)" },
    { label: "Total Faculty", value: stats?.teachers ?? 0, icon: UserCheck, color: "hsl(var(--success))", bg: "hsl(var(--success) / 0.1)" },
    { label: "Classes", value: stats?.classes ?? 0, icon: School, color: "hsl(var(--accent))", bg: "hsl(var(--accent) / 0.1)" },
    { label: "Fee Collection", value: `₹${((stats?.paidFees ?? 0) / 1000).toFixed(0)}K`, icon: DollarSign, color: "hsl(var(--primary))", bg: "hsl(var(--primary) / 0.1)" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Admin Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
          Welcome back. Here's what's happening at your school today.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="stat-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>{label}</p>
                <p className="text-3xl font-bold mt-1" style={{ color: "hsl(var(--foreground))" }}>{value}</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Fee Overview + Attendance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Fee Status */}
        <div className="stat-card space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" style={{ color: "hsl(var(--primary))" }} />
            <h3 className="font-semibold">Fee Collection Overview</h3>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span style={{ color: "hsl(var(--muted-foreground))" }}>Collected</span>
              <span className="font-semibold">₹{(stats?.paidFees ?? 0).toLocaleString()}</span>
            </div>
            <div className="w-full rounded-full h-3" style={{ background: "hsl(var(--muted))" }}>
              <div
                className="h-3 rounded-full transition-all"
                style={{
                  width: stats?.totalFees ? `${Math.min(100, (stats.paidFees / stats.totalFees) * 100)}%` : "0%",
                  background: "hsl(var(--success))"
                }}
              />
            </div>
            <div className="flex justify-between text-xs mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
              <span>Total: ₹{(stats?.totalFees ?? 0).toLocaleString()}</span>
              <span>Due: ₹{((stats?.totalFees ?? 0) - (stats?.paidFees ?? 0)).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Today's Attendance */}
        <div className="stat-card space-y-4">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5" style={{ color: "hsl(var(--success))" }} />
            <h3 className="font-semibold">Today's Attendance</h3>
          </div>
          {stats?.totalToday === 0 ? (
            <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>No attendance marked yet today.</p>
          ) : (
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span style={{ color: "hsl(var(--muted-foreground))" }}>Present</span>
                <span className="font-semibold">{stats?.presentToday} / {stats?.totalToday}</span>
              </div>
              <div className="w-full rounded-full h-3" style={{ background: "hsl(var(--muted))" }}>
                <div
                  className="h-3 rounded-full"
                  style={{
                    width: stats?.totalToday ? `${(stats.presentToday / stats.totalToday) * 100}%` : "0%",
                    background: "hsl(var(--success))"
                  }}
                />
              </div>
              <p className="text-xs mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                {stats?.totalToday ? Math.round((stats.presentToday / stats.totalToday) * 100) : 0}% attendance rate today
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Class Distribution */}
      <div className="stat-card">
        <h3 className="font-semibold mb-4">Class-wise Student Distribution</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {classDistribution?.map(cls => (
            <div key={cls.id} className="text-center p-3 rounded-lg" style={{ background: "hsl(var(--muted))" }}>
              <p className="text-xl font-bold" style={{ color: "hsl(var(--primary))" }}>{cls.count}</p>
              <p className="text-xs mt-0.5 font-medium" style={{ color: "hsl(var(--foreground))" }}>{cls.name}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
