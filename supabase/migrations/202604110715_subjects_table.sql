-- Create subjects table
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to do everything
DROP POLICY IF EXISTS "Allow all for authenticated users" ON subjects;
CREATE POLICY "Allow all for authenticated users" ON subjects
  FOR ALL USING (true) WITH CHECK (true);