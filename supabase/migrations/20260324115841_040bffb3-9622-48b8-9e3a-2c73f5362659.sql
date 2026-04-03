
-- =============================================
-- SCHOOL MANAGEMENT SYSTEM - COMPLETE SCHEMA
-- =============================================

-- 1. Create role enum
CREATE TYPE public.user_role AS ENUM ('admin', 'faculty', 'student');

-- 2. Profiles table (mirrors auth.users with extra info)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role public.user_role NOT NULL DEFAULT 'student',
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Classes table (Nursery, LKG, UKG, 1-10)
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- 4. Sections table (A, B, C, D per class)
CREATE TABLE public.sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(class_id, name)
);

ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;

-- 5. Students table
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  class_id UUID NOT NULL REFERENCES public.classes(id),
  section_id UUID NOT NULL REFERENCES public.sections(id),
  roll_number INTEGER NOT NULL,
  parent_name TEXT,
  parent_phone TEXT,
  parent_email TEXT,
  address TEXT,
  date_of_birth DATE,
  admission_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(class_id, section_id, roll_number)
);

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- 6. Teachers table
CREATE TABLE public.teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  qualification TEXT,
  experience_years INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

-- 7. Teacher assignments (teacher to class + section + subject)
CREATE TABLE public.teacher_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, class_id, section_id, subject)
);

ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;

-- 8. Attendance table
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL,
  marked_by UUID REFERENCES public.teachers(id),
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, date)
);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- 9. Marks table
CREATE TABLE public.marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  exam_type TEXT NOT NULL DEFAULT 'unit_test',
  marks_obtained NUMERIC(5,2) NOT NULL DEFAULT 0,
  total_marks NUMERIC(5,2) NOT NULL DEFAULT 100,
  academic_year TEXT NOT NULL DEFAULT to_char(now(), 'YYYY'),
  term TEXT NOT NULL DEFAULT 'Term1',
  remarks TEXT,
  uploaded_by UUID REFERENCES public.teachers(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.marks ENABLE ROW LEVEL SECURITY;

-- 10. Fees table
CREATE TABLE public.fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  fee_type TEXT NOT NULL DEFAULT 'tuition',
  total_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  due_amount NUMERIC(10,2) GENERATED ALWAYS AS (total_fee - paid_amount) STORED,
  due_date DATE,
  payment_date DATE,
  academic_year TEXT NOT NULL DEFAULT to_char(now(), 'YYYY'),
  status TEXT NOT NULL DEFAULT 'pending',
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.fees ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TIMESTAMPS TRIGGER FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON public.teachers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_marks_updated_at BEFORE UPDATE ON public.marks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_fees_updated_at BEFORE UPDATE ON public.fees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- SECURITY DEFINER HELPER FUNCTIONS
-- =============================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_teacher_for_section(p_section_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teacher_assignments ta
    JOIN public.teachers t ON t.id = ta.teacher_id
    WHERE t.user_id = auth.uid() AND ta.section_id = p_section_id
  );
$$;

-- =============================================
-- RLS POLICIES
-- =============================================

-- PROFILES
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin can view all profiles" ON public.profiles
  FOR SELECT USING (public.is_admin());
CREATE POLICY "Admin can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admin can update all profiles" ON public.profiles
  FOR UPDATE USING (public.is_admin());
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- CLASSES
CREATE POLICY "Authenticated users can view classes" ON public.classes
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin can manage classes" ON public.classes
  FOR ALL USING (public.is_admin());

-- SECTIONS
CREATE POLICY "Authenticated users can view sections" ON public.sections
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin can manage sections" ON public.sections
  FOR ALL USING (public.is_admin());

-- STUDENTS
CREATE POLICY "Admin can manage students" ON public.students
  FOR ALL USING (public.is_admin());
CREATE POLICY "Student can view own record" ON public.students
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Teacher can view assigned students" ON public.students
  FOR SELECT USING (public.is_teacher_for_section(section_id));

-- Allow authenticated users to view classes and sections via joins
CREATE POLICY "Authenticated can view classes" ON public.classes
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can view sections" ON public.sections
  FOR SELECT USING (auth.role() = 'authenticated');

-- TEACHERS
CREATE POLICY "Admin can manage teachers" ON public.teachers
  FOR ALL USING (public.is_admin());
CREATE POLICY "Teacher can view own record" ON public.teachers
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Authenticated users can view teachers" ON public.teachers
  FOR SELECT USING (auth.role() = 'authenticated');

-- TEACHER ASSIGNMENTS
CREATE POLICY "Admin can manage assignments" ON public.teacher_assignments
  FOR ALL USING (public.is_admin());
CREATE POLICY "Teacher can view own assignments" ON public.teacher_assignments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.teachers t WHERE t.user_id = auth.uid() AND t.id = teacher_id)
  );
CREATE POLICY "Authenticated can view assignments" ON public.teacher_assignments
  FOR SELECT USING (auth.role() = 'authenticated');

-- ATTENDANCE
CREATE POLICY "Admin can manage attendance" ON public.attendance
  FOR ALL USING (public.is_admin());
CREATE POLICY "Teacher can manage own section attendance" ON public.attendance
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.students s
      JOIN public.teacher_assignments ta ON ta.section_id = s.section_id
      JOIN public.teachers t ON t.id = ta.teacher_id
      WHERE s.id = attendance.student_id AND t.user_id = auth.uid()
    )
  );
CREATE POLICY "Student can view own attendance" ON public.attendance
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid())
  );

-- MARKS
CREATE POLICY "Admin can manage marks" ON public.marks
  FOR ALL USING (public.is_admin());
CREATE POLICY "Teacher can manage marks for assigned students" ON public.marks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.students s
      JOIN public.teacher_assignments ta ON ta.section_id = s.section_id
      JOIN public.teachers t ON t.id = ta.teacher_id
      WHERE s.id = marks.student_id AND t.user_id = auth.uid()
    )
  );
CREATE POLICY "Student can view own marks" ON public.marks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid())
  );

-- FEES
CREATE POLICY "Admin can manage fees" ON public.fees
  FOR ALL USING (public.is_admin());
CREATE POLICY "Student can view own fees" ON public.fees
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid())
  );

-- =============================================
-- SEED DEFAULT CLASSES + SECTIONS
-- =============================================
INSERT INTO public.classes (name, order_index) VALUES
  ('Nursery', 1), ('LKG', 2), ('UKG', 3),
  ('Class 1', 4), ('Class 2', 5), ('Class 3', 6),
  ('Class 4', 7), ('Class 5', 8), ('Class 6', 9),
  ('Class 7', 10), ('Class 8', 11), ('Class 9', 12), ('Class 10', 13);

INSERT INTO public.sections (class_id, name)
SELECT c.id, s.name
FROM public.classes c
CROSS JOIN (VALUES ('A'), ('B'), ('C'), ('D')) AS s(name);

-- =============================================
-- EDGE FUNCTION: Admin creates users (invites)
-- This function is called server-side with admin rights
-- =============================================

-- Function to create profile after admin creates auth user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- profile is created by admin explicitly, this is a fallback
  INSERT INTO public.profiles (user_id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Unknown'),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'student')
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
