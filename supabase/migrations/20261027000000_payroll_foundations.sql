-- Migration: 20261027000000_payroll_foundations.sql
-- Description: Payroll Phase 0 (docs/PAYROLL_PLAN.md).
--   * payroll_policy: admin-editable payroll settings (week-off days, late grace, late conversion, office timezone)
--   * attendance_late_marks: late decision per attendance day, taken when the check-in is set and re-taken only
--     when the check-in time is edited. The shift start, grace and timezone in effect at the first decision are
--     kept, so later shift changes apply to future days only.
--   * A trigger on attendance applies this to every writer (mobile/web check-in, admin manual attendance) and keeps
--     attendance.status ('late' / 'present') in line with the decision.
-- Existing attendance rows are not back-filled.

-- ---------------------------------------------------------------------------
-- 1. Payroll policy (single row, id = 1) + change history
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payroll_policy (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    -- Day-of-week numbers as in EXTRACT(DOW): 0 = Sunday … 6 = Saturday
    week_off_days SMALLINT[] NOT NULL DEFAULT '{0}'
        CHECK (week_off_days <@ ARRAY[0, 1, 2, 3, 4, 5, 6]::SMALLINT[] AND cardinality(week_off_days) <= 6),
    late_grace_minutes INTEGER NOT NULL DEFAULT 0 CHECK (late_grace_minutes BETWEEN 0 AND 240),
    late_marks_per_unit INTEGER NOT NULL DEFAULT 2 CHECK (late_marks_per_unit BETWEEN 1 AND 31),
    late_lop_days_per_unit NUMERIC(3, 2) NOT NULL DEFAULT 0.5
        CHECK (late_lop_days_per_unit > 0 AND late_lop_days_per_unit <= 1),
    office_timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata' CHECK (char_length(office_timezone) BETWEEN 1 AND 64),
    updated_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Starting values agreed in docs/PAYROLL_PLAN.md; admins change them from the Payroll Settings page.
INSERT INTO public.payroll_policy (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.payroll_policy_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    week_off_days SMALLINT[] NOT NULL,
    late_grace_minutes INTEGER NOT NULL,
    late_marks_per_unit INTEGER NOT NULL,
    late_lop_days_per_unit NUMERIC(3, 2) NOT NULL,
    office_timezone TEXT NOT NULL,
    changed_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payroll_policy_history_changed_at
ON public.payroll_policy_history(changed_at DESC);

-- ---------------------------------------------------------------------------
-- 2. Late marks (one row per attendance day with a check-in)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attendance_late_marks (
    attendance_id UUID PRIMARY KEY REFERENCES public.attendance(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    is_late BOOLEAN NOT NULL,
    minutes_late INTEGER NOT NULL DEFAULT 0 CHECK (minutes_late >= 0),
    reason TEXT NOT NULL CHECK (reason IN ('late', 'on_time', 'no_shift', 'non_working_day')),
    shift_id UUID REFERENCES public.work_shifts(id) ON DELETE SET NULL,
    shift_start_time TIME,
    grace_minutes INTEGER,
    office_timezone TEXT,
    check_in TIMESTAMPTZ NOT NULL,
    decided_source TEXT NOT NULL CHECK (decided_source IN ('initial', 'edit')),
    first_decided_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    decided_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attendance_late_marks_employee_date
ON public.attendance_late_marks(employee_id, attendance_date);

-- ---------------------------------------------------------------------------
-- 3. Row Level Security (writes only through the service role / triggers)
-- ---------------------------------------------------------------------------
ALTER TABLE public.payroll_policy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_policy_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_late_marks ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.payroll_policy FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.payroll_policy_history FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.attendance_late_marks FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.payroll_policy TO authenticated;
GRANT SELECT ON public.payroll_policy_history TO authenticated;
GRANT SELECT ON public.attendance_late_marks TO authenticated;
GRANT ALL ON public.payroll_policy TO service_role;
GRANT ALL ON public.payroll_policy_history TO service_role;
GRANT ALL ON public.attendance_late_marks TO service_role;

DROP POLICY IF EXISTS "Admins can view payroll policy" ON public.payroll_policy;
CREATE POLICY "Admins can view payroll policy"
ON public.payroll_policy FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.employees WHERE auth_user_id = auth.uid() AND role IN ('admin', 'super_admin'))
);

DROP POLICY IF EXISTS "Admins can view payroll policy history" ON public.payroll_policy_history;
CREATE POLICY "Admins can view payroll policy history"
ON public.payroll_policy_history FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.employees WHERE auth_user_id = auth.uid() AND role IN ('admin', 'super_admin'))
);

DROP POLICY IF EXISTS "Employees can view own late marks" ON public.attendance_late_marks;
CREATE POLICY "Employees can view own late marks"
ON public.attendance_late_marks FOR SELECT TO authenticated
USING (
  employee_id IN (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())
);

DROP POLICY IF EXISTS "Admins can view all late marks" ON public.attendance_late_marks;
CREATE POLICY "Admins can view all late marks"
ON public.attendance_late_marks FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.employees WHERE auth_user_id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- ---------------------------------------------------------------------------
-- 4. Save payroll policy (admin only, atomic with history)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.save_payroll_policy(
    p_admin_id UUID,
    p_week_off_days SMALLINT[],
    p_late_grace_minutes INTEGER,
    p_late_marks_per_unit INTEGER,
    p_late_lop_days_per_unit NUMERIC,
    p_office_timezone TEXT
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
    WHERE id = p_admin_id
      AND status = 'active'
      AND role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Only active administrators can change payroll settings.'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = p_office_timezone) THEN
    RAISE EXCEPTION 'Unknown timezone: %', p_office_timezone USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(array_agg(DISTINCT d ORDER BY d), '{}') INTO v_days FROM unnest(p_week_off_days) AS d;

  INSERT INTO public.payroll_policy AS p (
    id, week_off_days, late_grace_minutes, late_marks_per_unit, late_lop_days_per_unit,
    office_timezone, updated_by, updated_at
  ) VALUES (
    1, v_days, p_late_grace_minutes, p_late_marks_per_unit, p_late_lop_days_per_unit,
    p_office_timezone, p_admin_id, now()
  )
  ON CONFLICT (id) DO UPDATE SET
    week_off_days = EXCLUDED.week_off_days,
    late_grace_minutes = EXCLUDED.late_grace_minutes,
    late_marks_per_unit = EXCLUDED.late_marks_per_unit,
    late_lop_days_per_unit = EXCLUDED.late_lop_days_per_unit,
    office_timezone = EXCLUDED.office_timezone,
    updated_by = EXCLUDED.updated_by,
    updated_at = EXCLUDED.updated_at
  RETURNING p.* INTO v_row;

  INSERT INTO public.payroll_policy_history (
    week_off_days, late_grace_minutes, late_marks_per_unit, late_lop_days_per_unit,
    office_timezone, changed_by, changed_at
  ) VALUES (
    v_row.week_off_days, v_row.late_grace_minutes, v_row.late_marks_per_unit, v_row.late_lop_days_per_unit,
    v_row.office_timezone, p_admin_id, v_row.updated_at
  );

  RETURN v_row;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. Late-mark decision (trigger on attendance check-in)
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
    v_grace := v_existing.grace_minutes;
    v_tz := v_existing.office_timezone;
  ELSE
    SELECT ws.id, ws.start_time INTO v_shift_id, v_shift_start
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
    shift_id, shift_start_time, grace_minutes, office_timezone, check_in,
    decided_source, first_decided_at, decided_at
  ) VALUES (
    NEW.id, NEW.employee_id, NEW.attendance_date, v_is_late, v_minutes, v_reason,
    v_shift_id, v_shift_start, v_grace, v_tz, NEW.check_in,
    CASE WHEN v_has_existing THEN 'edit' ELSE 'initial' END, now(), now()
  )
  ON CONFLICT (attendance_id) DO UPDATE SET
    employee_id = EXCLUDED.employee_id,
    attendance_date = EXCLUDED.attendance_date,
    is_late = EXCLUDED.is_late,
    minutes_late = EXCLUDED.minutes_late,
    reason = EXCLUDED.reason,
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

DROP TRIGGER IF EXISTS attendance_late_mark ON public.attendance;
CREATE TRIGGER attendance_late_mark
AFTER INSERT OR UPDATE OF check_in ON public.attendance
FOR EACH ROW EXECUTE FUNCTION public.attendance_record_late_mark();

-- ---------------------------------------------------------------------------
-- 6. Function privileges (service role only)
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.save_payroll_policy(UUID, SMALLINT[], INTEGER, INTEGER, NUMERIC, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_payroll_policy(UUID, SMALLINT[], INTEGER, INTEGER, NUMERIC, TEXT)
  TO service_role;
REVOKE EXECUTE ON FUNCTION public.attendance_record_late_mark() FROM PUBLIC, anon, authenticated;
