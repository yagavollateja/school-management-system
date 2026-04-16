import { useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/store/authStore";

// Layouts (DO NOT lazy load)
import AdminLayout from "@/layouts/AdminLayout";
import FacultyLayout from "@/layouts/FacultyLayout";
import StudentLayout from "@/layouts/StudentLayout";

// Lazy loaded pages
const Login = lazy(() => import("@/pages/Login"));
const NotFound = lazy(() => import("@/pages/NotFound"));

// Admin
const AdminDashboard = lazy(() => import("@/pages/admin/Dashboard"));
const AdminStudents = lazy(() => import("@/pages/admin/Students"));
const AdminTeachers = lazy(() => import("@/pages/admin/Teachers"));
const AdminAttendance = lazy(() => import("@/pages/admin/Attendance"));
const AdminMarks = lazy(() => import("@/pages/admin/Marks"));
const AdminMarksMemo = lazy(() => import("@/pages/admin/MarksMemo"));
const AdminFees = lazy(() => import("@/pages/admin/Fees"));
const AdminClasses = lazy(() => import("@/pages/admin/Classes"));
const AdminSubjects = lazy(() => import("@/pages/admin/Subjects"));

// Faculty
const FacultyDashboard = lazy(() => import("@/pages/faculty/Dashboard"));
const FacultyAttendance = lazy(() => import("@/pages/faculty/Attendance"));
const FacultyMarks = lazy(() => import("@/pages/faculty/Marks"));
const FacultyStudents = lazy(() => import("@/pages/faculty/Students"));

// Student
const StudentDashboard = lazy(() => import("@/pages/student/Dashboard"));
const StudentAttendance = lazy(() => import("@/pages/student/Attendance"));
const StudentMarks = lazy(() => import("@/pages/student/Marks"));
const StudentMarksMemo = lazy(() => import("@/pages/student/MarksMemo"));
const StudentFees = lazy(() => import("@/pages/student/Fees"));

const queryClient = new QueryClient();

// Loading Component
const Loader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-muted-foreground text-sm">Loading...</p>
    </div>
  </div>
);

function AuthGate() {
  const { user, profile, loading, setUser, setLoading, fetchProfile } = useAuthStore();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
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

  if (loading) return <Loader />;

  if (!user) {
    return (
      <Suspense fallback={<Loader />}>
        <Login />
      </Suspense>
    );
  }

  const role = profile?.role;

  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        {/* Admin */}
        <Route path="/admin" element={role === "admin" ? <AdminLayout /> : <Navigate to="/" replace />}>
          <Route index element={<AdminDashboard />} />
          <Route path="students" element={<AdminStudents />} />
          <Route path="teachers" element={<AdminTeachers />} />
          <Route path="attendance" element={<AdminAttendance />} />
          <Route path="marks" element={<AdminMarks />} />
          <Route path="marks-memo" element={<AdminMarksMemo />} />
          <Route path="fees" element={<AdminFees />} />
          <Route path="classes" element={<AdminClasses />} />
          <Route path="subjects" element={<AdminSubjects />} />
        </Route>

        {/* Faculty */}
        <Route path="/faculty" element={role === "faculty" ? <FacultyLayout /> : <Navigate to="/" replace />}>
          <Route index element={<FacultyDashboard />} />
          <Route path="attendance" element={<FacultyAttendance />} />
          <Route path="marks" element={<FacultyMarks />} />
          <Route path="students" element={<FacultyStudents />} />
        </Route>

        {/* Student */}
        <Route path="/student" element={role === "student" ? <StudentLayout /> : <Navigate to="/" replace />}>
          <Route index element={<StudentDashboard />} />
          <Route path="attendance" element={<StudentAttendance />} />
          <Route path="marks" element={<StudentMarks />} />
          <Route path="marks-memo" element={<StudentMarksMemo />} />
          <Route path="fees" element={<StudentFees />} />
        </Route>

        {/* Redirect */}
        <Route
          path="/"
          element={
            role === "admin"
              ? <Navigate to="/admin" replace />
              : role === "faculty"
              ? <Navigate to="/faculty" replace />
              : role === "student"
              ? <Navigate to="/student" replace />
              : <Login />
          }
        />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
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
