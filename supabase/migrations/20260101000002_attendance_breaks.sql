-- Migration: 20260101000002_attendance_breaks.sql
-- Description: Add worked_minutes and break_minutes to attendance, create attendance_breaks table, and configure RLS.

-- 1. Extend attendance table with worked_minutes and break_minutes in integer minutes
ALTER TABLE public.attendance 
ADD COLUMN IF NOT EXISTS worked_minutes INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS break_minutes INTEGER DEFAULT NULL;

-- 2. Create attendance_breaks table
CREATE TABLE IF NOT EXISTS public.attendance_breaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attendance_id UUID NOT NULL REFERENCES public.attendance(id) ON DELETE CASCADE,
    break_start TIMESTAMPTZ NOT NULL DEFAULT now(),
    break_end TIMESTAMPTZ DEFAULT NULL,
    break_minutes INTEGER DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create indexes for performance and rapid lookup of active breaks
CREATE INDEX IF NOT EXISTS idx_attendance_breaks_attendance_id 
ON public.attendance_breaks(attendance_id);

CREATE INDEX IF NOT EXISTS idx_attendance_breaks_active 
ON public.attendance_breaks(attendance_id) 
WHERE break_end IS NULL;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.attendance_breaks ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies: Authenticated employees can view their own breaks
DROP POLICY IF EXISTS "Employees can view own attendance breaks" ON public.attendance_breaks;
CREATE POLICY "Employees can view own attendance breaks"
ON public.attendance_breaks
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.attendance a
    JOIN public.employees e ON a.employee_id = e.id
    WHERE a.id = attendance_breaks.attendance_id
      AND e.auth_user_id = auth.uid()
  )
);

-- 6. RLS Policies: Admins can view all attendance breaks
DROP POLICY IF EXISTS "Admins can view all attendance breaks" ON public.attendance_breaks;
CREATE POLICY "Admins can view all attendance breaks"
ON public.attendance_breaks
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.auth_user_id = auth.uid()
      AND (e.role IN ('admin', 'super_admin', 'manager', 'system_admin') OR e.is_admin = true)
  )
);

-- Note: Mutations (INSERT, UPDATE, DELETE) are executed authoritatively via the SkyTrack Edge Function
-- using the Supabase Service Role Key, preventing client-side tampering of break/attendance durations.
