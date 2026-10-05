-- Migration: Comprehensive RLS policies for production readiness

-- Fix index typo from admin_roles.sql
DROP INDEX IF EXISTS idx_employees_role;
CREATE INDEX IF NOT EXISTS idx_employees_role ON public.employees(auth_user_id, role);

-- 1. Employees Table
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Employees can view own profile" ON public.employees;
CREATE POLICY "Employees can view own profile"
ON public.employees FOR SELECT TO authenticated
USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all employees" ON public.employees;
CREATE POLICY "Admins can view all employees"
ON public.employees FOR SELECT TO authenticated
USING (
  auth_user_id = auth.uid() OR 
  role IN ('admin', 'super_admin')
);

-- 2. Attendance Table
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Employees can view own attendance" ON public.attendance;
CREATE POLICY "Employees can view own attendance"
ON public.attendance FOR SELECT TO authenticated
USING (
  employee_id IN (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())
);

DROP POLICY IF EXISTS "Admins can view all attendance" ON public.attendance;
CREATE POLICY "Admins can view all attendance"
ON public.attendance FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.employees WHERE auth_user_id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- 3. Leaves Table
ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Employees can view own leaves" ON public.leaves;
CREATE POLICY "Employees can view own leaves"
ON public.leaves FOR SELECT TO authenticated
USING (
  employee_id IN (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())
);

DROP POLICY IF EXISTS "Admins can view all leaves" ON public.leaves;
CREATE POLICY "Admins can view all leaves"
ON public.leaves FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.employees WHERE auth_user_id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- 4. Departments Table
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view departments" ON public.departments;
CREATE POLICY "Authenticated can view departments"
ON public.departments FOR SELECT TO authenticated
USING (true);

-- 5. Work Shifts Table
ALTER TABLE public.work_shifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view work_shifts" ON public.work_shifts;
CREATE POLICY "Authenticated can view work_shifts"
ON public.work_shifts FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can update work_shifts" ON public.work_shifts;
CREATE POLICY "Admins can update work_shifts"
ON public.work_shifts FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.employees WHERE auth_user_id = auth.uid() AND role IN ('admin', 'super_admin'))
);
