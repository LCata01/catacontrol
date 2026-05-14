
-- ROLES
CREATE TYPE public.app_role AS ENUM ('superadmin', 'cashier', 'disabled');
CREATE TYPE public.workstation_kind AS ENUM ('bar', 'entry');
CREATE TYPE public.payment_method AS ENUM ('cash', 'qr', 'card');
CREATE TYPE public.staff_category AS ENUM ('dj','technical','security','photography','rrpp','owner','management','guest');
CREATE TYPE public.shift_kind AS ENUM ('bar','entry');

-- PROFILES (mirrors auth.users, stores username + display)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- USER ROLES (separate table per security best practice)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.current_username()
RETURNS TEXT LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT username FROM public.profiles WHERE id = auth.uid();
$$;

-- EVENTS
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  event_date DATE,
  event_time TIME,
  capacity INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft', -- draft|active|closed
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only one active event at a time
CREATE UNIQUE INDEX events_one_active ON public.events ((status='active')) WHERE status='active';

-- BARS
CREATE TABLE public.bars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT true
);

-- ENTRIES (entry terminals)
CREATE TABLE public.entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT true
);

-- PRODUCTS
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  cost NUMERIC(12,2),
  stock INT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- TICKET TYPES
CREATE TABLE public.ticket_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_complimentary BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true
);

-- WRISTBANDS
CREATE TABLE public.wristbands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true
);

-- STAFF MEMBERS
CREATE TABLE public.staff_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  category public.staff_category NOT NULL,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX staff_members_name_idx ON public.staff_members USING gin (to_tsvector('simple', full_name));

-- SHIFTS
CREATE TABLE public.shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind public.shift_kind NOT NULL,
  bar_id UUID REFERENCES public.bars(id),
  entry_id UUID REFERENCES public.entries(id),
  event_id UUID REFERENCES public.events(id),
  initial_cash NUMERIC(12,2) NOT NULL DEFAULT 0,
  actual_cash NUMERIC(12,2),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'open' -- open|closed
);
CREATE INDEX shifts_user_open_idx ON public.shifts(user_id) WHERE status='open';

-- SALES (bar + entry use same model; differentiated by shift.kind)
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_number BIGSERIAL UNIQUE,
  shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  event_id UUID REFERENCES public.events(id),
  bar_id UUID REFERENCES public.bars(id),
  entry_id UUID REFERENCES public.entries(id),
  payment_method public.payment_method NOT NULL,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  cancelled BOOLEAN NOT NULL DEFAULT false,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  item_kind TEXT NOT NULL, -- product|ticket|wristband
  product_id UUID REFERENCES public.products(id),
  ticket_type_id UUID REFERENCES public.ticket_types(id),
  wristband_id UUID REFERENCES public.wristbands(id),
  name TEXT NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  quantity INT NOT NULL DEFAULT 1,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0
);

-- STAFF CONSUMPTIONS
CREATE TABLE public.staff_consumptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  bar_id UUID REFERENCES public.bars(id),
  event_id UUID REFERENCES public.events(id),
  staff_member_id UUID NOT NULL REFERENCES public.staff_members(id),
  staff_name TEXT NOT NULL,
  staff_category public.staff_category NOT NULL,
  product_id UUID REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- COMPLIMENTARY TICKETS
CREATE TABLE public.complimentary_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  entry_id UUID REFERENCES public.entries(id),
  event_id UUID REFERENCES public.events(id),
  ticket_type_id UUID REFERENCES public.ticket_types(id),
  ticket_category TEXT NOT NULL,
  guest_name TEXT NOT NULL,
  notes TEXT,
  quantity INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AUDIT LOG
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity TEXT,
  entity_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ENABLE RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wristbands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_consumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complimentary_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- POLICIES
-- profiles: anyone authenticated can read profiles (needed for username lookup pre-login is via RPC); update by admin or self
CREATE POLICY "auth read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin all profiles" ON public.profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'superadmin')) WITH CHECK (public.has_role(auth.uid(),'superadmin'));

-- user_roles
CREATE POLICY "auth read roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'superadmin'));
CREATE POLICY "admin manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'superadmin')) WITH CHECK (public.has_role(auth.uid(),'superadmin'));

-- read-only catalogs for everyone authenticated; admin full write
CREATE POLICY "auth read events" ON public.events FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write events" ON public.events FOR ALL TO authenticated USING (public.has_role(auth.uid(),'superadmin')) WITH CHECK (public.has_role(auth.uid(),'superadmin'));

CREATE POLICY "auth read bars" ON public.bars FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write bars" ON public.bars FOR ALL TO authenticated USING (public.has_role(auth.uid(),'superadmin')) WITH CHECK (public.has_role(auth.uid(),'superadmin'));

CREATE POLICY "auth read entries" ON public.entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write entries" ON public.entries FOR ALL TO authenticated USING (public.has_role(auth.uid(),'superadmin')) WITH CHECK (public.has_role(auth.uid(),'superadmin'));

CREATE POLICY "auth read products" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write products" ON public.products FOR ALL TO authenticated USING (public.has_role(auth.uid(),'superadmin')) WITH CHECK (public.has_role(auth.uid(),'superadmin'));

CREATE POLICY "auth read ticket_types" ON public.ticket_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write ticket_types" ON public.ticket_types FOR ALL TO authenticated USING (public.has_role(auth.uid(),'superadmin')) WITH CHECK (public.has_role(auth.uid(),'superadmin'));

CREATE POLICY "auth read wristbands" ON public.wristbands FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write wristbands" ON public.wristbands FOR ALL TO authenticated USING (public.has_role(auth.uid(),'superadmin')) WITH CHECK (public.has_role(auth.uid(),'superadmin'));

CREATE POLICY "auth read staff" ON public.staff_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write staff" ON public.staff_members FOR ALL TO authenticated USING (public.has_role(auth.uid(),'superadmin')) WITH CHECK (public.has_role(auth.uid(),'superadmin'));

-- shifts: user manages own; admin sees all
CREATE POLICY "user read own shifts" ON public.shifts FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'superadmin'));
CREATE POLICY "user insert own shift" ON public.shifts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "user update own shift" ON public.shifts FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'superadmin'));
CREATE POLICY "admin delete shift" ON public.shifts FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'superadmin'));

-- sales
CREATE POLICY "user read own sales" ON public.sales FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'superadmin'));
CREATE POLICY "user insert own sales" ON public.sales FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "user update own sales" ON public.sales FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'superadmin'));

CREATE POLICY "read sale_items via parent" ON public.sale_items FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_id AND (s.user_id = auth.uid() OR public.has_role(auth.uid(),'superadmin')))
);
CREATE POLICY "insert sale_items via parent" ON public.sale_items FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_id AND s.user_id = auth.uid())
);

CREATE POLICY "user read own consumptions" ON public.staff_consumptions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'superadmin'));
CREATE POLICY "user insert own consumptions" ON public.staff_consumptions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "user read own comp" ON public.complimentary_tickets FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'superadmin'));
CREATE POLICY "user insert own comp" ON public.complimentary_tickets FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "admin read audit" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'superadmin'));
CREATE POLICY "auth insert audit" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- SEED catalog data
INSERT INTO public.bars(name) VALUES
('BARRA 1'),('BARRA 2'),('BARRA 3'),('BARRA 4'),('BARRA 5'),
('BARRA 6'),('BARRA 7'),('BARRA 8'),('BARRA 9'),('BARRA 10');

INSERT INTO public.entries(name) VALUES
('ENTRADA 1'),('ENTRADA 2'),('ENTRADA 3'),('ENTRADA 4'),('ENTRADA 5');

INSERT INTO public.products(name, category, price) VALUES
('BEER','DRINKS',3000),
('FERNET','DRINKS',5000),
('GIN TONIC','DRINKS',6000),
('WHISKY','DRINKS',7000),
('VODKA','DRINKS',6000),
('WATER','SOFT',1500),
('ENERGY DRINK','SOFT',4000),
('SODA','SOFT',2000);

INSERT INTO public.ticket_types(name, price, is_complimentary) VALUES
('GENERAL', 8000, false),
('VIP', 15000, false),
('GENERAL FREE', 0, true),
('VIP FREE', 0, true),
('BACKSTAGE FREE', 0, true);

INSERT INTO public.wristbands(name, price) VALUES
('CONSUMO 10000', 10000),
('CONSUMO 20000', 20000),
('VIP GOLD', 30000);

INSERT INTO public.events(name, event_date, capacity, status) VALUES
('VIERNES TEST', CURRENT_DATE, 1200, 'active');
