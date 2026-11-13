-- Migration: 20261113000000_late_penalty_per_minute.sql
-- Description: Late-arrival penalty options (docs/PAYROLL_PLAN.md §2, decision 20).
--   Admins choose how a late check-in affects pay:
--     * Option 1 'marks'      — the existing rule: every `late_marks_per_unit` late marks
--                               cost `late_lop_days_per_unit` days of pay (2 marks = 0.5 day LOP).
--     * Option 2 'per_minute' — every minute after the employee's shift start (plus the grace in
--                               effect that day) is deducted, for each late day.
--   Per-minute basis:
--     * 'pro_rata' (default) — the minute is worth per_day_rate / the day's shift working minutes,
--                              so the deduction scales with the salary and the shift length.
--     * 'fixed'              — a flat rupee amount per minute set by the admin.
--   Guards: an optional cap on the charged minutes per day, and a day can never be deducted more
--   than that day's own pay.
-- Past days keep the rules recorded on their late mark (shift start, grace, shift length), so changing
-- the settings never re-prices days that have already happened, exactly as in Phase 0.
-- Requires 20261027000000_payroll_foundations.sql and 20261027010000_payroll_salaries.sql.
-- Safe to run more than once.

-- ---------------------------------------------------------------------------
-- 1. Policy columns (both the live row and the history table)
-- ---------------------------------------------------------------------------
ALTER TABLE public.payroll_policy
  ADD COLUMN IF NOT EXISTS late_penalty_mode TEXT NOT NULL DEFAULT 'marks',
  ADD COLUMN IF NOT EXISTS late_per_minute_basis TEXT NOT NULL DEFAULT 'pro_rata',
  ADD COLUMN IF NOT EXISTS late_per_minute_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS late_per_minute_max_minutes_per_day INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.payroll_policy_history
  ADD COLUMN IF NOT EXISTS late_penalty_mode TEXT NOT NULL DEFAULT 'marks',
  ADD COLUMN IF NOT EXISTS late_per_minute_basis TEXT NOT NULL DEFAULT 'pro_rata',
  ADD COLUMN IF NOT EXISTS late_per_minute_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS late_per_minute_max_minutes_per_day INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  ALTER TABLE public.payroll_policy
    ADD CONSTRAINT payroll_policy_late_penalty_mode_check
    CHECK (late_penalty_mode IN ('marks', 'per_minute'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.payroll_policy
    ADD CONSTRAINT payroll_policy_late_per_minute_basis_check
    CHECK (late_per_minute_basis IN ('pro_rata', 'fixed'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.payroll_policy
    ADD CONSTRAINT payroll_policy_late_per_minute_amount_check
    CHECK (late_per_minute_amount >= 0 AND late_per_minute_amount <= 10000);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.payroll_policy
    ADD CONSTRAINT payroll_policy_late_per_minute_cap_check
    CHECK (late_per_minute_max_minutes_per_day BETWEEN 0 AND 1440);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- A flat per-minute amount must actually be set when that basis is chosen
DO $$
BEGIN
  ALTER TABLE public.payroll_policy
    ADD CONSTRAINT payroll_policy_late_fixed_amount_required_check
    CHECK (late_penalty_mode <> 'per_minute' OR late_per_minute_basis <> 'fixed' OR late_per_minute_amount > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN public.payroll_policy.late_penalty_mode IS
  'How a late check-in affects pay: marks = groups of late marks cost LOP days; per_minute = every late minute is deducted.';
COMMENT ON COLUMN public.payroll_policy.late_per_minute_basis IS
  'per_minute mode only: pro_rata = per-day rate / shift working minutes; fixed = late_per_minute_amount rupees per minute.';
COMMENT ON COLUMN public.payroll_policy.late_per_minute_max_minutes_per_day IS
  'per_minute mode only: largest number of late minutes charged on one day; 0 = no cap. A day is never deducted more than its own pay.';

-- ---------------------------------------------------------------------------
-- 2. Shift length on the late mark, so per-minute pricing is frozen per day
-- ---------------------------------------------------------------------------
ALTER TABLE public.attendance_late_marks
  ADD COLUMN IF NOT EXISTS shift_working_minutes INTEGER;

DO $$
BEGIN
  ALTER TABLE public.attendance_late_marks
    ADD CONSTRAINT attendance_late_marks_shift_working_minutes_check
    CHECK (shift_working_minutes IS NULL OR shift_working_minutes > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Back-fill existing rows from the shift that was recorded for the day
UPDATE public.attendance_late_marks m
SET shift_working_minutes = ws.working_minutes
FROM public.work_shifts ws
WHERE m.shift_working_minutes IS NULL AND m.shift_id = ws.id;

-- ---------------------------------------------------------------------------
-- 3. Late-mark trigger: also record the shift length used for that day
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.attendance_record_late_mark()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_policy public.payroll_policy;
  v_existing public.attendance_late_marks;
  v_has_existing BOOLEAN;
  v_shift_id UUID;
  v_shift_start TIME;
  v_shift_minutes INTEGER;
  v_grace INTEGER;
  v_tz TEXT;
  v_local TIMESTAMP;
  v_minutes INTEGER := 0;
  v_reason TEXT;
  v_is_late BOOLEAN := false;
  v_status TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.check_in IS NOT DISTINCT FROM OLD.check_in THEN
    RETURN NULL;
  END IF;

  -- Check-in removed (admin edit): no late mark for this day any more.
  IF NEW.check_in IS NULL THEN
    DELETE FROM public.attendance_late_marks WHERE attendance_id = NEW.id;
    IF NEW.status = 'late' THEN
      UPDATE public.attendance SET status = 'present' WHERE id = NEW.id;
    END IF;
    RETURN NULL;
  END IF;

  SELECT * INTO v_policy FROM public.payroll_policy WHERE id = 1;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_existing FROM public.attendance_late_marks WHERE attendance_id = NEW.id;
  v_has_existing := FOUND;

  IF v_has_existing THEN
    -- Re-decision after an edited check-in keeps the rules of that day.
    v_shift_id := v_existing.shift_id;
    v_shift_start := v_existing.shift_start_time;
    v_shift_minutes := v_existing.shift_working_minutes;
    v_grace := v_existing.grace_minutes;
    v_tz := v_existing.office_timezone;
  ELSE
    SELECT ws.id, ws.start_time, ws.working_minutes
      INTO v_shift_id, v_shift_start, v_shift_minutes
    FROM public.employees e
    JOIN public.work_shifts ws ON ws.id = e.work_shift_id
    WHERE e.id = NEW.employee_id;
    v_grace := v_policy.late_grace_minutes;
    v_tz := v_policy.office_timezone;
  END IF;

  IF EXTRACT(DOW FROM NEW.attendance_date)::SMALLINT = ANY (v_policy.week_off_days)
    OR EXISTS (
      SELECT 1 FROM public.public_holidays h
      WHERE h.holiday_date = NEW.attendance_date AND h.status = 'published'
    ) THEN
    v_reason := 'non_working_day';
  ELSIF v_shift_start IS NULL THEN
    v_reason := 'no_shift';
  ELSE
    -- Minute precision in office local time: 10:00:45 is on time for a 10:00 shift, 10:01 is late.
    v_local := date_trunc('minute', NEW.check_in AT TIME ZONE COALESCE(v_tz, v_policy.office_timezone));
    v_minutes := GREATEST(0, (EXTRACT(EPOCH FROM (v_local - (v_local::DATE + v_shift_start))) / 60)::INTEGER);
    v_is_late := v_minutes > COALESCE(v_grace, 0);
    v_reason := CASE WHEN v_is_late THEN 'late' ELSE 'on_time' END;
  END IF;

  INSERT INTO public.attendance_late_marks AS m (
    attendance_id, employee_id, attendance_date, is_late, minutes_late, reason,
    shift_id, shift_start_time, shift_working_minutes, grace_minutes, office_timezone, check_in,
    decided_source, first_decided_at, decided_at
  ) VALUES (
    NEW.id, NEW.employee_id, NEW.attendance_date, v_is_late, v_minutes, v_reason,
    v_shift_id, v_shift_start, v_shift_minutes, v_grace, v_tz, NEW.check_in,
    CASE WHEN v_has_existing THEN 'edit' ELSE 'initial' END, now(), now()
  )
  ON CONFLICT (attendance_id) DO UPDATE SET
    employee_id = EXCLUDED.employee_id,
    attendance_date = EXCLUDED.attendance_date,
    is_late = EXCLUDED.is_late,
    minutes_late = EXCLUDED.minutes_late,
    reason = EXCLUDED.reason,
    shift_working_minutes = EXCLUDED.shift_working_minutes,
    check_in = EXCLUDED.check_in,
    decided_source = EXCLUDED.decided_source,
    decided_at = EXCLUDED.decided_at;

  -- Keep the existing status column in line; other statuses (leave, half_day, …) are left untouched.
  IF NEW.status IN ('present', 'late', 'absent') THEN
    v_status := CASE WHEN v_is_late THEN 'late' ELSE 'present' END;
    IF v_status IS DISTINCT FROM NEW.status THEN
      UPDATE public.attendance SET status = v_status WHERE id = NEW.id;
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.attendance_record_late_mark() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. save_payroll_policy: the late-penalty option is part of the settings
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.save_payroll_policy(UUID, SMALLINT[], INTEGER, INTEGER, NUMERIC, TEXT, INTEGER);

CREATE OR REPLACE FUNCTION public.save_payroll_policy(
    p_admin_id UUID,
    p_week_off_days SMALLINT[],
    p_late_grace_minutes INTEGER,
    p_late_marks_per_unit INTEGER,
    p_late_lop_days_per_unit NUMERIC,
    p_office_timezone TEXT,
    p_max_break_minutes INTEGER,
    p_late_penalty_mode TEXT DEFAULT 'marks',
    p_late_per_minute_basis TEXT DEFAULT 'pro_rata',
    p_late_per_minute_amount NUMERIC DEFAULT 0,
    p_late_per_minute_max_minutes_per_day INTEGER DEFAULT 0
) RETURNS public.payroll_policy
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_row public.payroll_policy;
  v_days SMALLINT[];
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.employees
    WHERE id = p_admin_id AND status = 'active' AND role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Only active administrators can change payroll settings.' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = p_office_timezone) THEN
    RAISE EXCEPTION 'Unknown timezone: %', p_office_timezone USING ERRCODE = '22023';
  END IF;

  IF p_late_penalty_mode NOT IN ('marks', 'per_minute') THEN
    RAISE EXCEPTION 'Late penalty option must be "marks" or "per_minute".' USING ERRCODE = '22023';
  END IF;

  IF p_late_per_minute_basis NOT IN ('pro_rata', 'fixed') THEN
    RAISE EXCEPTION 'Per-minute basis must be "pro_rata" or "fixed".' USING ERRCODE = '22023';
  END IF;

  IF p_late_penalty_mode = 'per_minute' AND p_late_per_minute_basis = 'fixed'
     AND COALESCE(p_late_per_minute_amount, 0) <= 0 THEN
    RAISE EXCEPTION 'A flat per-minute deduction must be greater than zero.' USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(array_agg(DISTINCT d ORDER BY d), '{}') INTO v_days FROM unnest(p_week_off_days) AS d;

  INSERT INTO public.payroll_policy AS p (
    id, week_off_days, late_grace_minutes, late_marks_per_unit, late_lop_days_per_unit,
    office_timezone, max_break_minutes, late_penalty_mode, late_per_minute_basis,
    late_per_minute_amount, late_per_minute_max_minutes_per_day, updated_by, updated_at
  ) VALUES (
    1, v_days, p_late_grace_minutes, p_late_marks_per_unit, p_late_lop_days_per_unit,
    p_office_timezone, p_max_break_minutes, p_late_penalty_mode, p_late_per_minute_basis,
    round(COALESCE(p_late_per_minute_amount, 0), 2), COALESCE(p_late_per_minute_max_minutes_per_day, 0),
    p_admin_id, now()
  )
  ON CONFLICT (id) DO UPDATE SET
    week_off_days = EXCLUDED.week_off_days,
    late_grace_minutes = EXCLUDED.late_grace_minutes,
    late_marks_per_unit = EXCLUDED.late_marks_per_unit,
    late_lop_days_per_unit = EXCLUDED.late_lop_days_per_unit,
    office_timezone = EXCLUDED.office_timezone,
    max_break_minutes = EXCLUDED.max_break_minutes,
    late_penalty_mode = EXCLUDED.late_penalty_mode,
    late_per_minute_basis = EXCLUDED.late_per_minute_basis,
    late_per_minute_amount = EXCLUDED.late_per_minute_amount,
    late_per_minute_max_minutes_per_day = EXCLUDED.late_per_minute_max_minutes_per_day,
    updated_by = EXCLUDED.updated_by,
    updated_at = EXCLUDED.updated_at
  RETURNING p.* INTO v_row;

  INSERT INTO public.payroll_policy_history (
    week_off_days, late_grace_minutes, late_marks_per_unit, late_lop_days_per_unit,
    office_timezone, max_break_minutes, late_penalty_mode, late_per_minute_basis,
    late_per_minute_amount, late_per_minute_max_minutes_per_day, changed_by, changed_at
  ) VALUES (
    v_row.week_off_days, v_row.late_grace_minutes, v_row.late_marks_per_unit, v_row.late_lop_days_per_unit,
    v_row.office_timezone, v_row.max_break_minutes, v_row.late_penalty_mode, v_row.late_per_minute_basis,
    v_row.late_per_minute_amount, v_row.late_per_minute_max_minutes_per_day, p_admin_id, v_row.updated_at
  );

  RETURN v_row;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.save_payroll_policy(UUID, SMALLINT[], INTEGER, INTEGER, NUMERIC, TEXT, INTEGER, TEXT, TEXT, NUMERIC, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_payroll_policy(UUID, SMALLINT[], INTEGER, INTEGER, NUMERIC, TEXT, INTEGER, TEXT, TEXT, NUMERIC, INTEGER)
  TO service_role;

-- ---------------------------------------------------------------------------
-- 5. compute_payroll(): both late-penalty options
--    Option 1 'marks'      — floor(late marks ÷ marks_per_unit) × lop_days_per_unit days, charged at
--                            the per-day rate in effect at the end of the period (unchanged).
--    Option 2 'per_minute' — for every late day: charged minutes = minutes after the shift start
--                            minus that day's grace, capped by late_per_minute_max_minutes_per_day
--                            (0 = no cap). A minute costs late_per_minute_amount ('fixed') or
--                            that day's per-day rate ÷ that day's shift working minutes ('pro_rata').
--                            A day's late deduction never exceeds the pay still left for that day.
--    Everything else (working days, absences, LOP leave, net pay) is unchanged.
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
  v_day_lop NUMERIC;
  v_has_check_in BOOLEAN;
  v_is_late BOOLEAN;
  v_minutes_late INTEGER;
  v_day_grace INTEGER;
  v_day_shift_minutes INTEGER;
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
  v_late_minutes INTEGER := 0;
  v_late_days_charged INTEGER := 0;
  v_per_minute_mode BOOLEAN;
  v_charge_minutes INTEGER;
  v_minute_rate NUMERIC;
  v_last_minute_rate NUMERIC;
  v_day_late_amount NUMERIC;
  v_day_allowance NUMERIC;
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

  v_per_minute_mode := COALESCE(v_policy.late_penalty_mode, 'marks') = 'per_minute';
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

    v_day_lop := 0;
    IF v_leave_lop ? v_d::TEXT THEN
      v_day_lop := (v_leave_lop ->> v_d::TEXT)::NUMERIC;
      v_lop_leave_days := v_lop_leave_days + v_day_lop;
      v_lop_leave_amount := v_lop_leave_amount + v_rate * v_day_lop;
      v_days := v_days || jsonb_build_object('date', v_d, 'type', 'lop_leave', 'days', v_day_lop,
                                             'amount', round(v_rate * v_day_lop, 2));
    ELSIF v_d < p_as_of AND NOT v_has_check_in AND NOT (v_d::TEXT = ANY (v_leave_dates)) THEN
      v_absence_days := v_absence_days + 1;
      v_absence_amount := v_absence_amount + v_rate;
      v_day_lop := 1;
      v_days := v_days || jsonb_build_object('date', v_d, 'type', 'absent', 'days', 1, 'amount', round(v_rate, 2));
    END IF;

    v_is_late := NULL;
    v_minutes_late := NULL;
    v_day_grace := NULL;
    v_day_shift_minutes := NULL;
    SELECT m.is_late, m.minutes_late, m.grace_minutes, m.shift_working_minutes
      INTO v_is_late, v_minutes_late, v_day_grace, v_day_shift_minutes
    FROM public.attendance_late_marks m
    WHERE m.employee_id = p_employee_id AND m.attendance_date = v_d AND m.is_late
    LIMIT 1;

    IF COALESCE(v_is_late, false) THEN
      v_late_marks := v_late_marks + 1;

      IF NOT v_per_minute_mode THEN
        -- Option 1: the day itself costs nothing; complete groups of marks are charged after the loop.
        v_days := v_days || jsonb_build_object('date', v_d, 'type', 'late', 'days', 0, 'amount', 0,
                                               'minutes', COALESCE(v_minutes_late, 0));
      ELSE
        -- Option 2: charge every minute after the shift start (beyond that day's grace).
        v_charge_minutes := GREATEST(0, COALESCE(v_minutes_late, 0)
                                        - COALESCE(v_day_grace, v_policy.late_grace_minutes, 0));
        IF COALESCE(v_policy.late_per_minute_max_minutes_per_day, 0) > 0 THEN
          v_charge_minutes := LEAST(v_charge_minutes, v_policy.late_per_minute_max_minutes_per_day);
        END IF;

        IF v_policy.late_per_minute_basis = 'fixed' THEN
          v_minute_rate := COALESCE(v_policy.late_per_minute_amount, 0);
        ELSE
          v_minute_rate := v_rate / GREATEST(1, COALESCE(v_day_shift_minutes, 480));
        END IF;

        -- A day can never lose more than the pay it still has left (after LOP leave / absence)
        v_day_allowance := GREATEST(0, v_rate * (1 - LEAST(1, v_day_lop)));
        v_day_late_amount := LEAST(v_charge_minutes * v_minute_rate, v_day_allowance);

        IF v_charge_minutes > 0 THEN
          v_late_minutes := v_late_minutes + v_charge_minutes;
          v_last_minute_rate := v_minute_rate;
          IF v_day_late_amount > 0 THEN
            v_late_days_charged := v_late_days_charged + 1;
          END IF;
        END IF;
        v_late_amount := v_late_amount + v_day_late_amount;

        v_days := v_days || jsonb_build_object(
          'date', v_d, 'type', 'late',
          'days', CASE WHEN v_rate > 0 THEN round(v_day_late_amount / v_rate, 4) ELSE 0 END,
          'amount', round(v_day_late_amount, 2),
          'minutes', v_charge_minutes
        );
      END IF;
    END IF;

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

  IF v_per_minute_mode THEN
    -- Equivalent days, for the payslip's "total LOP days" line only
    v_late_lop_days := CASE WHEN v_last_rate > 0 THEN round(v_late_amount / v_last_rate, 2) ELSE 0 END;
  ELSE
    v_late_lop_days := floor(v_late_marks::NUMERIC / v_policy.late_marks_per_unit) * v_policy.late_lop_days_per_unit;
    v_late_amount := v_late_lop_days * v_last_rate;
  END IF;

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
    'late_penalty_mode', COALESCE(v_policy.late_penalty_mode, 'marks'),
    'late_marks', v_late_marks,
    'late_marks_per_unit', v_policy.late_marks_per_unit,
    'late_lop_days_per_unit', v_policy.late_lop_days_per_unit,
    'late_minutes', v_late_minutes,
    'late_days_charged', v_late_days_charged,
    'late_per_minute_basis', v_policy.late_per_minute_basis,
    'late_per_minute_amount', v_policy.late_per_minute_amount,
    'late_per_minute_rate', CASE WHEN v_per_minute_mode THEN round(COALESCE(v_last_minute_rate, 0), 4) ELSE NULL END,
    'late_per_minute_max_minutes_per_day', v_policy.late_per_minute_max_minutes_per_day,
    'late_grace_minutes', v_policy.late_grace_minutes,
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

REVOKE EXECUTE ON FUNCTION public.compute_payroll(UUID, DATE, DATE) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.compute_payroll(UUID, DATE, DATE) TO service_role;
