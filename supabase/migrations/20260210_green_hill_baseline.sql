-- Green Hill baseline
-- The later migrations were written against an inherited database where
-- `properties` and `user_profiles` already existed. On a fresh Green Hill
-- project those tables are missing, so the first ALTER would fail.
-- This file creates the minimum shape the later migrations expect.
-- Every statement is idempotent: on a database that already has these
-- tables it changes nothing.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_profiles' AND policyname = 'Users can read own profile'
  ) THEN
    CREATE POLICY "Users can read own profile"
      ON public.user_profiles FOR SELECT
      USING (auth.uid() = id);
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT '',
  description TEXT,
  address TEXT,
  price NUMERIC DEFAULT 0,
  bedrooms INTEGER DEFAULT 0,
  bathrooms INTEGER DEFAULT 0,
  m2 NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  property_type TEXT,
  surface_area TEXT,
  building_area TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
