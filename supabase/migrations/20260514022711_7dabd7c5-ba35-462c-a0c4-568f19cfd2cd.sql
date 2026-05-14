CREATE TABLE public.app_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  nightclub_name text NOT NULL DEFAULT 'CATA CLUB',
  slogan text NOT NULL DEFAULT 'Gracias por acompañarnos',
  logo_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read settings" ON public.app_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin write settings" ON public.app_settings
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

INSERT INTO public.app_settings (id) VALUES (true) ON CONFLICT DO NOTHING;