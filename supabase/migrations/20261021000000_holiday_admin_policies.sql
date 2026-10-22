-- Migration: Enable full admin management (INSERT, UPDATE, DELETE) for public holidays and branches
-- Tables: public.public_holidays, public.public_holiday_branches, public.official_public_holidays

ALTER TABLE IF EXISTS public.public_holidays ENABLE ROW LEVEL SECURITY;

-- Allow SELECT for all
DROP POLICY IF EXISTS "Anyone can view published public holidays" ON public.public_holidays;
CREATE POLICY "Anyone can view published public holidays"
ON public.public_holidays FOR SELECT
USING (true);

-- Allow full modifications for authenticated and anon users (and service role)
DROP POLICY IF EXISTS "Admins can insert public holidays" ON public.public_holidays;
CREATE POLICY "Admins can insert public holidays"
ON public.public_holidays FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update public holidays" ON public.public_holidays;
CREATE POLICY "Admins can update public holidays"
ON public.public_holidays FOR UPDATE
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can delete public holidays" ON public.public_holidays;
CREATE POLICY "Admins can delete public holidays"
ON public.public_holidays FOR DELETE
USING (true);

-- Public holiday branches policies
ALTER TABLE IF EXISTS public.public_holiday_branches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view public holiday branches" ON public.public_holiday_branches;
CREATE POLICY "Anyone can view public holiday branches"
ON public.public_holiday_branches FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admins can insert public holiday branches" ON public.public_holiday_branches;
CREATE POLICY "Admins can insert public holiday branches"
ON public.public_holiday_branches FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update public holiday branches" ON public.public_holiday_branches;
CREATE POLICY "Admins can update public holiday branches"
ON public.public_holiday_branches FOR UPDATE
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can delete public holiday branches" ON public.public_holiday_branches;
CREATE POLICY "Admins can delete public holiday branches"
ON public.public_holiday_branches FOR DELETE
USING (true);

-- Optional official_public_holidays table if created
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'official_public_holidays') THEN
    ALTER TABLE public.official_public_holidays ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Anyone can view official public holidays" ON public.official_public_holidays;
    CREATE POLICY "Anyone can view official public holidays" ON public.official_public_holidays FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Admins can delete official public holidays" ON public.official_public_holidays;
    CREATE POLICY "Admins can delete official public holidays" ON public.official_public_holidays FOR DELETE USING (true);
  END IF;
END $$;
