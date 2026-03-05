-- Buddy pairing: guide-level toggle
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS buddy_pairing_enabled BOOLEAN DEFAULT FALSE;

-- Allow anon to read profiles (for buddy pairing check)
DO $$ BEGIN
  CREATE POLICY "Anon can read profiles" ON profiles FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
