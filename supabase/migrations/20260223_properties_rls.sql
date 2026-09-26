-- Enable Row Level Security on properties table
-- SELECT remains public (listings are public), mutations restricted to owner

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- Anyone can read all properties (public listings)
CREATE POLICY "Allow public read"
  ON properties
  FOR SELECT
  USING (true);

-- Authenticated users can insert their own properties
CREATE POLICY "Owners can insert own properties"
  ON properties
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Only the owner can update their properties
CREATE POLICY "Owners can update own properties"
  ON properties
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Only the owner can delete their properties
CREATE POLICY "Owners can delete own properties"
  ON properties
  FOR DELETE
  USING (auth.uid() = user_id);
