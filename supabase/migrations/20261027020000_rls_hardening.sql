-- Migration: 20261027020000_rls_hardening.sql
-- Description: Close the open row-level security policies found in production (October 2026).
--
-- Before: any signed-in user could INSERT/UPDATE every row of employees, attendance and leaves
-- (USING (true) / WITH CHECK (true)), e.g. promote themselves to super_admin, approve their own leave, or
-- edit check-in times; `anon` also held ALL privileges on the HR tables.
--
-- After:
--   * employees, attendance, leaves: employees read only their own rows, admins read all rows,
--     nobody writes directly — all writes go through the skytrack-api Edge Function (service role)
--     or SECURITY DEFINER functions, which are unaffected by these policies.
--   * Write privileges are revoked from anon/authenticated on the HR tables; anon loses all access to them.
--   * public_holidays / public_holiday_branches are left as they are (published holidays stay public).

-- ---------------------------------------------------------------------------
-- 1. Remove the open policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS employees_authenticated_insert ON public.employees;
DROP POLICY IF EXISTS employees_authenticated_update ON public.employees;
DROP POLICY IF EXISTS employees_authenticated_select ON public.employees;
DROP POLICY IF EXISTS attendance_authenticated_insert ON public.attendance;
DROP POLICY IF EXISTS attendance_authenticated_update ON public.attendance;
DROP POLICY IF EXISTS attendance_authenticated_select ON public.attendance;
DROP POLICY IF EXISTS leaves_authenticated_insert ON public.leaves;
DROP POLICY IF EXISTS leaves_authenticated_update ON public.leaves;
DROP POLICY IF EXISTS leaves_authenticated_select ON public.leaves;

-- Older policy names from the repository migrations, in case they exist in this database
DROP POLICY IF EXISTS "Employees can view own profile" ON public.employees;
DROP POLICY IF EXISTS "Admins can view all employees" ON public.employees;
DROP POLICY IF EXISTS "Employees can view own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Admins can view all attendance" ON public.attendance;
DROP POLICY IF EXISTS "Employees can view own leaves" ON public.leaves;
DROP POLICY IF EXISTS "Admins can view all leaves" ON public.leaves;

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2. Read-only policies: own rows, or all rows for active admins
--    is_active_admin() is SECURITY DEFINER, so it does not recurse into the employees policy.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_active_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employees
    WHERE auth_user_id = auth.uid()
      AND status = 'active'
      AND role IN ('admin', 'super_admin')
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_active_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_admin() TO authenticated, service_role;

CREATE POLICY "Employees read own employee row"
ON public.employees FOR SELECT TO authenticated
USING (auth_user_id = auth.uid() OR public.is_active_admin());

CREATE POLICY "Employees read own attendance"
ON public.attendance FOR SELECT TO authenticated
USING (
  employee_id IN (SELECT e.id FROM public.employees e WHERE e.auth_user_id = auth.uid())
  OR public.is_active_admin()
);

CREATE POLICY "Employees read own leaves"
ON public.leaves FOR SELECT TO authenticated
USING (
  employee_id IN (SELECT e.id FROM public.employees e WHERE e.auth_user_id = auth.uid())
  OR public.is_active_admin()
);

-- ---------------------------------------------------------------------------
-- 3. Table privileges (defence in depth; the service role keeps full access)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'employees', 'attendance', 'attendance_breaks', 'leaves', 'employee_leave_balances',
    'leave_accruals', 'leave_balance_transactions', 'departments', 'work_shifts'
  ] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
      EXECUTE format('REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.%I FROM authenticated', t);
      EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
      EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    END IF;
  END LOOP;
END $$;
