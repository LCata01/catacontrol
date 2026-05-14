
-- ============================================================================
-- 1. ADD company_id TO ALL BUSINESS TABLES + BACKFILL TO TEMPLO
-- ============================================================================

DO $$
DECLARE
  templo_id uuid := (SELECT id FROM public.companies WHERE code = 'TEMPLO');
  t text;
  tables text[] := ARRAY[
    'profiles','user_roles','bars','entries','events','products',
    'product_categories','staff_members','staff_categories','ticket_types',
    'wristbands','shifts','sales','staff_consumptions','complimentary_tickets',
    'audit_logs'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE',
      t
    );
    EXECUTE format(
      'UPDATE public.%I SET company_id = %L WHERE company_id IS NULL',
      t, templo_id
    );
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON public.%I(company_id)',
      'idx_' || t || '_company_id', t
    );
  END LOOP;
END $$;

-- app_settings: convert single-row -> per-tenant
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
UPDATE public.app_settings SET company_id = (SELECT id FROM public.companies WHERE code='TEMPLO') WHERE company_id IS NULL;
ALTER TABLE public.app_settings DROP CONSTRAINT IF EXISTS app_settings_pkey;
ALTER TABLE public.app_settings DROP COLUMN IF EXISTS id;
ALTER TABLE public.app_settings ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.app_settings ADD PRIMARY KEY (company_id);

-- ============================================================================
-- 2. HELPER FUNCTIONS (now safe — columns exist)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'platform_admin'::app_role
  );
$$;

CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid();
$$;

REVOKE EXECUTE ON FUNCTION public.is_platform_admin(uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.current_company_id() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_company_id() TO authenticated;

-- ============================================================================
-- 3. NOT NULL + DEFAULTS
-- ============================================================================

ALTER TABLE public.bars                ALTER COLUMN company_id SET NOT NULL, ALTER COLUMN company_id SET DEFAULT public.current_company_id();
ALTER TABLE public.entries             ALTER COLUMN company_id SET NOT NULL, ALTER COLUMN company_id SET DEFAULT public.current_company_id();
ALTER TABLE public.events              ALTER COLUMN company_id SET NOT NULL, ALTER COLUMN company_id SET DEFAULT public.current_company_id();
ALTER TABLE public.products            ALTER COLUMN company_id SET NOT NULL, ALTER COLUMN company_id SET DEFAULT public.current_company_id();
ALTER TABLE public.product_categories  ALTER COLUMN company_id SET NOT NULL, ALTER COLUMN company_id SET DEFAULT public.current_company_id();
ALTER TABLE public.staff_members       ALTER COLUMN company_id SET NOT NULL, ALTER COLUMN company_id SET DEFAULT public.current_company_id();
ALTER TABLE public.staff_categories    ALTER COLUMN company_id SET NOT NULL, ALTER COLUMN company_id SET DEFAULT public.current_company_id();
ALTER TABLE public.ticket_types        ALTER COLUMN company_id SET NOT NULL, ALTER COLUMN company_id SET DEFAULT public.current_company_id();
ALTER TABLE public.wristbands          ALTER COLUMN company_id SET NOT NULL, ALTER COLUMN company_id SET DEFAULT public.current_company_id();
ALTER TABLE public.shifts              ALTER COLUMN company_id SET NOT NULL, ALTER COLUMN company_id SET DEFAULT public.current_company_id();
ALTER TABLE public.sales               ALTER COLUMN company_id SET NOT NULL, ALTER COLUMN company_id SET DEFAULT public.current_company_id();
ALTER TABLE public.staff_consumptions  ALTER COLUMN company_id SET NOT NULL, ALTER COLUMN company_id SET DEFAULT public.current_company_id();
ALTER TABLE public.complimentary_tickets ALTER COLUMN company_id SET NOT NULL, ALTER COLUMN company_id SET DEFAULT public.current_company_id();
ALTER TABLE public.audit_logs          ALTER COLUMN company_id SET DEFAULT public.current_company_id();
ALTER TABLE public.user_roles          ALTER COLUMN company_id SET DEFAULT public.current_company_id();
-- profiles.company_id stays nullable (platform_admin has no company)

-- ============================================================================
-- 4. RESTRICTIVE TENANT-ISOLATION POLICIES
-- ============================================================================

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'profiles','user_roles','bars','entries','events','products',
    'product_categories','staff_members','staff_categories','ticket_types',
    'wristbands','shifts','sales','staff_consumptions','complimentary_tickets',
    'audit_logs','app_settings'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON public.%I', t);
    EXECUTE format($q$
      CREATE POLICY tenant_isolation ON public.%I
      AS RESTRICTIVE FOR ALL TO authenticated
      USING (
        public.is_platform_admin(auth.uid())
        OR company_id = public.current_company_id()
      )
      WITH CHECK (
        public.is_platform_admin(auth.uid())
        OR company_id = public.current_company_id()
      )
    $q$, t);
  END LOOP;
END $$;

-- sale_items: tenant-isolated through parent sale
DROP POLICY IF EXISTS tenant_isolation ON public.sale_items;
CREATE POLICY tenant_isolation ON public.sale_items
AS RESTRICTIVE FOR ALL TO authenticated
USING (
  public.is_platform_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.sales s
    WHERE s.id = sale_items.sale_id
      AND s.company_id = public.current_company_id()
  )
)
WITH CHECK (
  public.is_platform_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.sales s
    WHERE s.id = sale_items.sale_id
      AND s.company_id = public.current_company_id()
  )
);

-- ============================================================================
-- 5. COMPANIES POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "users read their own company" ON public.companies;
CREATE POLICY "users read their own company"
ON public.companies FOR SELECT TO authenticated
USING (
  id = public.current_company_id()
  OR public.is_platform_admin(auth.uid())
);

DROP POLICY IF EXISTS "platform admin manages companies" ON public.companies;
CREATE POLICY "platform admin manages companies"
ON public.companies FOR ALL TO authenticated
USING (public.is_platform_admin(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()));
