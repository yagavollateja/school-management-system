import { useEffect } from "react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/store/authStore";
import Login from "@/pages/Login";
import AdminLayout from "@/layouts/AdminLayout";
import FacultyLayout from "@/layouts/FacultyLayout";
import StudentLayout from "@/layouts/StudentLayout";
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminStudents from "@/pages/admin/Students";
import AdminTeachers from "@/pages/admin/Teachers";
import AdminAttendance from "@/pages/admin/Attendance";
import AdminMarks from "@/pages/admin/Marks";
import AdminFees from "@/pages/admin/Fees";
import AdminClasses from "@/pages/admin/Classes";
import FacultyDashboard from "@/pages/faculty/Dashboard";
import FacultyAttendance from "@/pages/faculty/Attendance";
import FacultyMarks from "@/pages/faculty/Marks";
import FacultyStudents from "@/pages/faculty/Students";
import StudentDashboard from "@/pages/student/Dashboard";
import StudentAttendance from "@/pages/student/Attendance";
import StudentMarks from "@/pages/student/Marks";
import StudentFees from "@/pages/student/Fees";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function AuthGate() {
  const { user, profile, loading, setUser, setLoading, fetchProfile } = useAuthStore();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "hsl(var(--background))" }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Login />;

  const role = profile?.role;

  return (
    <Routes>
      {/* Admin Routes */}
      <Route path="/admin" element={role === "admin" ? <AdminLayout /> : <Navigate to="/" replace />}>
        <Route index element={<AdminDashboard />} />
        <Route path="students" element={<AdminStudents />} />
        <Route path="teachers" element={<AdminTeachers />} />
        <Route path="attendance" element={<AdminAttendance />} />
        <Route path="marks" element={<AdminMarks />} />
        <Route path="fees" element={<AdminFees />} />
        <Route path="classes" element={<AdminClasses />} />
      </Route>

      {/* Faculty Routes */}
      <Route path="/faculty" element={role === "faculty" ? <FacultyLayout /> : <Navigate to="/" replace />}>
        <Route index element={<FacultyDashboard />} />
        <Route path="attendance" element={<FacultyAttendance />} />
        <Route path="marks" element={<FacultyMarks />} />
        <Route path="students" element={<FacultyStudents />} />
      </Route>

      {/* Student Routes */}
      <Route path="/student" element={role === "student" ? <StudentLayout /> : <Navigate to="/" replace />}>
        <Route index element={<StudentDashboard />} />
        <Route path="attendance" element={<StudentAttendance />} />
        <Route path="marks" element={<StudentMarks />} />
        <Route path="fees" element={<StudentFees />} />
      </Route>

      {/* Root redirect based on role */}
      <Route
        path="/"
        element={
          role === "admin" ? <Navigate to="/admin" replace /> :
          role === "faculty" ? <Navigate to="/faculty" replace /> :
          role === "student" ? <Navigate to="/student" replace /> :
          <Login />
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AuthGate />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
