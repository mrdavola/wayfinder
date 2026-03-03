-- Migration 005: Waitlist table for landing page signups
-- Run in Supabase SQL Editor
-- Safe to re-run: uses IF NOT EXISTS and drops existing policies first.

CREATE TABLE IF NOT EXISTS public.waitlist (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT        NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (idempotent)
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Drop existing policies before recreating (safe re-run)
DROP POLICY IF EXISTS "Anyone can join waitlist"   ON public.waitlist;
DROP POLICY IF EXISTS "Service role can read waitlist" ON public.waitlist;

-- Anyone (including anon users) can insert their email
CREATE POLICY "Anyone can join waitlist"
  ON public.waitlist
  FOR INSERT
  WITH CHECK (true);

-- Only authenticated service_role can read the waitlist
CREATE POLICY "Service role can read waitlist"
  ON public.waitlist
  FOR SELECT
  USING (auth.role() = 'service_role');
