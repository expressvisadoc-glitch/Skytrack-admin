-- Migration: 20261027030000_payroll_runs.sql
-- Description: Payroll Phase 2 (docs/PAYROLL_PLAN.md §5.3) — month close.
--   * payroll_runs: one row per month, open or locked, with the current payslip version
--   * payroll_run_events: audit trail of every lock / reopen (who, when, reason)
--   * payslips: frozen figures per employee, month and version (never edited or deleted)
--   * lock_payroll_month() / reopen_payroll_month(): admin-only, atomic
--   * Guards: while a month is locked, changes that would alter its pay are refused with SQLSTATE 'PLOCK'
--     (attendance on its dates, approved leave overlapping it, published holidays on its dates, and salaries
--     effective on or before its last day).
-- Requires 20261027010000_payroll_salaries.sql.

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payroll_runs (
    month DATE PRIMARY KEY CHECK (month = date_trunc('month', month)::DATE),
    status TEXT NOT NULL CHECK (status IN ('open', 'locked')),
    current_version INTEGER NOT NULL DEFAULT 0 CHECK (current_version >= 0),
    locked_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    locked_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payroll_run_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    month DATE NOT NULL REFERENCES public.payroll_runs(month) ON DELETE CASCADE,
    event TEXT NOT NULL CHECK (event IN ('locked', 'reopened')),
    version INTEGER NOT NULL,
    reason TEXT CHECK (reason IS NULL OR char_length(reason) <= 500),
    payslip_count INTEGER,
    skipped JSONB,
    actor UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_payroll_run_events_month ON public.payroll_run_events(month, created_at DESC);

CREATE TABLE IF NOT EXISTS public.payslips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- RESTRICT: payroll records outlive employee deletion attempts (set the employee inactive instead)
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
    month DATE NOT NULL REFERENCES public.payroll_runs(month) ON DELETE RESTRICT,
    version INTEGER NOT NULL CHECK (version >= 1),
    payslip_number TEXT NOT NULL UNIQUE,
    monthly_gross NUMERIC(12, 2) NOT NULL,
    total_deductions NUMERIC(12, 2) NOT NULL,
    net_pay NUMERIC(12, 2) NOT NULL,
    snapshot JSONB NOT NULL,
    generated_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    UNIQUE (employee_id, month, version)
);

CREATE INDEX IF NOT EXISTS idx_payslips_employee_month ON public.payslips(employee_id, month DESC, version DESC);

-- ---------------------------------------------------------------------------
-- 2. Row Level Security: employees read their own payslips for locked months; admins read all.
--    Writes only through the functions below (service role).
-- ---------------------------------------------------------------------------
ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_run_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.payroll_runs FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.payroll_run_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.payslips FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.payroll_runs TO authenticated;
GRANT SELECT ON public.payroll_run_events TO authenticated;
GRANT SELECT ON public.payslips TO authenticated;
GRANT ALL ON public.payroll_runs TO service_role;
GRANT ALL ON public.payroll_run_events TO service_role;
GRANT ALL ON public.payslips TO service_role;

DROP POLICY IF EXISTS "Authenticated read payroll runs" ON public.payroll_runs;
CREATE POLICY "Authenticated read payroll runs"
ON public.payroll_runs FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admins read payroll run events" ON public.payroll_run_events;
CREATE POLICY "Admins read payroll run events"
ON public.payroll_run_events FOR SELECT TO authenticated
USING (public.is_active_admin());

DROP POLICY IF EXISTS "Employees read own locked payslips" ON public.payslips;
CREATE POLICY "Employees read own locked payslips"
ON public.payslips FOR SELECT TO authenticated
USING (
  public.is_active_admin()
  OR (
    employee_id IN (SELECT e.id FROM public.employees e WHERE e.auth_user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.payroll_runs r
      WHERE r.month = payslips.month AND r.status = 'locked' AND r.current_version = payslips.version
    )
  )
);

-- ---------------------------------------------------------------------------
-- 3. Lock check helper
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.payroll_locked_month_between(p_from DATE, p_to DATE)
RETURNS DATE
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- First locked month overlapping [p_from, p_to], or NULL
  SELECT r.month FROM public.payroll_runs r
  WHERE r.status = 'locked'
    AND r.month <= date_trunc('month', p_to)::DATE
    AND (r.month + INTERVAL '1 month - 1 day')::DATE >= p_from
  ORDER BY r.month
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.payroll_raise_locked(p_month DATE)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Payroll for % is locked. Reopen it on the Payroll page before making changes.',
    to_char(p_month, 'FMMonth YYYY')
    USING ERRCODE = 'PLOCK';
END;
$$;

-- Used before deleting an employee: payslips or attendance in a locked month must be kept
CREATE OR REPLACE FUNCTION public.employee_has_payroll_records(p_employee_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.payslips p WHERE p.employee_id = p_employee_id)
      OR EXISTS (
        SELECT 1 FROM public.attendance a
        JOIN public.payroll_runs r
          ON r.status = 'locked' AND a.attendance_date BETWEEN r.month AND (r.month + INTERVAL '1 month - 1 day')::DATE
        WHERE a.employee_id = p_employee_id
      );
$$;

-- ---------------------------------------------------------------------------
-- 4. Guards
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.payroll_guard_attendance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month DATE;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    v_month := public.payroll_locked_month_between(OLD.attendance_date, OLD.attendance_date);
    IF v_month IS NOT NULL THEN PERFORM public.payroll_raise_locked(v_month); END IF;
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    v_month := public.payroll_locked_month_between(NEW.attendance_date, NEW.attendance_date);
    IF v_month IS NOT NULL THEN PERFORM public.payroll_raise_locked(v_month); END IF;
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE OR REPLACE FUNCTION public.payroll_guard_leaves()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month DATE;
BEGIN
  -- Only approved leave affects pay: block when an approved leave over a locked month is created,
  -- changed, cancelled or removed, or when a leave over a locked month becomes approved.
  IF TG_OP IN ('UPDATE', 'DELETE') AND OLD.status = 'approved'
     AND (TG_OP = 'DELETE' OR ROW(NEW.status, NEW.from_date, NEW.to_date, NEW.leave_days, NEW.paid_leave_days, NEW.lop_days)
          IS DISTINCT FROM ROW(OLD.status, OLD.from_date, OLD.to_date, OLD.leave_days, OLD.paid_leave_days, OLD.lop_days)) THEN
    v_month := public.payroll_locked_month_between(OLD.from_date, OLD.to_date);
    IF v_month IS NOT NULL THEN PERFORM public.payroll_raise_locked(v_month); END IF;
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.status = 'approved'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'approved'
          OR ROW(NEW.from_date, NEW.to_date, NEW.leave_days, NEW.paid_leave_days, NEW.lop_days)
             IS DISTINCT FROM ROW(OLD.from_date, OLD.to_date, OLD.leave_days, OLD.paid_leave_days, OLD.lop_days)) THEN
    v_month := public.payroll_locked_month_between(NEW.from_date, NEW.to_date);
    IF v_month IS NOT NULL THEN PERFORM public.payroll_raise_locked(v_month); END IF;
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE OR REPLACE FUNCTION public.payroll_guard_holidays()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month DATE;
BEGIN
  -- Only published holidays change working days
  IF TG_OP IN ('UPDATE', 'DELETE') AND OLD.status = 'published'
     AND (TG_OP = 'DELETE' OR NEW.status IS DISTINCT FROM 'published' OR NEW.holiday_date IS DISTINCT FROM OLD.holiday_date) THEN
    v_month := public.payroll_locked_month_between(OLD.holiday_date, OLD.holiday_date);
    IF v_month IS NOT NULL THEN PERFORM public.payroll_raise_locked(v_month); END IF;
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.status = 'published'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'published' OR NEW.holiday_date IS DISTINCT FROM OLD.holiday_date) THEN
    v_month := public.payroll_locked_month_between(NEW.holiday_date, NEW.holiday_date);
    IF v_month IS NOT NULL THEN PERFORM public.payroll_raise_locked(v_month); END IF;
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE OR REPLACE FUNCTION public.payroll_guard_salaries()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month DATE;
BEGIN
  -- A salary effective on or before the last day of a locked month could change that month's pay
  SELECT r.month INTO v_month FROM public.payroll_runs r
  WHERE r.status = 'locked' AND (r.month + INTERVAL '1 month - 1 day')::DATE >= NEW.effective_from
  ORDER BY r.month DESC
  LIMIT 1;
  IF v_month IS NOT NULL THEN PERFORM public.payroll_raise_locked(v_month); END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payroll_guard_attendance ON public.attendance;
CREATE TRIGGER payroll_guard_attendance
BEFORE INSERT OR UPDATE OR DELETE ON public.attendance
FOR EACH ROW EXECUTE FUNCTION public.payroll_guard_attendance();

DROP TRIGGER IF EXISTS payroll_guard_leaves ON public.leaves;
CREATE TRIGGER payroll_guard_leaves
BEFORE INSERT OR UPDATE OR DELETE ON public.leaves
FOR EACH ROW EXECUTE FUNCTION public.payroll_guard_leaves();

DROP TRIGGER IF EXISTS payroll_guard_holidays ON public.public_holidays;
CREATE TRIGGER payroll_guard_holidays
BEFORE INSERT OR UPDATE OR DELETE ON public.public_holidays
FOR EACH ROW EXECUTE FUNCTION public.payroll_guard_holidays();

DROP TRIGGER IF EXISTS payroll_guard_salaries ON public.salary_structures;
CREATE TRIGGER payroll_guard_salaries
BEFORE INSERT ON public.salary_structures
FOR EACH ROW EXECUTE FUNCTION public.payroll_guard_salaries();

-- ---------------------------------------------------------------------------
-- 5. Lock / reopen
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lock_payroll_month(p_admin_id UUID, p_month DATE)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_month DATE := date_trunc('month', p_month)::DATE;
  v_month_end DATE := (date_trunc('month', p_month) + INTERVAL '1 month - 1 day')::DATE;
  v_run public.payroll_runs;
  v_version INTEGER;
  v_emp RECORD;
  v_result JSONB;
  v_snapshot JSONB;
  v_count INTEGER := 0;
  v_skipped JSONB := '[]';
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.employees WHERE id = p_admin_id AND status = 'active' AND role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Only active administrators can lock payroll.' USING ERRCODE = '42501';
  END IF;

  IF v_month_end >= current_date THEN
    RAISE EXCEPTION 'Payroll for % can be locked only after the month has ended.', to_char(v_month, 'FMMonth YYYY')
      USING ERRCODE = '22023';
  END IF;

  -- Serialise lock / reopen for the same month
  PERFORM pg_advisory_xact_lock(hashtextextended('skytrack_payroll:' || v_month::TEXT, 0));

  SELECT * INTO v_run FROM public.payroll_runs WHERE month = v_month FOR UPDATE;
  IF FOUND AND v_run.status = 'locked' THEN
    RAISE EXCEPTION 'Payroll for % is already locked.', to_char(v_month, 'FMMonth YYYY') USING ERRCODE = 'PLOCK';
  END IF;

  v_version := COALESCE(v_run.current_version, 0) + 1;

  INSERT INTO public.payroll_runs (month, status, current_version, locked_by, locked_at, updated_at)
  VALUES (v_month, 'locked', v_version, p_admin_id, clock_timestamp(), clock_timestamp())
  ON CONFLICT (month) DO UPDATE SET
    status = 'locked', current_version = v_version, locked_by = p_admin_id,
    locked_at = clock_timestamp(), updated_at = clock_timestamp();

  -- Same population as the Payroll page: active employees plus anyone with attendance that month
  FOR v_emp IN
    SELECT e.id, e.employee_id, e.name, e.designation, e.joining_date,
           COALESCE(d.department_name, e.department) AS department_name
    FROM public.employees e
    LEFT JOIN public.departments d ON d.id = e.department_id
    WHERE e.status = 'active'
       OR EXISTS (SELECT 1 FROM public.attendance a WHERE a.employee_id = e.id AND a.attendance_date BETWEEN v_month AND v_month_end)
    ORDER BY e.name
  LOOP
    v_result := public.compute_payroll(v_emp.id, v_month, v_month_end + 1);

    IF v_result->>'status' <> 'ok' THEN
      v_skipped := v_skipped || jsonb_build_object('employee_id', v_emp.employee_id, 'name', v_emp.name, 'status', v_result->>'status');
      CONTINUE;
    END IF;

    v_snapshot := v_result || jsonb_build_object(
      'company_name', 'Skypass Visa Services',
      'employee', jsonb_build_object(
        'id', v_emp.id, 'employee_id', v_emp.employee_id, 'name', v_emp.name,
        'designation', v_emp.designation, 'department', v_emp.department_name, 'joining_date', v_emp.joining_date
      ),
      'version', v_version
    );

    INSERT INTO public.payslips (
      employee_id, month, version, payslip_number, monthly_gross, total_deductions, net_pay, snapshot, generated_by
    ) VALUES (
      v_emp.id, v_month, v_version,
      format('PS-%s-%s-V%s', to_char(v_month, 'YYYYMM'), upper(regexp_replace(v_emp.employee_id, '[^A-Za-z0-9]', '', 'g')), v_version),
      (v_result->>'monthly_gross')::NUMERIC, (v_result->>'total_deductions')::NUMERIC, (v_result->>'net_pay')::NUMERIC,
      v_snapshot, p_admin_id
    );
    v_count := v_count + 1;
  END LOOP;

  INSERT INTO public.payroll_run_events (month, event, version, payslip_count, skipped, actor)
  VALUES (v_month, 'locked', v_version, v_count, v_skipped, p_admin_id);

  RETURN jsonb_build_object('month', to_char(v_month, 'YYYY-MM'), 'version', v_version,
                            'payslip_count', v_count, 'skipped', v_skipped);
END;
$$;

CREATE OR REPLACE FUNCTION public.reopen_payroll_month(p_admin_id UUID, p_month DATE, p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_month DATE := date_trunc('month', p_month)::DATE;
  v_run public.payroll_runs;
  v_reason TEXT := btrim(COALESCE(p_reason, ''));
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.employees WHERE id = p_admin_id AND status = 'active' AND role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Only active administrators can reopen payroll.' USING ERRCODE = '42501';
  END IF;

  IF char_length(v_reason) < 5 OR char_length(v_reason) > 500 THEN
    RAISE EXCEPTION 'A reason of 5 to 500 characters is required to reopen payroll.' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('skytrack_payroll:' || v_month::TEXT, 0));

  SELECT * INTO v_run FROM public.payroll_runs WHERE month = v_month FOR UPDATE;
  IF NOT FOUND OR v_run.status <> 'locked' THEN
    RAISE EXCEPTION 'Payroll for % is not locked.', to_char(v_month, 'FMMonth YYYY') USING ERRCODE = '22023';
  END IF;

  UPDATE public.payroll_runs SET status = 'open', updated_at = clock_timestamp() WHERE month = v_month;

  INSERT INTO public.payroll_run_events (month, event, version, reason, actor)
  VALUES (v_month, 'reopened', v_run.current_version, v_reason, p_admin_id);

  RETURN jsonb_build_object('month', to_char(v_month, 'YYYY-MM'), 'version', v_run.current_version);
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. Function privileges (service role only)
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.lock_payroll_month(UUID, DATE) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lock_payroll_month(UUID, DATE) TO service_role;
REVOKE EXECUTE ON FUNCTION public.reopen_payroll_month(UUID, DATE, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reopen_payroll_month(UUID, DATE, TEXT) TO service_role;
REVOKE EXECUTE ON FUNCTION public.payroll_locked_month_between(DATE, DATE) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.payroll_locked_month_between(DATE, DATE) TO service_role;
REVOKE EXECUTE ON FUNCTION public.employee_has_payroll_records(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.employee_has_payroll_records(UUID) TO service_role;
REVOKE EXECUTE ON FUNCTION public.payroll_raise_locked(DATE) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.payroll_guard_attendance() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.payroll_guard_leaves() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.payroll_guard_holidays() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.payroll_guard_salaries() FROM PUBLIC, anon, authenticated;
