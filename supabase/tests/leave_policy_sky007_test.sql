-- SkyTrack leave policy test for SKY007 — READ-ONLY IN EFFECT.
-- Simulates Dec 2026 → Mar 2027 for SKY007 only, then raises an error on purpose so that
-- EVERY change is rolled back. The "error" message IS the test result.
DO $$
DECLARE
  v_id uuid := (SELECT id FROM public.employees WHERE employee_id = 'SKY007');
  r text := '';
  snap text;
  logs int;
BEGIN
  IF v_id IS NULL THEN RAISE EXCEPTION 'SKY007 not found'; END IF;

  SELECT string_agg(leave_type || ' ' || (allocated_days + adjusted_days - used_days), ', ' ORDER BY leave_type)
    INTO snap FROM public.employee_leave_balances WHERE employee_id = v_id;
  r := r || 'NOW: ' || COALESCE(snap, 'no rows');

  PERFORM public.allocate_monthly_employee_leaves('2026-12-01', v_id);
  SELECT string_agg(leave_type || ' ' || (allocated_days + adjusted_days - used_days), ', ' ORDER BY leave_type)
    INTO snap FROM public.employee_leave_balances WHERE employee_id = v_id;
  r := r || ' | DEC: ' || snap;

  PERFORM public.allocate_monthly_employee_leaves('2027-01-01', v_id);
  SELECT string_agg(leave_type || ' ' || (allocated_days + adjusted_days - used_days), ', ' ORDER BY leave_type)
    INTO snap FROM public.employee_leave_balances WHERE employee_id = v_id;
  SELECT count(*) INTO logs FROM public.leave_balance_transactions
    WHERE employee_id = v_id AND transaction_type = 'yearly_reset';
  r := r || ' | JAN (reset): ' || snap || ' [lapse records: ' || logs || ']';

  PERFORM public.allocate_monthly_employee_leaves('2027-01-01', v_id);
  SELECT string_agg(leave_type || ' ' || (allocated_days + adjusted_days - used_days), ', ' ORDER BY leave_type)
    INTO snap FROM public.employee_leave_balances WHERE employee_id = v_id;
  r := r || ' | JAN again: ' || snap;

  PERFORM public.allocate_monthly_employee_leaves('2027-02-01', v_id);
  PERFORM public.allocate_monthly_employee_leaves('2027-03-01', v_id);
  SELECT string_agg(leave_type || ' ' || (allocated_days + adjusted_days - used_days), ', ' ORDER BY leave_type)
    INTO snap FROM public.employee_leave_balances WHERE employee_id = v_id;
  r := r || ' | MAR: ' || snap;

  RAISE EXCEPTION 'TEST RESULT (nothing saved) — %', r;
END $$;
