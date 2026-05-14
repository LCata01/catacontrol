CREATE TABLE public.product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read product_categories"
  ON public.product_categories FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin write product_categories"
  ON public.product_categories FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

INSERT INTO public.product_categories (name)
SELECT DISTINCT category FROM public.products
WHERE category IS NOT NULL AND category <> ''
ON CONFLICT (name) DO NOTHING;