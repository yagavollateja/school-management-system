import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { GraduationCap, Lock, Mail, Eye, EyeOff } from "lucide-react";

const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginForm = z.infer<typeof schema>;

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    if (error) {
      toast.error(error.message);
    }
    setIsLoading(false);
  };

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
        <div className="relative z-10 grid grid-cols-3 gap-4">
          {[["13", "Classes"], ["52", "Sections"], ["3", "Roles"]].map(([n, l]) => (
            <div key={l} className="text-center p-3 rounded-xl" style={{ background: "hsl(0 0% 100% / 0.1)" }}>
              <div className="text-2xl font-bold" style={{ color: "hsl(38 92% 60%)" }}>{n}</div>
              <div className="text-xs opacity-70 mt-0.5">{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[400px]">
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

          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-1" style={{ color: "hsl(var(--foreground))" }}>Welcome back</h2>
            <p style={{ color: "hsl(var(--muted-foreground))" }}>Sign in with your school credentials</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
              className="w-full h-11 font-semibold"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </div>
              ) : "Sign In"}
            </Button>
          </form>

          <div className="mt-8 p-4 rounded-xl" style={{ background: "hsl(var(--muted))" }}>
            <p className="text-xs font-medium mb-2" style={{ color: "hsl(var(--muted-foreground))" }}>
              🔒 Secure Login
            </p>
            <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
              Access is provided by school administration only. Contact your school principal for login credentials.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
