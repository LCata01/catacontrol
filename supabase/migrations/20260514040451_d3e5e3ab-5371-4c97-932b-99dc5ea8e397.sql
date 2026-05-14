
-- Create staff_categories table
CREATE TABLE public.staff_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read staff_categories" ON public.staff_categories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin write staff_categories" ON public.staff_categories
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

-- Seed with current enum values (human-readable labels)
INSERT INTO public.staff_categories (name) VALUES
  ('DJ'),
  ('Técnico'),
  ('Seguridad'),
  ('Fotografía'),
  ('RRPP'),
  ('Dueño'),
  ('Gerencia'),
  ('Invitado')
ON CONFLICT (name) DO NOTHING;

-- Convert staff_members.category from enum to text so it accepts any category name
ALTER TABLE public.staff_members ALTER COLUMN category TYPE TEXT USING category::text;
ALTER TABLE public.staff_consumptions ALTER COLUMN staff_category TYPE TEXT USING staff_category::text;
