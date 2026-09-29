-- Migration: Add role to employees table to support Admin Portal authorization

-- Assuming the `employees` table already exists. We add a `role` column.
-- Defaulting to 'employee' so existing normal employees only get standard access.
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'employee' CHECK (role IN ('employee', 'admin', 'super_admin'));

-- Ensure RLS is enabled on the employees table
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Optional: Add an index on user_id and role to speed up authorization checks
CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(user_id, role);

-- NOTE: If you prefer not to modify the `employees` table directly, 
-- you can create a dedicated `admin_roles` table instead:
-- 
-- CREATE TABLE admin_roles (
--   user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
--   role text NOT NULL CHECK (role IN ('admin', 'super_admin')),
--   created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
-- );
-- ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Admins can view their own role" ON admin_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
-- 
-- If you use the `admin_roles` table approach, make sure to update `src/contexts/AuthContext.tsx`
-- to query `admin_roles` instead of `employees`.
