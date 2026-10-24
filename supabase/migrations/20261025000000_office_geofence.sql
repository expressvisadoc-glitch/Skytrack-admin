-- Migration: 20261025000000_office_geofence.sql
-- Description: Admin-configurable office geofence, attendance location events, and an atomic
-- RPC that enforces the geofence for check-in / check-out while preserving the existing
-- attendance state machine (public.start_work / end_work / start_break / resume_work).
--
-- Location accuracy policy (documented here and in the Admin Portal):
--   * A fix must carry latitude, longitude, horizontal accuracy (metres) and the time it was captured.
--   * Fixes captured more than 60 seconds after server receipt are rejected as implausible (device clock / replay).
--   * Fixes older than max_location_age_s (default 120 s) are rejected as stale.
--   * Fixes whose reported accuracy is worse than max_accuracy_m (default 50 m) are rejected.
--   * Fixes the device flags as mock / simulated are rejected for check-in and check-out.
--   * Inside = great-circle distance from the office to the reported point <= radius_m.
--     Accuracy is NOT added as tolerance, so a poor fix can never widen the fence.
-- Only check-in (start_work) and check-out (end_work) are blocked by this policy. Break start / resume
-- always proceed and record whatever location was supplied, with its validation status.
-- GPS evidence is not proof of physical presence; this raises the cost of spoofing but cannot prevent it.

-- ---------------------------------------------------------------------------
-- 0. Preconditions: the existing attendance RPCs must exist with the expected signature.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY['start_work', 'end_work', 'start_break', 'resume_work'] LOOP
    IF to_regprocedure(format('public.%I(uuid)', fn)) IS NULL THEN
      RAISE EXCEPTION 'office_geofence migration requires existing function public.%(uuid)', fn;
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 1. Office geofence settings (single row, id = 1)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.office_geofence_settings (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    office_name TEXT CHECK (office_name IS NULL OR char_length(office_name) <= 120),
    latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    radius_m INTEGER NOT NULL DEFAULT 100 CHECK (radius_m BETWEEN 10 AND 5000),
    is_active BOOLEAN NOT NULL DEFAULT true,
    max_accuracy_m INTEGER NOT NULL DEFAULT 50 CHECK (max_accuracy_m BETWEEN 5 AND 500),
    max_location_age_s INTEGER NOT NULL DEFAULT 120 CHECK (max_location_age_s BETWEEN 10 AND 600),
    updated_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT office_geofence_not_null_island CHECK (NOT (latitude = 0 AND longitude = 0))
);

-- 2. Audit trail of every settings change
CREATE TABLE IF NOT EXISTS public.office_geofence_settings_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    office_name TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    radius_m INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL,
    max_accuracy_m INTEGER NOT NULL,
    max_location_age_s INTEGER NOT NULL,
    changed_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_office_geofence_history_changed_at
ON public.office_geofence_settings_history(changed_at DESC);

-- 3. Location evidence for every attendance action (accepted and geofence-rejected)
CREATE TABLE IF NOT EXISTS public.attendance_location_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    attendance_id UUID REFERENCES public.attendance(id) ON DELETE SET NULL,
    action TEXT NOT NULL CHECK (action IN ('start_work', 'end_work', 'start_break', 'resume_work')),
    outcome TEXT NOT NULL CHECK (outcome IN ('accepted', 'rejected', 'no_change')),
    reason_code TEXT,
    location_status TEXT NOT NULL CHECK (location_status IN ('valid', 'missing', 'invalid', 'future', 'stale', 'low_accuracy', 'mock')),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    accuracy_m DOUBLE PRECISION,
    client_captured_at TIMESTAMPTZ,
    client_location_age_ms BIGINT,
    is_mock BOOLEAN,
    client_platform TEXT CHECK (client_platform IS NULL OR char_length(client_platform) <= 20),
    distance_m DOUBLE PRECISION,
    geofence_enforced BOOLEAN NOT NULL,
    geofence_radius_m INTEGER,
    geofence_latitude DOUBLE PRECISION,
    geofence_longitude DOUBLE PRECISION,
    geofence_settings_updated_at TIMESTAMPTZ,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attendance_location_events_employee
ON public.attendance_location_events(employee_id, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_location_events_attendance
ON public.attendance_location_events(attendance_id);

-- ---------------------------------------------------------------------------
-- 4. Row Level Security
--    Writes happen only through the SkyTrack Edge Function (service role) via the RPCs below.
-- ---------------------------------------------------------------------------
ALTER TABLE public.office_geofence_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_geofence_settings_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_location_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.office_geofence_settings FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.office_geofence_settings_history FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.attendance_location_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.office_geofence_settings TO authenticated;
GRANT SELECT ON public.office_geofence_settings_history TO authenticated;
GRANT SELECT ON public.attendance_location_events TO authenticated;
GRANT ALL ON public.office_geofence_settings TO service_role;
GRANT ALL ON public.office_geofence_settings_history TO service_role;
GRANT ALL ON public.attendance_location_events TO service_role;

DROP POLICY IF EXISTS "Admins can view office geofence settings" ON public.office_geofence_settings;
CREATE POLICY "Admins can view office geofence settings"
ON public.office_geofence_settings FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.employees WHERE auth_user_id = auth.uid() AND role IN ('admin', 'super_admin'))
);

DROP POLICY IF EXISTS "Admins can view office geofence history" ON public.office_geofence_settings_history;
CREATE POLICY "Admins can view office geofence history"
ON public.office_geofence_settings_history FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.employees WHERE auth_user_id = auth.uid() AND role IN ('admin', 'super_admin'))
);

DROP POLICY IF EXISTS "Employees can view own location events" ON public.attendance_location_events;
CREATE POLICY "Employees can view own location events"
ON public.attendance_location_events FOR SELECT TO authenticated
USING (
  employee_id IN (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())
);

DROP POLICY IF EXISTS "Admins can view all location events" ON public.attendance_location_events;
CREATE POLICY "Admins can view all location events"
ON public.attendance_location_events FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.employees WHERE auth_user_id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- ---------------------------------------------------------------------------
-- 5. Distance helper (haversine, metres; no PostGIS dependency)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.geofence_distance_m(
    lat1 DOUBLE PRECISION,
    lon1 DOUBLE PRECISION,
    lat2 DOUBLE PRECISION,
    lon2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION
LANGUAGE sql
IMMUTABLE
STRICT
AS $$
  SELECT 2 * 6371008.8 * asin(least(1.0, sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lon2 - lon1) / 2), 2)
  )));
$$;

-- ---------------------------------------------------------------------------
-- 6. Save settings (admin only, atomic with audit history)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.save_office_geofence_settings(
    p_admin_id UUID,
    p_office_name TEXT,
    p_latitude DOUBLE PRECISION,
    p_longitude DOUBLE PRECISION,
    p_radius_m INTEGER,
    p_is_active BOOLEAN,
    p_max_accuracy_m INTEGER,
    p_max_location_age_s INTEGER
) RETURNS public.office_geofence_settings
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_row public.office_geofence_settings;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.employees
    WHERE id = p_admin_id
      AND status = 'active'
      AND role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Only active administrators can change office geofence settings.'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.office_geofence_settings AS s (
    id, office_name, latitude, longitude, radius_m, is_active,
    max_accuracy_m, max_location_age_s, updated_by, updated_at
  ) VALUES (
    1, NULLIF(btrim(p_office_name), ''), p_latitude, p_longitude, p_radius_m, p_is_active,
    p_max_accuracy_m, p_max_location_age_s, p_admin_id, now()
  )
  ON CONFLICT (id) DO UPDATE SET
    office_name = EXCLUDED.office_name,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    radius_m = EXCLUDED.radius_m,
    is_active = EXCLUDED.is_active,
    max_accuracy_m = EXCLUDED.max_accuracy_m,
    max_location_age_s = EXCLUDED.max_location_age_s,
    updated_by = EXCLUDED.updated_by,
    updated_at = EXCLUDED.updated_at
  RETURNING s.* INTO v_row;

  INSERT INTO public.office_geofence_settings_history (
    office_name, latitude, longitude, radius_m, is_active,
    max_accuracy_m, max_location_age_s, changed_by, changed_at
  ) VALUES (
    v_row.office_name, v_row.latitude, v_row.longitude, v_row.radius_m, v_row.is_active,
    v_row.max_accuracy_m, v_row.max_location_age_s, p_admin_id, v_row.updated_at
  );

  RETURN v_row;
END;
$$;

-- ---------------------------------------------------------------------------
-- 7. Attendance action with location (atomic: geofence check + state change + location event)
-- Returns jsonb: { ok, error?, location_status, distance_m, radius_m, attendance? }
-- Exceptions raised by the existing attendance RPCs (e.g. checkout while on break) propagate
-- unchanged and roll back the location event with them.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.attendance_action_with_location(
    p_employee_id UUID,
    p_action TEXT,
    p_latitude DOUBLE PRECISION DEFAULT NULL,
    p_longitude DOUBLE PRECISION DEFAULT NULL,
    p_accuracy_m DOUBLE PRECISION DEFAULT NULL,
    p_captured_at TIMESTAMPTZ DEFAULT NULL,
    p_location_age_ms BIGINT DEFAULT NULL,
    p_is_mock BOOLEAN DEFAULT NULL,
    p_client_platform TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  -- Fixed tolerance for device clocks running ahead of the server.
  c_future_skew CONSTANT INTERVAL := INTERVAL '60 seconds';
  v_received_at TIMESTAMPTZ := now();
  v_enforce BOOLEAN := p_action IN ('start_work', 'end_work');
  v_cfg public.office_geofence_settings;
  v_has_cfg BOOLEAN;
  v_max_age_s INTEGER;
  v_max_accuracy_m INTEGER;
  v_coords_valid BOOLEAN;
  v_location_status TEXT;
  v_distance DOUBLE PRECISION;
  v_error TEXT;
  v_attendance JSONB;
  v_attendance_id UUID;
  v_outcome TEXT;
BEGIN
  IF p_action IS NULL OR p_action NOT IN ('start_work', 'end_work', 'start_break', 'resume_work') THEN
    RAISE EXCEPTION 'Unsupported attendance action: %', p_action USING ERRCODE = '22023';
  END IF;

  -- Serialise concurrent attendance actions for the same employee.
  PERFORM pg_advisory_xact_lock(hashtextextended('skytrack_attendance:' || p_employee_id::text, 0));

  SELECT * INTO v_cfg FROM public.office_geofence_settings WHERE id = 1;
  v_has_cfg := FOUND;
  v_max_age_s := COALESCE(v_cfg.max_location_age_s, 120);
  v_max_accuracy_m := COALESCE(v_cfg.max_accuracy_m, 50);

  v_coords_valid := p_latitude IS NOT NULL AND p_longitude IS NOT NULL
    AND p_latitude BETWEEN -90 AND 90
    AND p_longitude BETWEEN -180 AND 180
    AND NOT (p_latitude = 0 AND p_longitude = 0);

  v_location_status := CASE
    WHEN p_latitude IS NULL OR p_longitude IS NULL THEN 'missing'
    WHEN NOT v_coords_valid THEN 'invalid'
    WHEN p_accuracy_m IS NULL OR p_accuracy_m = 'NaN'::float8 OR p_accuracy_m <= 0 OR p_accuracy_m > 100000 THEN 'invalid'
    WHEN p_captured_at IS NULL OR (p_location_age_ms IS NOT NULL AND p_location_age_ms < 0) THEN 'invalid'
    WHEN p_captured_at > v_received_at + c_future_skew THEN 'future'
    WHEN v_received_at - p_captured_at > make_interval(secs => v_max_age_s)
      OR (p_location_age_ms IS NOT NULL AND p_location_age_ms > v_max_age_s * 1000::BIGINT) THEN 'stale'
    WHEN p_accuracy_m > v_max_accuracy_m THEN 'low_accuracy'
    WHEN COALESCE(p_is_mock, false) THEN 'mock'
    ELSE 'valid'
  END;

  IF v_has_cfg AND v_coords_valid THEN
    v_distance := public.geofence_distance_m(v_cfg.latitude, v_cfg.longitude, p_latitude, p_longitude);
  END IF;

  IF v_enforce THEN
    v_error := CASE
      WHEN NOT v_has_cfg THEN 'geofence_not_configured'
      WHEN NOT v_cfg.is_active THEN 'geofence_inactive'
      WHEN v_location_status = 'missing' THEN 'location_required'
      WHEN v_location_status = 'invalid' THEN 'invalid_location'
      WHEN v_location_status = 'future' THEN 'location_timestamp_invalid'
      WHEN v_location_status = 'stale' THEN 'location_stale'
      WHEN v_location_status = 'low_accuracy' THEN 'location_accuracy_too_low'
      WHEN v_location_status = 'mock' THEN 'mock_location_detected'
      WHEN v_distance > v_cfg.radius_m THEN 'outside_geofence'
      ELSE NULL
    END;
  END IF;

  IF v_error IS NULL THEN
    CASE p_action
      WHEN 'start_work' THEN
        SELECT to_jsonb(r) INTO v_attendance FROM public.start_work(p_employee_id) AS r LIMIT 1;
      WHEN 'end_work' THEN
        SELECT to_jsonb(r) INTO v_attendance FROM public.end_work(p_employee_id) AS r LIMIT 1;
      WHEN 'start_break' THEN
        SELECT to_jsonb(r) INTO v_attendance FROM public.start_break(p_employee_id) AS r LIMIT 1;
      WHEN 'resume_work' THEN
        SELECT to_jsonb(r) INTO v_attendance FROM public.resume_work(p_employee_id) AS r LIMIT 1;
    END CASE;
    v_outcome := CASE WHEN v_attendance IS NULL THEN 'no_change' ELSE 'accepted' END;
  ELSE
    v_outcome := 'rejected';
  END IF;

  IF v_attendance ? 'id' THEN
    v_attendance_id := (v_attendance->>'id')::UUID;
  ELSE
    SELECT a.id INTO v_attendance_id
    FROM public.attendance a
    WHERE a.employee_id = p_employee_id
      AND a.attendance_date = (v_received_at AT TIME ZONE 'Asia/Kolkata')::DATE;
  END IF;

  INSERT INTO public.attendance_location_events (
    employee_id, attendance_id, action, outcome, reason_code, location_status,
    latitude, longitude, accuracy_m, client_captured_at, client_location_age_ms, is_mock,
    client_platform, distance_m, geofence_enforced, geofence_radius_m,
    geofence_latitude, geofence_longitude, geofence_settings_updated_at, received_at
  ) VALUES (
    p_employee_id, v_attendance_id, p_action, v_outcome, v_error, v_location_status,
    CASE WHEN v_coords_valid THEN p_latitude END,
    CASE WHEN v_coords_valid THEN p_longitude END,
    CASE WHEN p_accuracy_m BETWEEN 0 AND 100000 THEN p_accuracy_m END,
    p_captured_at, p_location_age_ms, p_is_mock,
    left(p_client_platform, 20), v_distance, v_enforce, v_cfg.radius_m,
    v_cfg.latitude, v_cfg.longitude, v_cfg.updated_at, v_received_at
  );

  RETURN jsonb_build_object(
    'ok', v_error IS NULL,
    'error', v_error,
    'location_status', v_location_status,
    'distance_m', v_distance,
    'radius_m', v_cfg.radius_m,
    'max_accuracy_m', v_max_accuracy_m,
    'max_location_age_s', v_max_age_s,
    'accuracy_m', p_accuracy_m,
    'received_at', v_received_at,
    'attendance', v_attendance
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 8. Function privileges
--    The attendance RPCs are only callable by the Edge Function (service role), so employees cannot
--    bypass geofence validation by calling /rest/v1/rpc/start_work directly with their own JWT.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  fn regprocedure;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.start_work(uuid)'::regprocedure,
    'public.end_work(uuid)'::regprocedure,
    'public.start_break(uuid)'::regprocedure,
    'public.resume_work(uuid)'::regprocedure,
    'public.save_office_geofence_settings(uuid, text, double precision, double precision, integer, boolean, integer, integer)'::regprocedure,
    'public.attendance_action_with_location(uuid, text, double precision, double precision, double precision, timestamptz, bigint, boolean, text)'::regprocedure
  ] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
  END LOOP;
END $$;
