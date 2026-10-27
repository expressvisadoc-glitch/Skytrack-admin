-- Migration: 20261027010000_payroll_salaries.sql
-- Description: Payroll Phase 1 (docs/PAYROLL_PLAN.md).
--   * salary_structures: monthly gross per employee, effective from a date. Rows are never edited or deleted;
--     a new row supersedes older ones from its effective date (same date: the newest row wins).
--   * add_salary_structure(): admin-only insert.
--   * compute_payroll(): the single salary calculation used by the employee card and the admin views.
-- Requires 20261027000000_payroll_foundations.sql.

-- ---------------------------------------------------------------------------
-- 1. Salary structures
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.salary_structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    monthly_gross NUMERIC(12, 2) NOT NULL CHECK (monthly_gross > 0 AND monthly_gross <= 10000000),
    effective_from DATE NOT NULL,
    note TEXT CHECK (note IS NULL OR char_length(note) <= 200),
    created_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    -- Actual insert time (not transaction start) so "newest row wins" is unambiguous
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_salary_structures_employee_effective
ON public.salary_structures(employee_id, effective_from DESC, created_at DESC);

ALTER TABLE public.salary_structures ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.salary_structures FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.salary_structures TO authenticated;
GRANT ALL ON public.salary_structures TO service_role;

DROP POLICY IF EXISTS "Employees can view own salary" ON public.salary_structures;
CREATE POLICY "Employees can view own salary"
ON public.salary_structures FOR SELECT TO authenticated
USING (
  employee_id IN (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())
);

DROP POLICY IF EXISTS "Admins can view all salaries" ON public.salary_structures;
CREATE POLICY "Admins can view all salaries"
ON public.salary_structures FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.employees WHERE auth_user_id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- ---------------------------------------------------------------------------
-- 2. Add a salary (admin only)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.add_salary_structure(
    p_admin_id UUID,
    p_employee_id UUID,
    p_monthly_gross NUMERIC,
    p_effective_from DATE,
    p_note TEXT DEFAULT NULL
) RETURNS public.salary_structures
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_row public.salary_structures;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.employees
    WHERE id = p_admin_id
      AND status = 'active'
      AND role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Only active administrators can change salaries.' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.employees WHERE id = p_employee_id) THEN
    RAISE EXCEPTION 'Employee not found.' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.salary_structures (employee_id, monthly_gross, effective_from, note, created_by)
  VALUES (p_employee_id, round(p_monthly_gross, 2), p_effective_from, NULLIF(btrim(p_note), ''), p_admin_id)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Salary calculation
--    Returns jsonb with the month summary, deductions and per-day reasons. Rules (docs/PAYROLL_PLAN.md §2):
--    * working day   = not a payroll_policy week-off and not a published public holiday
--    * per-day rate  = monthly gross in effect that day ÷ working days in the month
--    * earned gross  = sum of per-day rates over working days on/after joining_date with a salary in effect
--    * absence       = completed working day (< p_as_of) with no check-in and no approved leave → 1 day
--    * LOP leave     = approved leaves; the paid days are placed on the leave's first working days, LOP after
--    * late          = late marks on working days; floor(marks ÷ marks_per_unit) × lop_days_per_unit days,
--                      charged at the per-day rate in effect at the end of the period
--    * net           = earned gross − deductions, never below 0, rounded to the rupee
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.compute_payroll(
    p_employee_id UUID,
    p_month DATE,
    p_as_of DATE DEFAULT current_date
) RETURNS JSONB
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_month_start DATE := date_trunc('month', p_month)::DATE;
  v_month_end DATE := (date_trunc('month', p_month) + INTERVAL '1 month - 1 day')::DATE;
  v_period_end DATE;
  v_emp public.employees;
  v_policy public.payroll_policy;
  v_employed_from DATE;
  v_working_days INTEGER;
  v_flags TEXT[] := '{}';
  v_days JSONB := '[]';
  v_leave_lop JSONB := '{}';
  v_leave_dates TEXT[] := '{}';
  v_leave RECORD;
  v_d DATE;
  v_is_working BOOLEAN;
  v_gross NUMERIC;
  v_rate NUMERIC;
  v_last_gross NUMERIC;
  v_last_rate NUMERIC;
  v_remaining_paid NUMERIC;
  v_remaining_lop NUMERIC;
  v_day_total NUMERIC;
  v_paid_part NUMERIC;
  v_lop_part NUMERIC;
  v_has_check_in BOOLEAN;
  v_is_late BOOLEAN;
  v_earned NUMERIC := 0;
  v_employed_working_days INTEGER := 0;
  v_paid_working_days INTEGER := 0;
  v_completed_working_days INTEGER := 0;
  v_present_days INTEGER := 0;
  v_unsalaried_days INTEGER := 0;
  v_absence_days NUMERIC := 0;
  v_absence_amount NUMERIC := 0;
  v_lop_leave_days NUMERIC := 0;
  v_lop_leave_amount NUMERIC := 0;
  v_late_marks INTEGER := 0;
  v_late_lop_days NUMERIC := 0;
  v_late_amount NUMERIC := 0;
  v_total_deductions NUMERIC;
  v_net NUMERIC;
BEGIN
  SELECT * INTO v_emp FROM public.employees WHERE id = p_employee_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Employee not found.' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_policy FROM public.payroll_policy WHERE id = 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payroll settings are missing.' USING ERRCODE = 'P0002';
  END IF;

  v_period_end := LEAST(v_month_end, GREATEST(p_as_of, v_month_start));
  v_employed_from := v_emp.joining_date;
  IF v_employed_from IS NULL THEN
    v_flags := array_append(v_flags, 'joining_date_missing');
  END IF;

  -- Working days in the whole month (the divisor)
  SELECT count(*) INTO v_working_days
  FROM generate_series(v_month_start, v_month_end, INTERVAL '1 day') AS g(d)
  WHERE NOT (EXTRACT(DOW FROM g.d)::SMALLINT = ANY (v_policy.week_off_days))
    AND NOT EXISTS (
      SELECT 1 FROM public.public_holidays h WHERE h.holiday_date = g.d::DATE AND h.status = 'published'
    );

  IF v_working_days = 0 THEN
    RETURN jsonb_build_object('status', 'no_working_days', 'month', to_char(v_month_start, 'YYYY-MM'));
  END IF;

  IF v_employed_from IS NOT NULL AND v_employed_from > v_month_end THEN
    RETURN jsonb_build_object('status', 'not_employed', 'month', to_char(v_month_start, 'YYYY-MM'),
                              'joining_date', v_employed_from);
  END IF;

  -- Place approved leave days on dates: paid days first, then LOP, over the leave's working days
  FOR v_leave IN
    SELECT l.from_date, l.to_date, l.leave_days, l.paid_leave_days, l.lop_days
    FROM public.leaves l
    WHERE l.employee_id = p_employee_id
      AND l.status = 'approved'
      AND l.from_date <= v_month_end
      AND l.to_date >= v_month_start
  LOOP
    IF COALESCE(v_leave.paid_leave_days, 0) + COALESCE(v_leave.lop_days, 0) > 0 THEN
      v_remaining_paid := COALESCE(v_leave.paid_leave_days, 0);
      v_remaining_lop := COALESCE(v_leave.lop_days, 0);
    ELSE
      -- Legacy rows without a paid/LOP split are treated as paid
      v_remaining_paid := GREATEST(COALESCE(v_leave.leave_days, 0), (v_leave.to_date - v_leave.from_date) + 1);
      v_remaining_lop := 0;
    END IF;

    FOR v_d IN
      SELECT g.d::DATE
      FROM generate_series(v_leave.from_date, v_leave.to_date, INTERVAL '1 day') AS g(d)
      WHERE NOT (EXTRACT(DOW FROM g.d)::SMALLINT = ANY (v_policy.week_off_days))
        AND NOT EXISTS (
          SELECT 1 FROM public.public_holidays h WHERE h.holiday_date = g.d::DATE AND h.status = 'published'
        )
      ORDER BY 1
    LOOP
      EXIT WHEN v_remaining_paid + v_remaining_lop <= 0;
      v_day_total := LEAST(1, v_remaining_paid + v_remaining_lop);
      v_paid_part := LEAST(v_day_total, v_remaining_paid);
      v_lop_part := LEAST(v_day_total - v_paid_part, v_remaining_lop);
      v_remaining_paid := v_remaining_paid - v_paid_part;
      v_remaining_lop := v_remaining_lop - v_lop_part;

      IF v_d BETWEEN v_month_start AND v_month_end THEN
        v_leave_dates := array_append(v_leave_dates, v_d::TEXT);
        IF v_lop_part > 0 THEN
          v_leave_lop := jsonb_set(v_leave_lop, ARRAY[v_d::TEXT],
            to_jsonb(COALESCE((v_leave_lop ->> v_d::TEXT)::NUMERIC, 0) + v_lop_part));
        END IF;
      END IF;
    END LOOP;
  END LOOP;

  -- Walk the month
  FOR v_d IN SELECT g.d::DATE FROM generate_series(v_month_start, v_month_end, INTERVAL '1 day') AS g(d) LOOP
    v_is_working := NOT (EXTRACT(DOW FROM v_d)::SMALLINT = ANY (v_policy.week_off_days))
      AND NOT EXISTS (
        SELECT 1 FROM public.public_holidays h WHERE h.holiday_date = v_d AND h.status = 'published'
      );

    CONTINUE WHEN NOT v_is_working;
    CONTINUE WHEN v_employed_from IS NOT NULL AND v_d < v_employed_from;

    v_employed_working_days := v_employed_working_days + 1;

    SELECT s.monthly_gross INTO v_gross
    FROM public.salary_structures s
    WHERE s.employee_id = p_employee_id AND s.effective_from <= v_d
    ORDER BY s.effective_from DESC, s.created_at DESC
    LIMIT 1;

    IF v_gross IS NULL THEN
      v_unsalaried_days := v_unsalaried_days + 1;
      CONTINUE;
    END IF;

    v_rate := v_gross / v_working_days;
    v_paid_working_days := v_paid_working_days + 1;
    v_earned := v_earned + v_rate;
    IF v_d <= v_period_end THEN
      v_last_gross := v_gross;
      v_last_rate := v_rate;
    END IF;

    SELECT a.check_in IS NOT NULL INTO v_has_check_in
    FROM public.attendance a
    WHERE a.employee_id = p_employee_id AND a.attendance_date = v_d;
    v_has_check_in := COALESCE(v_has_check_in, false);

    IF v_d < p_as_of THEN
      v_completed_working_days := v_completed_working_days + 1;
    END IF;
    IF v_has_check_in THEN
      v_present_days := v_present_days + 1;
    END IF;

    IF v_leave_lop ? v_d::TEXT THEN
      v_lop_part := (v_leave_lop ->> v_d::TEXT)::NUMERIC;
      v_lop_leave_days := v_lop_leave_days + v_lop_part;
      v_lop_leave_amount := v_lop_leave_amount + v_rate * v_lop_part;
      v_days := v_days || jsonb_build_object('date', v_d, 'type', 'lop_leave', 'days', v_lop_part,
                                             'amount', round(v_rate * v_lop_part, 2));
    ELSIF v_d < p_as_of AND NOT v_has_check_in AND NOT (v_d::TEXT = ANY (v_leave_dates)) THEN
      v_absence_days := v_absence_days + 1;
      v_absence_amount := v_absence_amount + v_rate;
      v_days := v_days || jsonb_build_object('date', v_d, 'type', 'absent', 'days', 1, 'amount', round(v_rate, 2));
    END IF;

    SELECT m.is_late INTO v_is_late
    FROM public.attendance_late_marks m
    WHERE m.employee_id = p_employee_id AND m.attendance_date = v_d AND m.is_late;
    IF COALESCE(v_is_late, false) THEN
      v_late_marks := v_late_marks + 1;
      v_days := v_days || jsonb_build_object('date', v_d, 'type', 'late', 'days', 0, 'amount', 0);
    END IF;
    v_is_late := NULL;
    v_has_check_in := NULL;
  END LOOP;

  IF v_paid_working_days = 0 THEN
    RETURN jsonb_build_object(
      'status', 'no_salary',
      'month', to_char(v_month_start, 'YYYY-MM'),
      'working_days_in_month', v_working_days,
      'flags', to_jsonb(array_append(v_flags, 'salary_not_set'))
    );
  END IF;

  IF v_unsalaried_days > 0 THEN
    v_flags := array_append(v_flags, 'salary_starts_mid_month');
  END IF;

  -- Rate for late deductions: salary in effect at the end of the period (falls back to the first salaried day)
  IF v_last_rate IS NULL THEN
    SELECT s.monthly_gross INTO v_last_gross
    FROM public.salary_structures s
    WHERE s.employee_id = p_employee_id AND s.effective_from <= v_month_end
    ORDER BY s.effective_from DESC, s.created_at DESC
    LIMIT 1;
    v_last_rate := v_last_gross / v_working_days;
  END IF;

  v_late_lop_days := floor(v_late_marks::NUMERIC / v_policy.late_marks_per_unit) * v_policy.late_lop_days_per_unit;
  v_late_amount := v_late_lop_days * v_last_rate;

  v_total_deductions := v_absence_amount + v_lop_leave_amount + v_late_amount;
  v_net := GREATEST(0, round(v_earned - v_total_deductions));

  RETURN jsonb_build_object(
    'status', 'ok',
    'month', to_char(v_month_start, 'YYYY-MM'),
    'as_of', p_as_of,
    'is_complete', p_as_of > v_month_end,
    'monthly_gross', v_last_gross,
    'working_days_in_month', v_working_days,
    'employed_working_days', v_employed_working_days,
    'paid_working_days', v_paid_working_days,
    'completed_working_days', v_completed_working_days,
    'present_days', v_present_days,
    'per_day_rate', round(v_last_rate, 2),
    'earned_gross', round(v_earned, 2),
    'absence_days', v_absence_days,
    'absence_amount', round(v_absence_amount, 2),
    'lop_leave_days', v_lop_leave_days,
    'lop_leave_amount', round(v_lop_leave_amount, 2),
    'late_marks', v_late_marks,
    'late_marks_per_unit', v_policy.late_marks_per_unit,
    'late_lop_days_per_unit', v_policy.late_lop_days_per_unit,
    'late_lop_days', v_late_lop_days,
    'late_amount', round(v_late_amount, 2),
    'total_lop_days', v_absence_days + v_lop_leave_days + v_late_lop_days,
    'total_deductions', round(v_total_deductions, 2),
    'net_pay', v_net,
    'joining_date', v_employed_from,
    'flags', to_jsonb(v_flags),
    'days', v_days
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Function privileges (service role only)
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.add_salary_structure(UUID, UUID, NUMERIC, DATE, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_salary_structure(UUID, UUID, NUMERIC, DATE, TEXT) TO service_role;
REVOKE EXECUTE ON FUNCTION public.compute_payroll(UUID, DATE, DATE) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.compute_payroll(UUID, DATE, DATE) TO service_role;
