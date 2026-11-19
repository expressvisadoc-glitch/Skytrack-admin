-- Migration: 20261119000000_leave_yearly_reset.sql
--
-- Leave policy: 1 casual day every month, 6 sick days a year (1 every two months: Jan, Mar, May,
-- Jul, Sep, Nov), and balances reset every January.
--
-- The live function (scheduled by pg_cron job "skytrack-monthly-leave-allocation", 0 0 1 * *)
-- already credited casual and sick leave but never reset anything, so unused days carried over
-- forever. This version keeps the monthly credits exactly as before and adds the January reset:
-- on the January run, last year's allocated, adjusted and used days lapse, and the year starts at
-- 1 casual + 1 sick. What lapsed is written to leave_balance_transactions for the record.
--
-- It stays idempotent: each balance row is processed at most once per month, guarded by
-- last_allocation_month, so a second run in the same month changes nothing.
--
-- Two optional parameters exist for testing only (run a chosen month, for one employee). They are
-- not callable from the app: EXECUTE is revoked from PUBLIC, anon and authenticated, so only the
-- database owner and pg_cron can run it. The cron command "SELECT allocate_monthly_employee_leaves();"
-- keeps working unchanged because both parameters have defaults.

-- Replacing (not overloading): an old zero-argument version next to the new one would make the
-- cron job's call ambiguous.
DROP FUNCTION IF EXISTS public.allocate_monthly_employee_leaves();

CREATE OR REPLACE FUNCTION public.allocate_monthly_employee_leaves(
    p_month date DEFAULT NULL,
    p_employee_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_month date := date_trunc('month', COALESCE(p_month, current_date))::date;
    v_is_january boolean;
    v_sick_month boolean;
    v_type text;
    v_old record;
    emp record;
BEGIN
    v_is_january := EXTRACT(MONTH FROM v_month)::integer = 1;
    -- Sick leave every 2 months: January, March, May, July, September, November = 6 a year.
    v_sick_month := EXTRACT(MONTH FROM v_month)::integer % 2 = 1;

    FOR emp IN
        SELECT id
        FROM public.employees
        WHERE status = 'active'
          AND (p_employee_id IS NULL OR id = p_employee_id)
    LOOP
        FOREACH v_type IN ARRAY ARRAY['casual', 'sick']
        LOOP
            -- Casual is credited every month; sick only in odd months.
            CONTINUE WHEN v_type = 'sick' AND NOT v_sick_month;

            -- Yearly reset: record what lapses, before the row is reset below. Only for rows not
            -- yet processed this month, so a repeated run does not log twice.
            IF v_is_january THEN
                SELECT allocated_days, adjusted_days, used_days
                INTO v_old
                FROM public.employee_leave_balances
                WHERE employee_id = emp.id
                  AND leave_type = v_type
                  AND last_allocation_month IS DISTINCT FROM v_month;

                IF FOUND AND (COALESCE(v_old.allocated_days, 0) + COALESCE(v_old.adjusted_days, 0) - COALESCE(v_old.used_days, 0)) <> 0 THEN
                    BEGIN
                        INSERT INTO public.leave_balance_transactions (
                            employee_id, leave_type, transaction_type, days, reason
                        )
                        VALUES (
                            emp.id,
                            v_type,
                            'yearly_reset',
                            -(COALESCE(v_old.allocated_days, 0) + COALESCE(v_old.adjusted_days, 0) - COALESCE(v_old.used_days, 0)),
                            'Yearly reset ' || to_char(v_month, 'YYYY') || ': unused balance from ' || to_char(v_month - 1, 'YYYY') || ' lapsed'
                        );
                    EXCEPTION WHEN others THEN
                        -- The audit row is a record only; never let it block the allocation.
                        RAISE WARNING 'leave yearly reset: could not log lapse for % %: %', emp.id, v_type, SQLERRM;
                    END;
                END IF;
            END IF;

            INSERT INTO public.employee_leave_balances (
                employee_id, leave_type, allocated_days, adjusted_days, used_days, last_allocation_month
            )
            VALUES (emp.id, v_type, 1, 0, 0, v_month)
            ON CONFLICT (employee_id, leave_type)
            DO UPDATE SET
                allocated_days = CASE WHEN v_is_january THEN 1
                                      ELSE public.employee_leave_balances.allocated_days + 1 END,
                adjusted_days  = CASE WHEN v_is_january THEN 0
                                      ELSE public.employee_leave_balances.adjusted_days END,
                used_days      = CASE WHEN v_is_january THEN 0
                                      ELSE public.employee_leave_balances.used_days END,
                last_allocation_month = v_month,
                updated_at = now()
            WHERE public.employee_leave_balances.last_allocation_month IS DISTINCT FROM v_month;
        END LOOP;
    END LOOP;
END;
$function$;

-- Only the database owner and pg_cron may run it. (Functions are executable by PUBLIC by default,
-- which would let anyone signed in credit themselves leave for any month through the API.)
REVOKE ALL ON FUNCTION public.allocate_monthly_employee_leaves(date, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.allocate_monthly_employee_leaves(date, uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.allocate_monthly_employee_leaves(date, uuid) TO service_role;

COMMENT ON FUNCTION public.allocate_monthly_employee_leaves(date, uuid) IS
  'Monthly leave credit (pg_cron, 1st of month): +1 casual every month, +1 sick in odd months (6/yr); January resets the year to 1 casual + 1 sick and logs lapsed days.';
