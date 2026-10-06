-- Migration: Seed upcoming mandatory Indian & Kerala public holidays for 2026 and 2027
-- Table: public.public_holidays & public.public_holiday_branches

-- Ensure RLS allows SELECT for all authenticated and anonymous clients
ALTER TABLE IF EXISTS public.public_holidays ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view published public holidays" ON public.public_holidays;
CREATE POLICY "Anyone can view published public holidays"
ON public.public_holidays FOR SELECT
USING (true);

ALTER TABLE IF EXISTS public.public_holiday_branches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view public holiday branches" ON public.public_holiday_branches;
CREATE POLICY "Anyone can view public holiday branches"
ON public.public_holiday_branches FOR SELECT
USING (true);

-- Temporary table to hold holiday seed definitions
CREATE TEMP TABLE temp_seed_holidays (
    code text,
    name text,
    holiday_date date,
    holiday_type text,
    notes text
) ON COMMIT DROP;

INSERT INTO temp_seed_holidays (code, name, holiday_date, holiday_type, notes) VALUES
-- 2026 Mandatory Indian & Kerala Public Holidays
('HOL-IN-2026-001', 'Republic Day', '2026-01-26', 'gazetted', 'Mandatory central statutory closure across operations (Republic Day)'),
('HOL-IN-2026-002', 'Maha Shivratri', '2026-02-15', 'gazetted', 'Gazetted holiday for Maha Shivratri'),
('HOL-IN-2026-003', 'Id-ul-Fitr (Ramzan)', '2026-03-20', 'gazetted', 'Mandatory statutory closure in Kerala (Id-ul-Fitr)'),
('HOL-IN-2026-004', 'Good Friday', '2026-04-03', 'gazetted', 'Mandatory statutory closure in Kerala (Good Friday)'),
('HOL-IN-2026-005', 'Dr. B.R. Ambedkar Jayanti / Vishu', '2026-04-14', 'gazetted', 'Mandatory statutory closure in Kerala (Vishu / Ambedkar Jayanti)'),
('HOL-IN-2026-006', 'May Day (International Workers'' Day)', '2026-05-01', 'gazetted', 'Mandatory statutory closure across Kerala and operations (May Day)'),
('HOL-IN-2026-007', 'Bakrid (Id-ul-Zuha)', '2026-05-27', 'gazetted', 'Mandatory statutory closure in Kerala (Bakrid)'),
('HOL-IN-2026-008', 'Muharram', '2026-06-26', 'gazetted', 'Gazetted holiday for Muharram'),
('HOL-IN-2026-009', 'Independence Day', '2026-08-15', 'gazetted', 'Mandatory central statutory closure across operations (Independence Day)'),
('HOL-IN-2026-010', 'First Onam', '2026-08-25', 'gazetted', 'Kerala State festival holiday (First Onam)'),
('HOL-IN-2026-011', 'Thiruvonam', '2026-08-26', 'gazetted', 'Mandatory statutory closure in Kerala (Thiruvonam)'),
('HOL-IN-2026-012', 'Third Onam / Milad-un-Nabi', '2026-08-27', 'gazetted', 'Kerala State festival / Gazetted holiday (Third Onam / Prophet''s Birthday)'),
('HOL-IN-2026-013', 'Fourth Onam / Sree Narayana Guru Jayanti', '2026-08-28', 'gazetted', 'Kerala State festival holiday (Sree Narayana Guru Jayanti)'),
('HOL-IN-2026-014', 'Sree Narayana Guru Samadhi', '2026-09-21', 'gazetted', 'Kerala State holiday (Sree Narayana Guru Samadhi)'),
('HOL-IN-2026-015', 'Mahatma Gandhi Jayanti', '2026-10-02', 'gazetted', 'Mandatory central statutory closure across operations (Gandhi Jayanti)'),
('HOL-IN-2026-016', 'Mahanavami (Ayudha Pooja)', '2026-10-19', 'gazetted', 'Kerala State / Gazetted holiday for Mahanavami'),
('HOL-IN-2026-017', 'Vijayadashami (Dussehra)', '2026-10-20', 'gazetted', 'Kerala State / Gazetted holiday for Vijayadashami'),
('HOL-IN-2026-018', 'Deepavali (Diwali)', '2026-11-08', 'gazetted', 'Gazetted festival holiday for Deepavali'),
('HOL-IN-2026-019', 'Christmas', '2026-12-25', 'gazetted', 'Mandatory statutory closure across operations (Christmas)'),

-- 2027 Upcoming Mandatory Indian & Kerala Public Holidays
('HOL-IN-2027-001', 'New Year''s Day', '2027-01-01', 'restricted', 'Optional roster choice for regional hubs (New Year''s Day)'),
('HOL-IN-2027-002', 'Republic Day', '2027-01-26', 'gazetted', 'Mandatory central statutory closure across operations (Republic Day)'),
('HOL-IN-2027-003', 'Maha Shivratri', '2027-03-06', 'gazetted', 'Gazetted holiday for Maha Shivratri'),
('HOL-IN-2027-004', 'Id-ul-Fitr (Ramzan)', '2027-03-10', 'gazetted', 'Mandatory statutory closure in Kerala (Id-ul-Fitr)'),
('HOL-IN-2027-005', 'Good Friday', '2027-03-26', 'gazetted', 'Mandatory statutory closure in Kerala (Good Friday)'),
('HOL-IN-2027-006', 'Dr. B.R. Ambedkar Jayanti / Vishu', '2027-04-14', 'gazetted', 'Mandatory statutory closure in Kerala (Vishu / Ambedkar Jayanti)'),
('HOL-IN-2027-007', 'May Day (International Workers'' Day)', '2027-05-01', 'gazetted', 'Mandatory statutory closure across Kerala and operations (May Day)'),
('HOL-IN-2027-008', 'Bakrid (Id-ul-Zuha)', '2027-05-16', 'gazetted', 'Mandatory statutory closure in Kerala (Bakrid)'),
('HOL-IN-2027-009', 'Muharram', '2027-07-16', 'gazetted', 'Gazetted holiday for Muharram'),
('HOL-IN-2027-010', 'Independence Day', '2027-08-15', 'gazetted', 'Mandatory central statutory closure across operations (Independence Day)'),
('HOL-IN-2027-011', 'Thiruvonam (Onam)', '2027-09-13', 'gazetted', 'Mandatory statutory closure in Kerala (Thiruvonam)'),
('HOL-IN-2027-012', 'Third Onam / Sree Narayana Guru Jayanti', '2027-09-14', 'gazetted', 'Kerala State festival holiday (Sree Narayana Guru Jayanti)'),
('HOL-IN-2027-013', 'Sree Narayana Guru Samadhi', '2027-09-21', 'gazetted', 'Kerala State holiday (Sree Narayana Guru Samadhi)'),
('HOL-IN-2027-014', 'Mahatma Gandhi Jayanti', '2027-10-02', 'gazetted', 'Mandatory central statutory closure across operations (Gandhi Jayanti)'),
('HOL-IN-2027-015', 'Mahanavami (Ayudha Pooja)', '2027-10-09', 'gazetted', 'Kerala State / Gazetted holiday for Mahanavami'),
('HOL-IN-2027-016', 'Vijayadashami (Dussehra)', '2027-10-10', 'gazetted', 'Kerala State / Gazetted holiday for Vijayadashami'),
('HOL-IN-2027-017', 'Deepavali (Diwali)', '2027-10-29', 'gazetted', 'Gazetted festival holiday for Deepavali'),
('HOL-IN-2027-018', 'Christmas', '2027-12-25', 'gazetted', 'Mandatory statutory closure across operations (Christmas)');

-- Insert into public.public_holidays if not already present
INSERT INTO public.public_holidays (
    holiday_code,
    holiday_name,
    holiday_date,
    holiday_type,
    is_paid,
    status,
    notes,
    created_at,
    updated_at
)
SELECT 
    s.code,
    s.name,
    s.holiday_date,
    s.holiday_type,
    true,
    'published',
    s.notes,
    NOW(),
    NOW()
FROM temp_seed_holidays s
WHERE NOT EXISTS (
    SELECT 1 FROM public.public_holidays ph 
    WHERE ph.holiday_date = s.holiday_date 
       OR ph.holiday_code = s.code
);

-- Ensure all pan-India and Kerala branches ('dl', 'mh', 'ka', 'kl', 'ts') are linked
INSERT INTO public.public_holiday_branches (holiday_id, branch_code)
SELECT ph.id, b.branch_code
FROM public.public_holidays ph
CROSS JOIN (VALUES ('dl'), ('mh'), ('ka'), ('kl'), ('ts')) AS b(branch_code)
WHERE NOT EXISTS (
    SELECT 1 FROM public.public_holiday_branches phb
    WHERE phb.holiday_id = ph.id AND phb.branch_code = b.branch_code
);
