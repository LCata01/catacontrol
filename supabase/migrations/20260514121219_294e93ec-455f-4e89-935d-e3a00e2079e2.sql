
-- ============================================================================
-- MULTI-TENANT REFACTOR
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. companies table
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  subdomain text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- 2. Seed TEMPLO with bcrypted password
INSERT INTO public.companies (name, code, password_hash)
VALUES ('Templo', 'TEMPLO', crypt('mrodriguez', gen_salt('bf', 10)));

-- 3. Add platform_admin to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'platform_admin';
