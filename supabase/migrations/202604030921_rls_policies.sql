-- Add missing RLS policies for admin insert operations
DROP POLICY IF EXISTS "Admin can insert profiles" ON public.profiles;
CREATE POLICY "Admin can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admin can insert teachers" ON public.teachers;
CREATE POLICY "Admin can insert teachers" ON public.teachers
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin can insert students" ON public.students;
CREATE POLICY "Admin can insert students" ON public.students
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin can insert assignments" ON public.teacher_assignments;
CREATE POLICY "Admin can insert assignments" ON public.teacher_assignments
  FOR INSERT WITH CHECK (public.is_admin());

-- Ensure students can be selected by authenticated users for joins
DROP POLICY IF EXISTS "Authenticated can view students" ON public.students;
CREATE POLICY "Authenticated can view students" ON public.students
  FOR SELECT USING (auth.role() = 'authenticated');

-- Ensure teachers can be viewed
DROP POLICY IF EXISTS "Admin can view teachers" ON public.teachers;
CREATE POLICY "Admin can view teachers" ON public.teachers
  FOR SELECT USING (public.is_admin());

-- Allow teachers to view profiles of students in their assigned sections
DROP POLICY IF EXISTS "Teachers can view student profiles" ON public.profiles;
CREATE POLICY "Teachers can view student profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.teachers t
      JOIN public.teacher_assignments ta ON t.id = ta.teacher_id
      JOIN public.students s ON s.section_id = ta.section_id
      WHERE t.user_id = auth.uid() AND s.user_id = profiles.user_id
    )
  );

-- Allow teachers to view classes in their assignments
DROP POLICY IF EXISTS "Teachers can view assigned classes" ON public.classes;
CREATE POLICY "Teachers can view assigned classes" ON public.classes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.teachers t
      JOIN public.teacher_assignments ta ON t.id = ta.teacher_id
      WHERE t.user_id = auth.uid() AND ta.class_id = classes.id
    )
  );

-- Allow teachers to view sections in their assignments
DROP POLICY IF EXISTS "Teachers can view assigned sections" ON public.sections;
CREATE POLICY "Teachers can view assigned sections" ON public.sections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.teachers t
      JOIN public.teacher_assignments ta ON t.id = ta.teacher_id
      WHERE t.user_id = auth.uid() AND ta.section_id = sections.id
    )
  );