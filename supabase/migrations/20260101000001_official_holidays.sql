-- Migration: Add official_public_holidays table

CREATE TABLE IF NOT EXISTS public.official_public_holidays (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    holiday_code text NOT NULL UNIQUE,
    holiday_name text NOT NULL,
    holiday_date date NOT NULL,
    holiday_type text NOT NULL DEFAULT 'gazetted'
        CHECK (
            holiday_type IN ('gazetted', 'restricted')
        ),
    jurisdiction text NOT NULL DEFAULT 'kerala',
    country_code text NOT NULL DEFAULT 'IN',
    source_name text,
    source_url text,
    source_year integer NOT NULL,
    is_paid boolean NOT NULL DEFAULT true,
    notes text,
    is_read_only boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (
        holiday_date,
        jurisdiction,
        source_year
    )
);

CREATE INDEX IF NOT EXISTS idx_official_holidays_date ON public.official_public_holidays(holiday_date);
CREATE INDEX IF NOT EXISTS idx_official_holidays_year ON public.official_public_holidays(source_year);
CREATE INDEX IF NOT EXISTS idx_official_holidays_jurisdiction ON public.official_public_holidays(jurisdiction);
CREATE INDEX IF NOT EXISTS idx_official_holidays_type ON public.official_public_holidays(holiday_type);

-- RLS
ALTER TABLE public.official_public_holidays ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read the official holiday data
CREATE POLICY "Authenticated users can view official public holidays" 
ON public.official_public_holidays 
FOR SELECT 
TO authenticated 
USING (true);

-- No INSERT/UPDATE/DELETE policies for authenticated users to enforce read-only
-- The secure backend sync/import process will bypass RLS by using the service_role key
