import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import {
  GraduationCap, LayoutDashboard, Users, UserCheck,
  ClipboardList, BookOpen, DollarSign, LogOut, School, ChevronRight, BookMarked, FileText
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/admin/students", icon: Users, label: "Students" },
  { to: "/admin/teachers", icon: UserCheck, label: "Faculty" },
  { to: "/admin/classes", icon: School, label: "Classes & Sections" },
  { to: "/admin/subjects", icon: BookMarked, label: "Subjects" },
  { to: "/admin/attendance", icon: ClipboardList, label: "Attendance" },
  { to: "/admin/marks", icon: BookOpen, label: "Marks Entry" },
  { to: "/admin/marks-memo", icon: FileText, label: "Marks Memo" },
  { to: "/admin/fees", icon: DollarSign, label: "Fees" },
];

export default function AdminLayout() {
  const { profile, signOut } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="flex min-h-screen" style={{ background: "hsl(var(--background))" }}>
      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col transition-all duration-300 sticky top-0 h-screen",
          collapsed ? "w-16" : "w-64"
        )}
        style={{
          background: "hsl(var(--sidebar-background))",
          boxShadow: "var(--shadow-sidebar)"
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "hsl(var(--accent))" }}>
            <GraduationCap className="w-5 h-5" style={{ color: "hsl(222 47% 11%)" }} />
          </div>
          {!collapsed && (
            <div>
              <p className="text-sm font-bold" style={{ color: "hsl(var(--sidebar-foreground))" }}>EduManage</p>
              <p className="text-xs" style={{ color: "hsl(var(--sidebar-muted))" }}>Admin Panel</p>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn("ml-auto rounded-lg p-1 transition-colors hover:opacity-80", collapsed && "rotate-180")}
            style={{ color: "hsl(var(--sidebar-muted))" }}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "border-l-[3px]"
                    : "border-l-[3px] border-transparent hover:opacity-80"
                )
              }
              style={({ isActive }) => ({
                background: isActive ? "hsl(var(--sidebar-accent))" : "transparent",
                color: isActive ? "hsl(var(--sidebar-primary))" : "hsl(var(--sidebar-foreground))",
                borderLeftColor: isActive ? "hsl(var(--sidebar-primary))" : "transparent",
              })}
              title={collapsed ? label : undefined}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User + Logout */}
        <div className="p-3 border-t" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
          {!collapsed && (
            <div className="flex items-center gap-2 px-2 py-2 rounded-lg mb-2" style={{ background: "hsl(var(--sidebar-accent))" }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                style={{ background: "hsl(var(--accent))", color: "hsl(222 47% 11%)" }}>
                {profile?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate" style={{ color: "hsl(var(--sidebar-foreground))" }}>{profile?.name}</p>
                <p className="text-xs capitalize" style={{ color: "hsl(var(--sidebar-muted))" }}>Principal / Admin</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className={cn("w-full justify-start gap-2 text-xs hover:opacity-80", collapsed && "justify-center")}
            style={{ color: "hsl(var(--sidebar-muted))" }}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && "Sign Out"}
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
