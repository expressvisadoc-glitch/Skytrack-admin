-- Migration: 20261028000000_notifications.sql
-- Description: Employee push notifications and admin in-app notifications (docs/NOTIFICATIONS.md).
--   * notifications: one row per recipient per event — the in-app inbox and the push queue.
--     (recipient_id, dedupe_key) is unique, so every reminder is sent at most once.
--   * device_tokens: Firebase Cloud Messaging tokens of employees' phones.
--   * Triggers create event notifications (leave decisions, payslips, salary, holidays, leave balance,
--     geofence alerts, leave submitted for admins).
--   * notifications_tick(): time-based notifications (shift reminders, not checked in, break over limit,
--     checkout reminder, missing checkout, absence, salary estimate, leave/holiday reminders, admin digests).
--   * notifications_run(): called every minute by pg_cron; runs the tick and asks the Edge Function to send
--     pending pushes (pg_net), using the URL and secret stored in Supabase Vault.
-- Admin notifications are in-app only (web bell panel): push_status = 'not_applicable'.
-- Requires 20261027030000_payroll_runs.sql.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- 1. Settings: allowed break and notification timing (payroll_policy)
-- ---------------------------------------------------------------------------
ALTER TABLE public.payroll_policy
  ADD COLUMN IF NOT EXISTS max_break_minutes INTEGER NOT NULL DEFAULT 60
    CHECK (max_break_minutes BETWEEN 5 AND 480),
  ADD COLUMN IF NOT EXISTS checkin_reminder_minutes_before INTEGER NOT NULL DEFAULT 5
    CHECK (checkin_reminder_minutes_before BETWEEN 0 AND 120),
  ADD COLUMN IF NOT EXISTS not_checked_in_minutes_after INTEGER NOT NULL DEFAULT 1
    CHECK (not_checked_in_minutes_after BETWEEN 0 AND 240),
  ADD COLUMN IF NOT EXISTS checkout_reminder_minutes_after INTEGER NOT NULL DEFAULT 10
    CHECK (checkout_reminder_minutes_after BETWEEN 0 AND 240),
  ADD COLUMN IF NOT EXISTS admin_not_checked_in_minutes_after INTEGER NOT NULL DEFAULT 30
    CHECK (admin_not_checked_in_minutes_after BETWEEN 0 AND 480);

ALTER TABLE public.payroll_policy_history
  ADD COLUMN IF NOT EXISTS max_break_minutes INTEGER;

DROP FUNCTION IF EXISTS public.save_payroll_policy(UUID, SMALLINT[], INTEGER, INTEGER, NUMERIC, TEXT);

CREATE OR REPLACE FUNCTION public.save_payroll_policy(
    p_admin_id UUID,
    p_week_off_days SMALLINT[],
    p_late_grace_minutes INTEGER,
    p_late_marks_per_unit INTEGER,
    p_late_lop_days_per_unit NUMERIC,
    p_office_timezone TEXT,
    p_max_break_minutes INTEGER
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

  SELECT COALESCE(array_agg(DISTINCT d ORDER BY d), '{}') INTO v_days FROM unnest(p_week_off_days) AS d;

  INSERT INTO public.payroll_policy AS p (
    id, week_off_days, late_grace_minutes, late_marks_per_unit, late_lop_days_per_unit,
    office_timezone, max_break_minutes, updated_by, updated_at
  ) VALUES (
    1, v_days, p_late_grace_minutes, p_late_marks_per_unit, p_late_lop_days_per_unit,
    p_office_timezone, p_max_break_minutes, p_admin_id, now()
  )
  ON CONFLICT (id) DO UPDATE SET
    week_off_days = EXCLUDED.week_off_days,
    late_grace_minutes = EXCLUDED.late_grace_minutes,
    late_marks_per_unit = EXCLUDED.late_marks_per_unit,
    late_lop_days_per_unit = EXCLUDED.late_lop_days_per_unit,
    office_timezone = EXCLUDED.office_timezone,
    max_break_minutes = EXCLUDED.max_break_minutes,
    updated_by = EXCLUDED.updated_by,
    updated_at = EXCLUDED.updated_at
  RETURNING p.* INTO v_row;

  INSERT INTO public.payroll_policy_history (
    week_off_days, late_grace_minutes, late_marks_per_unit, late_lop_days_per_unit,
    office_timezone, max_break_minutes, changed_by, changed_at
  ) VALUES (
    v_row.week_off_days, v_row.late_grace_minutes, v_row.late_marks_per_unit, v_row.late_lop_days_per_unit,
    v_row.office_timezone, v_row.max_break_minutes, p_admin_id, v_row.updated_at
  );

  RETURN v_row;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    audience TEXT NOT NULL CHECK (audience IN ('employee', 'admin')),
    type TEXT NOT NULL CHECK (char_length(type) <= 40),
    title TEXT NOT NULL CHECK (char_length(title) <= 120),
    body TEXT NOT NULL CHECK (char_length(body) <= 500),
    data JSONB NOT NULL DEFAULT '{}',
    dedupe_key TEXT NOT NULL CHECK (char_length(dedupe_key) <= 200),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    read_at TIMESTAMPTZ,
    push_status TEXT NOT NULL CHECK (push_status IN ('pending', 'sent', 'skipped', 'failed', 'expired', 'not_applicable')),
    push_attempts INTEGER NOT NULL DEFAULT 0,
    push_claimed_at TIMESTAMPTZ,
    pushed_at TIMESTAMPTZ,
    push_error TEXT,
    UNIQUE (recipient_id, dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created ON public.notifications(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_push_pending ON public.notifications(created_at) WHERE push_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at);

CREATE TABLE IF NOT EXISTS public.device_tokens (
    token TEXT PRIMARY KEY CHECK (char_length(token) BETWEEN 20 AND 4096),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    platform TEXT NOT NULL DEFAULT 'android' CHECK (platform IN ('android')),
    app_version TEXT CHECK (app_version IS NULL OR char_length(app_version) <= 40),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_device_tokens_employee ON public.device_tokens(employee_id);

-- Last salary estimate per employee, for the once-a-day "estimated salary updated" notification
CREATE TABLE IF NOT EXISTS public.salary_estimate_snapshots (
    employee_id UUID PRIMARY KEY REFERENCES public.employees(id) ON DELETE CASCADE,
    month DATE NOT NULL,
    net_pay NUMERIC(12, 2),
    checked_on DATE NOT NULL
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_estimate_snapshots ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.notifications FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.device_tokens FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.salary_estimate_snapshots FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
GRANT ALL ON public.device_tokens TO service_role;
GRANT ALL ON public.salary_estimate_snapshots TO service_role;

DROP POLICY IF EXISTS "Recipients read own notifications" ON public.notifications;
CREATE POLICY "Recipients read own notifications"
ON public.notifications FOR SELECT TO authenticated
USING (recipient_id IN (SELECT e.id FROM public.employees e WHERE e.auth_user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- 3. Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify(
    p_recipient UUID,
    p_audience TEXT,
    p_type TEXT,
    p_title TEXT,
    p_body TEXT,
    p_data JSONB,
    p_dedupe TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted INTEGER;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.employees WHERE id = p_recipient AND status = 'active') THEN
    RETURN false;
  END IF;

  INSERT INTO public.notifications (recipient_id, audience, type, title, body, data, dedupe_key, push_status)
  VALUES (p_recipient, p_audience, p_type, left(p_title, 120), left(p_body, 500), COALESCE(p_data, '{}'),
          left(p_dedupe, 200), CASE WHEN p_audience = 'admin' THEN 'not_applicable' ELSE 'pending' END)
  ON CONFLICT (recipient_id, dedupe_key) DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_admins(p_type TEXT, p_title TEXT, p_body TEXT, p_data JSONB, p_dedupe TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR v_admin IN SELECT id FROM public.employees WHERE status = 'active' AND role IN ('admin', 'super_admin') LOOP
    IF public.notify(v_admin.id, 'admin', p_type, p_title, p_body, p_data, p_dedupe) THEN
      v_count := v_count + 1;
    END IF;
  END LOOP;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_all_employees(p_type TEXT, p_title TEXT, p_body TEXT, p_data JSONB, p_dedupe TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_emp RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR v_emp IN SELECT id FROM public.employees WHERE status = 'active' LOOP
    IF public.notify(v_emp.id, 'employee', p_type, p_title, p_body, p_data, p_dedupe) THEN
      v_count := v_count + 1;
    END IF;
  END LOOP;
  RETURN v_count;
END;
$$;

-- Working day in the office calendar: not a week-off, not a published holiday
CREATE OR REPLACE FUNCTION public.is_working_day(p_date DATE)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT (EXTRACT(DOW FROM p_date)::SMALLINT = ANY (COALESCE((SELECT week_off_days FROM public.payroll_policy WHERE id = 1), '{}'::SMALLINT[])))
     AND NOT EXISTS (SELECT 1 FROM public.public_holidays h WHERE h.holiday_date = p_date AND h.status = 'published');
$$;

CREATE OR REPLACE FUNCTION public.is_on_approved_leave(p_employee_id UUID, p_date DATE)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.leaves l
    WHERE l.employee_id = p_employee_id AND l.status = 'approved' AND p_date BETWEEN l.from_date AND l.to_date
  );
$$;

CREATE OR REPLACE FUNCTION public.format_day(p_date DATE)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$ SELECT to_char(p_date, 'FMDD Mon') $$;

CREATE OR REPLACE FUNCTION public.format_clock(p_time TIME)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$ SELECT to_char(p_time, 'FMHH12:MI AM') $$;

-- ---------------------------------------------------------------------------
-- 4. Event notifications (triggers)
-- ---------------------------------------------------------------------------

-- Leave submitted (admins), approved / rejected / cancelled after approval (employee)
CREATE OR REPLACE FUNCTION public.notifications_on_leave()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT;
  v_range TEXT := CASE WHEN NEW.from_date = NEW.to_date THEN public.format_day(NEW.from_date)
                       ELSE public.format_day(NEW.from_date) || '–' || public.format_day(NEW.to_date) END;
  v_unpaid TEXT := '';
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    SELECT name INTO v_name FROM public.employees WHERE id = NEW.employee_id;
    PERFORM public.notify_admins('leave_submitted', 'New leave request',
      format('%s submitted a leave request (%s).', COALESCE(v_name, 'An employee'), v_range),
      jsonb_build_object('tab', 'leave-management', 'leave_id', NEW.id), 'D1:' || NEW.id);
    RETURN NULL;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'approved' THEN
      IF COALESCE(NEW.lop_days, 0) > 0 THEN
        v_unpaid := format(' %s day(s) are unpaid and will be deducted from this month''s salary.', trim_scale(NEW.lop_days));
      END IF;
      PERFORM public.notify(NEW.employee_id, 'employee', 'leave_approved', 'Leave approved',
        format('Your leave request for %s was approved.%s', v_range, v_unpaid),
        jsonb_build_object('screen', 'leave'), 'L1:' || NEW.id);
    ELSIF NEW.status = 'rejected' THEN
      PERFORM public.notify(NEW.employee_id, 'employee', 'leave_rejected', 'Leave rejected',
        format('Your leave request for %s was rejected.%s', v_range,
               CASE WHEN COALESCE(btrim(NEW.manager_comment), '') <> '' THEN ' Comment: ' || btrim(NEW.manager_comment)
                    ELSE ' See the leave screen for details.' END),
        jsonb_build_object('screen', 'leave'), 'L2:' || NEW.id);
    ELSIF NEW.status = 'cancelled' AND OLD.status = 'approved' THEN
      PERFORM public.notify(NEW.employee_id, 'employee', 'leave_cancelled', 'Leave cancelled',
        format('Your approved leave for %s was cancelled.', v_range),
        jsonb_build_object('screen', 'leave'), 'L3:' || NEW.id);
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

-- Leave balance credited (monthly allocation or admin adjustment)
CREATE OR REPLACE FUNCTION public.notifications_on_leave_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_added NUMERIC := (COALESCE(NEW.allocated_days, 0) + COALESCE(NEW.adjusted_days, 0))
    - CASE WHEN TG_OP = 'UPDATE' THEN COALESCE(OLD.allocated_days, 0) + COALESCE(OLD.adjusted_days, 0) ELSE 0 END;
BEGIN
  IF v_added > 0 THEN
    PERFORM public.notify(NEW.employee_id, 'employee', 'leave_balance', 'Leave balance updated',
      format('Your leave balance was updated: +%s %s leave.', trim_scale(v_added), NEW.leave_type),
      jsonb_build_object('screen', 'leave'),
      format('L4:%s:%s', NEW.id, COALESCE(NEW.allocated_days, 0) + COALESCE(NEW.adjusted_days, 0)));
  END IF;
  RETURN NULL;
END;
$$;

-- New published holiday in the next 60 days (all employees)
CREATE OR REPLACE FUNCTION public.notifications_on_holiday()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'published'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'published' OR OLD.holiday_date IS DISTINCT FROM NEW.holiday_date)
     AND NEW.holiday_date BETWEEN current_date AND current_date + 60 THEN
    PERFORM public.notify_all_employees('holiday_added', 'New holiday',
      format('New holiday: %s on %s.', NEW.holiday_name, public.format_day(NEW.holiday_date)),
      jsonb_build_object('screen', 'leave'), format('H1:%s:%s', NEW.holiday_date, md5(lower(NEW.holiday_name))));
  END IF;
  RETURN NULL;
END;
$$;

-- Salary added or changed
CREATE OR REPLACE FUNCTION public.notifications_on_salary()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.notify(NEW.employee_id, 'employee', 'salary_updated', 'Salary updated',
    'Your salary details were updated.', jsonb_build_object('screen', 'home'), 'P5:' || NEW.id);
  RETURN NULL;
END;
$$;

-- Payslip issued (version 1) or revised (version > 1)
CREATE OR REPLACE FUNCTION public.notifications_on_payslip()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month TEXT := to_char(NEW.month, 'FMMonth YYYY');
BEGIN
  IF NEW.version = 1 THEN
    PERFORM public.notify(NEW.employee_id, 'employee', 'payslip_ready', 'Payslip ready',
      format('Your payslip for %s is ready.', v_month), jsonb_build_object('screen', 'monthly'),
      format('P3:%s:%s', NEW.month, NEW.version));
  ELSE
    PERFORM public.notify(NEW.employee_id, 'employee', 'payslip_revised', 'Payslip revised',
      format('Your payslip for %s was revised.', v_month), jsonb_build_object('screen', 'monthly'),
      format('P4:%s:%s', NEW.month, NEW.version));
  END IF;
  RETURN NULL;
END;
$$;

-- Repeated outside-office check-in attempts or mock locations (admins)
CREATE OR REPLACE FUNCTION public.notifications_on_location_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT;
  v_code TEXT;
  v_count INTEGER;
BEGIN
  IF NEW.outcome <> 'rejected' OR NEW.reason_code NOT IN ('outside_geofence', 'mock_location_detected') THEN
    RETURN NULL;
  END IF;
  SELECT name, employee_id INTO v_name, v_code FROM public.employees WHERE id = NEW.employee_id;

  IF NEW.reason_code = 'mock_location_detected' THEN
    PERFORM public.notify_admins('geofence_mock', 'Mock location detected',
      format('%s (%s) tried to check in with a simulated location.', v_name, v_code),
      jsonb_build_object('tab', 'attendance', 'employee_id', v_code),
      format('D5M:%s:%s', NEW.employee_id, NEW.received_at::date));
    RETURN NULL;
  END IF;

  SELECT count(*) INTO v_count FROM public.attendance_location_events
  WHERE employee_id = NEW.employee_id AND reason_code = 'outside_geofence'
    AND received_at >= date_trunc('day', NEW.received_at) AND received_at < date_trunc('day', NEW.received_at) + INTERVAL '1 day';
  IF v_count >= 3 THEN
    PERFORM public.notify_admins('geofence_attempts', 'Repeated check-ins outside the office',
      format('%s (%s) tried to check in or out from outside the office %s times today.', v_name, v_code, v_count),
      jsonb_build_object('tab', 'attendance', 'employee_id', v_code),
      format('D5:%s:%s', NEW.employee_id, NEW.received_at::date));
  END IF;
  RETURN NULL;
END;
$$;

-- Geofence switched off (admins)
CREATE OR REPLACE FUNCTION public.notifications_on_geofence()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.is_active AND NOT NEW.is_active THEN
    PERFORM public.notify_admins('geofence_off', 'Office geofence is off',
      'Office geofence is turned off. No one can check in or check out until it is turned back on.',
      jsonb_build_object('tab', 'office-geofence'), 'D6:' || current_date);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS notifications_leave ON public.leaves;
CREATE TRIGGER notifications_leave AFTER INSERT OR UPDATE OF status ON public.leaves
FOR EACH ROW EXECUTE FUNCTION public.notifications_on_leave();

DROP TRIGGER IF EXISTS notifications_leave_balance ON public.employee_leave_balances;
CREATE TRIGGER notifications_leave_balance AFTER INSERT OR UPDATE OF allocated_days, adjusted_days ON public.employee_leave_balances
FOR EACH ROW EXECUTE FUNCTION public.notifications_on_leave_balance();

DROP TRIGGER IF EXISTS notifications_holiday ON public.public_holidays;
CREATE TRIGGER notifications_holiday AFTER INSERT OR UPDATE OF status, holiday_date ON public.public_holidays
FOR EACH ROW EXECUTE FUNCTION public.notifications_on_holiday();

DROP TRIGGER IF EXISTS notifications_salary ON public.salary_structures;
CREATE TRIGGER notifications_salary AFTER INSERT ON public.salary_structures
FOR EACH ROW EXECUTE FUNCTION public.notifications_on_salary();

DROP TRIGGER IF EXISTS notifications_payslip ON public.payslips;
CREATE TRIGGER notifications_payslip AFTER INSERT ON public.payslips
FOR EACH ROW EXECUTE FUNCTION public.notifications_on_payslip();

DROP TRIGGER IF EXISTS notifications_location_event ON public.attendance_location_events;
CREATE TRIGGER notifications_location_event AFTER INSERT ON public.attendance_location_events
FOR EACH ROW EXECUTE FUNCTION public.notifications_on_location_event();

DROP TRIGGER IF EXISTS notifications_geofence ON public.office_geofence_settings;
CREATE TRIGGER notifications_geofence AFTER UPDATE OF is_active ON public.office_geofence_settings
FOR EACH ROW EXECUTE FUNCTION public.notifications_on_geofence();

-- Late check-in (A3, with the deduction when a pair completes) and "one more late mark" (A4).
-- Called by the Edge Function after an employee's own check-in, so admin edits do not trigger it.
CREATE OR REPLACE FUNCTION public.notify_late_check_in(p_employee_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_policy public.payroll_policy;
  v_mark public.attendance_late_marks;
  v_count INTEGER;
  v_body TEXT;
BEGIN
  SELECT * INTO v_policy FROM public.payroll_policy WHERE id = 1;
  SELECT * INTO v_mark FROM public.attendance_late_marks
  WHERE employee_id = p_employee_id AND attendance_date = current_date AND is_late AND decided_source = 'initial';
  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT count(*) INTO v_count FROM public.attendance_late_marks m
  WHERE m.employee_id = p_employee_id AND m.is_late
    AND m.attendance_date >= date_trunc('month', current_date)::DATE AND m.attendance_date <= current_date;

  v_body := format('You checked in late today (%s min). Late marks this month: %s.', v_mark.minutes_late, v_count);
  IF v_count % v_policy.late_marks_per_unit = 0 THEN
    v_body := v_body || format(' This adds %s day LOP to this month''s salary. View the breakdown.', trim_scale(v_policy.late_lop_days_per_unit));
  END IF;
  PERFORM public.notify(p_employee_id, 'employee', 'late_check_in', 'Late check-in', v_body,
    jsonb_build_object('screen', 'home'), 'A3:' || current_date);

  IF v_policy.late_marks_per_unit > 1 AND v_count % v_policy.late_marks_per_unit = v_policy.late_marks_per_unit - 1 THEN
    PERFORM public.notify(p_employee_id, 'employee', 'late_warning', 'Late marks',
      format('One more late mark this month will add %s day LOP.', trim_scale(v_policy.late_lop_days_per_unit)),
      jsonb_build_object('screen', 'home'), 'A4:' || current_date);
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. Time-based notifications. p_now is a parameter so the logic can be tested at any time.
--    Shift times and calendar dates use the office timezone; attendance rows use the UTC date.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notifications_tick(p_now TIMESTAMPTZ DEFAULT now())
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_policy public.payroll_policy;
  v_tz TEXT;
  v_local TIMESTAMP;
  v_today DATE;            -- office calendar date
  v_yesterday DATE;
  v_utc_today DATE := (p_now AT TIME ZONE 'UTC')::DATE;
  v_hour INTEGER;
  v_is_working BOOLEAN;
  v_emp RECORD;
  v_row RECORD;
  v_start TIMESTAMPTZ;
  v_end TIMESTAMPTZ;
  v_checked_in BOOLEAN;
  v_checked_out BOOLEAN;
  v_count INTEGER := 0;
  v_result JSONB;
  v_names TEXT;
  v_missing INTEGER;
  v_fingerprint TEXT;
  v_prev_month DATE;
BEGIN
  SELECT * INTO v_policy FROM public.payroll_policy WHERE id = 1;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  v_tz := v_policy.office_timezone;
  v_local := p_now AT TIME ZONE v_tz;
  v_today := v_local::DATE;
  v_yesterday := v_today - 1;
  v_hour := EXTRACT(HOUR FROM v_local)::INTEGER;
  v_is_working := public.is_working_day(v_today);

  -- Per-employee shift notifications
  FOR v_emp IN
    SELECT e.id, e.name, e.joining_date, ws.id AS shift_id, ws.start_time, ws.end_time
    FROM public.employees e
    JOIN public.work_shifts ws ON ws.id = e.work_shift_id
    WHERE e.status = 'active' AND (e.joining_date IS NULL OR e.joining_date <= v_today)
  LOOP
    v_start := (v_today + v_emp.start_time) AT TIME ZONE v_tz;
    v_end := (v_today + v_emp.end_time) AT TIME ZONE v_tz;
    SELECT a.check_in IS NOT NULL, a.check_out IS NOT NULL INTO v_checked_in, v_checked_out
    FROM public.attendance a WHERE a.employee_id = v_emp.id AND a.attendance_date = v_utc_today;
    v_checked_in := COALESCE(v_checked_in, false);
    v_checked_out := COALESCE(v_checked_out, false);

    IF v_is_working AND NOT public.is_on_approved_leave(v_emp.id, v_today) THEN
      -- A1: before the shift starts
      IF NOT v_checked_in
         AND p_now >= v_start - make_interval(mins => v_policy.checkin_reminder_minutes_before) AND p_now < v_start THEN
        IF public.notify(v_emp.id, 'employee', 'shift_reminder', 'Shift starting soon',
             format('Your shift starts at %s. Remember to check in.', public.format_clock(v_emp.start_time)),
             jsonb_build_object('screen', 'home'), 'A1:' || v_today) THEN v_count := v_count + 1; END IF;
      END IF;
      -- A2: shift started, still not checked in
      IF NOT v_checked_in
         AND p_now >= v_start + make_interval(mins => v_policy.not_checked_in_minutes_after)
         AND p_now < v_start + INTERVAL '2 hours' THEN
        IF public.notify(v_emp.id, 'employee', 'not_checked_in', 'Not checked in',
             'You have not checked in today.', jsonb_build_object('screen', 'home'), 'A2:' || v_today) THEN
          v_count := v_count + 1;
        END IF;
      END IF;
      -- A6: shift ended, still checked in
      IF v_checked_in AND NOT v_checked_out
         AND p_now >= v_end + make_interval(mins => v_policy.checkout_reminder_minutes_after)
         AND p_now < v_end + INTERVAL '4 hours' THEN
        IF public.notify(v_emp.id, 'employee', 'checkout_reminder', 'Remember to check out',
             format('Your shift ended at %s. Remember to check out.', public.format_clock(v_emp.end_time)),
             jsonb_build_object('screen', 'home'), 'A6:' || v_today) THEN v_count := v_count + 1; END IF;
      END IF;
    END IF;

    -- A8: absent yesterday (morning summary)
    IF v_hour BETWEEN 8 AND 11
       AND public.is_working_day(v_yesterday)
       AND (v_emp.joining_date IS NULL OR v_emp.joining_date <= v_yesterday)
       AND NOT public.is_on_approved_leave(v_emp.id, v_yesterday)
       AND NOT EXISTS (SELECT 1 FROM public.attendance a
                       WHERE a.employee_id = v_emp.id AND a.attendance_date = v_yesterday AND a.check_in IS NOT NULL) THEN
      IF public.notify(v_emp.id, 'employee', 'absent', 'Marked absent',
           format('You were marked absent on %s (1 day LOP). Contact your admin if this is wrong.', public.format_day(v_yesterday)),
           jsonb_build_object('screen', 'home'), 'A8:' || v_yesterday) THEN v_count := v_count + 1; END IF;
    END IF;
  END LOOP;

  -- A5: break over the allowed duration
  FOR v_row IN
    SELECT a.id, a.employee_id, a.break_started_at FROM public.attendance a
    JOIN public.employees e ON e.id = a.employee_id AND e.status = 'active'
    WHERE a.break_started_at IS NOT NULL AND a.check_out IS NULL
      AND a.attendance_date >= v_utc_today - 1
      AND p_now - a.break_started_at > make_interval(mins => v_policy.max_break_minutes)
  LOOP
    IF public.notify(v_row.employee_id, 'employee', 'break_exceeded', 'Break time exceeded',
         format('Your break has gone over %s minutes.', v_policy.max_break_minutes),
         jsonb_build_object('screen', 'home'),
         format('A5:%s:%s', v_row.id, EXTRACT(EPOCH FROM v_row.break_started_at)::BIGINT)) THEN v_count := v_count + 1; END IF;
  END LOOP;

  -- A7: yesterday's checkout was missing (morning)
  IF v_hour BETWEEN 8 AND 11 THEN
    FOR v_row IN
      SELECT a.employee_id, a.attendance_date FROM public.attendance a
      JOIN public.employees e ON e.id = a.employee_id AND e.status = 'active'
      WHERE a.attendance_date = v_utc_today - 1 AND a.check_in IS NOT NULL AND a.check_out IS NULL
    LOOP
      IF public.notify(v_row.employee_id, 'employee', 'missing_checkout', 'Checkout missing',
           format('Your checkout on %s was missing; 6:00 PM has been used as your checkout time.', public.format_day(v_row.attendance_date)),
           jsonb_build_object('screen', 'monthly'), 'A7:' || v_row.attendance_date) THEN v_count := v_count + 1; END IF;
    END LOOP;
  END IF;

  -- D2: employees not checked in, per shift (admins)
  IF v_is_working THEN
    FOR v_row IN
      SELECT ws.id AS shift_id, ws.start_time, ws.shift_name,
             string_agg(e.name, ', ' ORDER BY e.name) AS names, count(*) AS missing
      FROM public.employees e
      JOIN public.work_shifts ws ON ws.id = e.work_shift_id
      WHERE e.status = 'active' AND (e.joining_date IS NULL OR e.joining_date <= v_today)
        AND NOT public.is_on_approved_leave(e.id, v_today)
        AND NOT EXISTS (SELECT 1 FROM public.attendance a
                        WHERE a.employee_id = e.id AND a.attendance_date = v_utc_today AND a.check_in IS NOT NULL)
        AND p_now >= ((v_today + ws.start_time) AT TIME ZONE v_tz) + make_interval(mins => v_policy.admin_not_checked_in_minutes_after)
        AND p_now < ((v_today + ws.start_time) AT TIME ZONE v_tz) + INTERVAL '3 hours'
      GROUP BY ws.id, ws.start_time, ws.shift_name
    LOOP
      v_count := v_count + public.notify_admins('not_checked_in_summary',
        format('%s not checked in', CASE WHEN v_row.missing = 1 THEN '1 employee has' ELSE v_row.missing || ' employees have' END),
        format('%s %s not checked in yet (%s, starts %s): %s.',
               v_row.missing, CASE WHEN v_row.missing = 1 THEN 'employee has' ELSE 'employees have' END,
               v_row.shift_name, public.format_clock(v_row.start_time), v_row.names),
        jsonb_build_object('tab', 'attendance'), format('D2:%s:%s', v_today, v_row.shift_id));
    END LOOP;
  END IF;

  -- Evening reminders: leave tomorrow (L5), holiday tomorrow (H2)
  IF v_hour >= 18 THEN
    FOR v_row IN
      SELECT l.id, l.employee_id FROM public.leaves l
      WHERE l.status = 'approved' AND l.from_date = v_today + 1
    LOOP
      IF public.notify(v_row.employee_id, 'employee', 'leave_tomorrow', 'Leave tomorrow',
           'Reminder: your leave starts tomorrow.', jsonb_build_object('screen', 'leave'), 'L5:' || v_row.id) THEN
        v_count := v_count + 1;
      END IF;
    END LOOP;
    FOR v_row IN
      SELECT DISTINCT ON (h.holiday_date) h.holiday_date, h.holiday_name FROM public.public_holidays h
      WHERE h.status = 'published' AND h.holiday_date = v_today + 1
    LOOP
      v_count := v_count + public.notify_all_employees('holiday_tomorrow', 'Holiday tomorrow',
        format('Tomorrow is a holiday (%s).', v_row.holiday_name), jsonb_build_object('screen', 'leave'),
        'H2:' || v_row.holiday_date);
    END LOOP;
  END IF;

  -- P1: estimated salary changed (once a day, evening)
  IF v_hour >= 20 THEN
    FOR v_emp IN
      SELECT e.id FROM public.employees e
      LEFT JOIN public.salary_estimate_snapshots s ON s.employee_id = e.id
      WHERE e.status = 'active' AND (s.checked_on IS NULL OR s.checked_on < v_today)
        AND EXISTS (SELECT 1 FROM public.salary_structures ss WHERE ss.employee_id = e.id)
    LOOP
      v_result := public.compute_payroll(v_emp.id, date_trunc('month', v_today)::DATE, v_utc_today);
      IF v_result->>'status' = 'ok' THEN
        IF EXISTS (SELECT 1 FROM public.salary_estimate_snapshots s
                   WHERE s.employee_id = v_emp.id AND s.month = date_trunc('month', v_today)::DATE
                     AND s.net_pay IS DISTINCT FROM (v_result->>'net_pay')::NUMERIC) THEN
          IF public.notify(v_emp.id, 'employee', 'salary_estimate', 'Salary estimate updated',
               'Your estimated salary has been updated.', jsonb_build_object('screen', 'home'), 'P1:' || v_today) THEN
            v_count := v_count + 1;
          END IF;
        END IF;
      END IF;
      INSERT INTO public.salary_estimate_snapshots (employee_id, month, net_pay, checked_on)
      VALUES (v_emp.id, date_trunc('month', v_today)::DATE,
              CASE WHEN v_result->>'status' = 'ok' THEN (v_result->>'net_pay')::NUMERIC END, v_today)
      ON CONFLICT (employee_id) DO UPDATE SET month = EXCLUDED.month, net_pay = EXCLUDED.net_pay, checked_on = EXCLUDED.checked_on;
    END LOOP;
  END IF;

  -- Admin morning checks
  IF v_hour >= 9 THEN
    -- D3: last month not locked (1st of the month)
    IF EXTRACT(DAY FROM v_today) = 1 THEN
      v_prev_month := (date_trunc('month', v_today) - INTERVAL '1 month')::DATE;
      IF NOT EXISTS (SELECT 1 FROM public.payroll_runs r WHERE r.month = v_prev_month AND r.status = 'locked') THEN
        v_count := v_count + public.notify_admins('payroll_lock_reminder', 'Lock payroll',
          format('%s has ended. Review and lock payroll.', to_char(v_prev_month, 'FMMonth YYYY')),
          jsonb_build_object('tab', 'payroll', 'month', to_char(v_prev_month, 'YYYY-MM')), 'D3:' || v_prev_month);
      END IF;
    END IF;

    -- D4: employees missing a salary or shift (only when the list changes)
    SELECT string_agg(e.name, ', ' ORDER BY e.name), count(*),
           md5(string_agg(e.id::TEXT || ':' || (e.work_shift_id IS NULL)::TEXT ||
               (NOT EXISTS (SELECT 1 FROM public.salary_structures ss WHERE ss.employee_id = e.id AND ss.effective_from <= v_today))::TEXT,
               ',' ORDER BY e.id))
    INTO v_names, v_missing, v_fingerprint
    FROM public.employees e
    WHERE e.status = 'active'
      AND (e.work_shift_id IS NULL
           OR NOT EXISTS (SELECT 1 FROM public.salary_structures ss WHERE ss.employee_id = e.id AND ss.effective_from <= v_today));
    IF v_missing > 0 THEN
      v_count := v_count + public.notify_admins('payroll_setup_missing', 'Payroll setup incomplete',
        format('%s %s missing a salary or work shift: %s.', v_missing,
               CASE WHEN v_missing = 1 THEN 'employee is' ELSE 'employees are' END, v_names),
        jsonb_build_object('tab', 'payroll'), 'D4:' || v_fingerprint);
    END IF;

    -- D6: geofence still off
    IF EXISTS (SELECT 1 FROM public.office_geofence_settings g WHERE g.id = 1 AND NOT g.is_active) THEN
      v_count := v_count + public.notify_admins('geofence_off', 'Office geofence is off',
        'Office geofence is turned off. No one can check in or check out until it is turned back on.',
        jsonb_build_object('tab', 'office-geofence'), 'D6:' || v_today);
    END IF;
  END IF;

  RETURN v_count;
END;
$$;

-- Pushes for the Edge Function to send now. A claimed row is not handed out again for 2 minutes, so
-- overlapping dispatch runs never send the same push twice and failed sends are retried after a pause.
CREATE OR REPLACE FUNCTION public.claim_push_notifications(p_limit INTEGER)
RETURNS SETOF public.notifications
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.notifications n
  SET push_claimed_at = now(), push_attempts = n.push_attempts + 1
  WHERE n.id IN (
    SELECT id FROM public.notifications
    WHERE push_status = 'pending' AND (push_claimed_at IS NULL OR push_claimed_at < now() - INTERVAL '2 minutes')
    ORDER BY created_at
    LIMIT LEAST(GREATEST(p_limit, 1), 500)
    FOR UPDATE SKIP LOCKED
  )
  RETURNING n.*;
$$;

-- ---------------------------------------------------------------------------
-- 6. Scheduler: tick + push dispatch request (every minute)
--    Vault secrets (set once per project, not in this file):
--      skytrack_dispatch_url    = https://<project>.supabase.co/functions/v1/skytrack-api
--      skytrack_dispatch_secret = same value as the Edge Function secret NOTIFICATIONS_DISPATCH_SECRET
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notifications_request_dispatch()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url TEXT;
  v_secret TEXT;
BEGIN
  UPDATE public.notifications SET push_status = 'expired'
  WHERE push_status = 'pending' AND created_at < now() - INTERVAL '6 hours';

  -- Keep about four months of history
  DELETE FROM public.notifications WHERE created_at < now() - INTERVAL '120 days';

  IF NOT EXISTS (
    SELECT 1 FROM public.notifications
    WHERE push_status = 'pending' AND (push_claimed_at IS NULL OR push_claimed_at < now() - INTERVAL '2 minutes')
  ) THEN
    RETURN;
  END IF;

  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'skytrack_dispatch_url';
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'skytrack_dispatch_secret';
  IF v_url IS NULL OR v_secret IS NULL THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := v_url,
    body := jsonb_build_object('action', 'notifications_dispatch'),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-skytrack-dispatch-secret', v_secret),
    timeout_milliseconds := 15000
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.notifications_run()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    PERFORM public.notifications_tick(now());
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notifications_tick failed: %', SQLERRM;
  END;
  PERFORM public.notifications_request_dispatch();
END;
$$;

SELECT cron.schedule('skytrack-notifications', '* * * * *', 'SELECT public.notifications_run()');

-- ---------------------------------------------------------------------------
-- 7. Function privileges (service role / cron only)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  fn TEXT;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.save_payroll_policy(uuid, smallint[], integer, integer, numeric, text, integer)',
    'public.notify(uuid, text, text, text, text, jsonb, text)',
    'public.notify_admins(text, text, text, jsonb, text)',
    'public.notify_all_employees(text, text, text, jsonb, text)',
    'public.is_working_day(date)',
    'public.is_on_approved_leave(uuid, date)',
    'public.notify_late_check_in(uuid)',
    'public.notifications_tick(timestamptz)',
    'public.notifications_request_dispatch()',
    'public.claim_push_notifications(integer)',
    'public.notifications_run()',
    'public.notifications_on_leave()',
    'public.notifications_on_leave_balance()',
    'public.notifications_on_holiday()',
    'public.notifications_on_salary()',
    'public.notifications_on_payslip()',
    'public.notifications_on_location_event()',
    'public.notifications_on_geofence()'
  ] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
  END LOOP;
END $$;
