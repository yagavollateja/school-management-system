import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { GraduationCap, Lock, Mail, Eye, EyeOff, ShieldCheck, BookOpen, User } from "lucide-react";
import { cn } from "@/lib/utils";

const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginForm = z.infer<typeof schema>;
type Role = "admin" | "faculty" | "student";

const roles: { id: Role; label: string; desc: string; icon: React.ReactNode; color: string }[] = [
  {
    id: "admin",
    label: "Admin",
    desc: "Principal / Management",
    icon: <ShieldCheck className="w-5 h-5" />,
    color: "hsl(var(--primary))",
  },
  {
    id: "faculty",
    label: "Faculty",
    desc: "Teacher / Staff",
    icon: <BookOpen className="w-5 h-5" />,
    color: "hsl(199 89% 48%)",
  },
  {
    id: "student",
    label: "Student",
    desc: "Enrolled Learner",
    icon: <User className="w-5 h-5" />,
    color: "hsl(142 71% 45%)",
  },
];

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role>("admin");

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      toast.error(error.message);
      setIsLoading(false);
      return;
    }

    // Fetch profile and verify role matches selected
    if (authData.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", authData.user.id)
        .single();

      if (profile && profile.role !== selectedRole) {
        await supabase.auth.signOut();
        toast.error(`This account is not registered as ${selectedRole}. Please select the correct role.`);
        setIsLoading(false);
        return;
      }
    }

    setIsLoading(false);
  };

  const activeRole = roles.find((r) => r.id === selectedRole)!;

  return (
    <div className="min-h-screen flex" style={{ background: "hsl(var(--background))" }}>
      {/* Left Panel */}
      <div
        className="hidden lg:flex flex-col justify-between w-[420px] p-10 text-white relative overflow-hidden"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "radial-gradient(circle at 20% 80%, hsl(38 92% 50%) 0%, transparent 50%), radial-gradient(circle at 80% 20%, hsl(199 89% 48%) 0%, transparent 50%)"
        }} />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "hsl(38 92% 50%)" }}>
              <GraduationCap className="w-7 h-7" style={{ color: "hsl(222 47% 11%)" }} />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight">EduManage</h1>
              <p className="text-xs opacity-70">School Management System</p>
            </div>
          </div>
          <div className="space-y-6">
            <h2 className="text-4xl font-bold leading-tight">
              Empowering<br />Education<br />Excellence
            </h2>
            <p className="text-base opacity-80 leading-relaxed">
              A complete school management platform for administrators, teachers, and students — all in one place.
            </p>
          </div>
        </div>

        {/* Role Cards on left panel */}
        <div className="relative z-10 space-y-3">
          {roles.map((role) => (
            <div
              key={role.id}
              className="flex items-center gap-3 p-3 rounded-xl transition-all"
              style={{
                background: selectedRole === role.id ? "hsl(0 0% 100% / 0.15)" : "hsl(0 0% 100% / 0.06)",
                borderLeft: selectedRole === role.id ? `3px solid ${role.color}` : "3px solid transparent",
              }}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: role.color, color: "hsl(222 47% 11%)" }}>
                {role.icon}
              </div>
              <div>
                <p className="text-sm font-semibold">{role.label}</p>
                <p className="text-xs opacity-60">{role.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "hsl(var(--primary))" }}>
              <GraduationCap className="w-6 h-6" style={{ color: "hsl(var(--primary-foreground))" }} />
            </div>
            <div>
              <h1 className="text-lg font-bold">EduManage</h1>
              <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>School Management System</p>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-3xl font-bold mb-1" style={{ color: "hsl(var(--foreground))" }}>Welcome back</h2>
            <p style={{ color: "hsl(var(--muted-foreground))" }}>Select your role and sign in</p>
          </div>

          {/* Role Selector */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            {roles.map((role) => (
              <button
                key={role.id}
                type="button"
                onClick={() => setSelectedRole(role.id)}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center",
                  selectedRole === role.id ? "border-transparent shadow-md" : "border-transparent"
                )}
                style={{
                  background: selectedRole === role.id
                    ? `${role.color}18`
                    : "hsl(var(--muted))",
                  borderColor: selectedRole === role.id ? role.color : "transparent",
                  outline: "none",
                }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{
                    background: selectedRole === role.id ? role.color : "hsl(var(--muted-foreground) / 0.15)",
                    color: selectedRole === role.id ? "white" : "hsl(var(--muted-foreground))",
                  }}
                >
                  {role.icon}
                </div>
                <span
                  className="text-xs font-semibold"
                  style={{ color: selectedRole === role.id ? role.color : "hsl(var(--muted-foreground))" }}
                >
                  {role.label}
                </span>
                <span className="text-[10px] leading-tight" style={{ color: "hsl(var(--muted-foreground))" }}>
                  {role.desc}
                </span>
              </button>
            ))}
          </div>

          {/* Active role badge */}
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg mb-5 text-sm font-medium"
            style={{ background: `${activeRole.color}15`, color: activeRole.color }}
          >
            {activeRole.icon}
            Signing in as <span className="font-bold">{activeRole.label}</span>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "hsl(var(--muted-foreground))" }} />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@school.edu"
                  className="pl-10"
                  {...register("email")}
                />
              </div>
              {errors.email && <p className="text-xs" style={{ color: "hsl(var(--destructive))" }}>{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "hsl(var(--muted-foreground))" }} />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "hsl(var(--muted-foreground))" }}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs" style={{ color: "hsl(var(--destructive))" }}>{errors.password.message}</p>}
            </div>

            <Button
              type="submit"
              className="w-full h-11 font-semibold mt-2"
              disabled={isLoading}
              style={{ background: activeRole.color, color: "white" }}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </div>
              ) : `Sign in as ${activeRole.label}`}
            </Button>
          </form>

          <div className="mt-6 p-4 rounded-xl" style={{ background: "hsl(var(--muted))" }}>
            <p className="text-xs font-medium mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>
              🔒 Secure Access
            </p>
            <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
              Login credentials are issued by the school administration. Contact your principal for access.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
