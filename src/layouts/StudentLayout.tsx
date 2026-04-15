import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { GraduationCap, LayoutDashboard, ClipboardList, BookOpen, DollarSign, LogOut, ChevronRight, FileText } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/student", icon: LayoutDashboard, label: "My Dashboard", end: true },
  { to: "/student/attendance", icon: ClipboardList, label: "Attendance" },
  { to: "/student/marks", icon: BookOpen, label: "My Results" },
  { to: "/student/marks-memo", icon: FileText, label: "My Marks Memo" },
  { to: "/student/fees", icon: DollarSign, label: "Fee Status" },
];

export default function StudentLayout() {
  const { profile, signOut } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen" style={{ background: "hsl(var(--background))" }}>
      <aside
        className={cn("flex flex-col transition-all duration-300 sticky top-0 h-screen", collapsed ? "w-16" : "w-64")}
        style={{ background: "hsl(var(--sidebar-background))", boxShadow: "var(--shadow-sidebar)" }}
      >
        <div className="flex items-center gap-3 px-4 py-5 border-b" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "hsl(var(--accent))" }}>
            <GraduationCap className="w-5 h-5" style={{ color: "hsl(222 47% 11%)" }} />
          </div>
          {!collapsed && (
            <div>
              <p className="text-sm font-bold" style={{ color: "hsl(var(--sidebar-foreground))" }}>EduManage</p>
              <p className="text-xs" style={{ color: "hsl(var(--sidebar-muted))" }}>Student Portal</p>
            </div>
          )}
          <button onClick={() => setCollapsed(!collapsed)}
            className={cn("ml-auto rounded-lg p-1 transition-colors", collapsed && "rotate-180")}
            style={{ color: "hsl(var(--sidebar-muted))" }}>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all", isActive ? "border-l-[3px]" : "border-l-[3px] border-transparent")}
              style={({ isActive }) => ({
                background: isActive ? "hsl(var(--sidebar-accent))" : "transparent",
                color: isActive ? "hsl(var(--sidebar-primary))" : "hsl(var(--sidebar-foreground))",
                borderLeftColor: isActive ? "hsl(var(--sidebar-primary))" : "transparent",
              })}>
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
          {!collapsed && (
            <div className="flex items-center gap-2 px-2 py-2 rounded-lg mb-2" style={{ background: "hsl(var(--sidebar-accent))" }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                style={{ background: "hsl(199 89% 48%)", color: "hsl(0 0% 100%)" }}>
                {profile?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate" style={{ color: "hsl(var(--sidebar-foreground))" }}>{profile?.name}</p>
                <p className="text-xs" style={{ color: "hsl(var(--sidebar-muted))" }}>Student</p>
              </div>
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate("/"); }}
            className={cn("w-full justify-start gap-2 text-xs", collapsed && "justify-center")}
            style={{ color: "hsl(var(--sidebar-muted))" }}>
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && "Sign Out"}
          </Button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
