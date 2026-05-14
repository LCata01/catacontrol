
-- 1) Helper: generate terminal code from name (first letter of word1 + first letter of word2 + trailing number)
CREATE OR REPLACE FUNCTION public.gen_terminal_code(_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  parts text[];
  letters text := '';
  num text := '';
  m text[];
  cleaned text;
BEGIN
  cleaned := upper(regexp_replace(coalesce(_name, ''), '\d+\s*$', ''));
  cleaned := trim(cleaned);
  parts := regexp_split_to_array(cleaned, '\s+');
  IF array_length(parts, 1) >= 1 AND length(parts[1]) > 0 THEN
    letters := letters || substring(parts[1] from 1 for 1);
  END IF;
  IF array_length(parts, 1) >= 2 AND length(parts[2]) > 0 THEN
    letters := letters || substring(parts[2] from 1 for 1);
  END IF;
  m := regexp_matches(coalesce(_name, ''), '(\d+)\s*$');
  IF m IS NOT NULL THEN num := m[1]; END IF;
  RETURN letters || num;
END $$;

-- 2) Add terminal_code column to bars and entries
ALTER TABLE public.bars ADD COLUMN IF NOT EXISTS terminal_code text;
ALTER TABLE public.entries ADD COLUMN IF NOT EXISTS terminal_code text;

UPDATE public.bars SET terminal_code = public.gen_terminal_code(name) WHERE terminal_code IS NULL OR terminal_code = '';
UPDATE public.entries SET terminal_code = public.gen_terminal_code(name) WHERE terminal_code IS NULL OR terminal_code = '';

ALTER TABLE public.bars ALTER COLUMN terminal_code SET NOT NULL;
ALTER TABLE public.entries ALTER COLUMN terminal_code SET NOT NULL;

-- 3) Trigger to auto-set terminal_code on insert/update of name
CREATE OR REPLACE FUNCTION public.set_terminal_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.terminal_code := public.gen_terminal_code(NEW.name);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS bars_set_terminal_code ON public.bars;
CREATE TRIGGER bars_set_terminal_code
  BEFORE INSERT OR UPDATE OF name ON public.bars
  FOR EACH ROW EXECUTE FUNCTION public.set_terminal_code();

DROP TRIGGER IF EXISTS entries_set_terminal_code ON public.entries;
CREATE TRIGGER entries_set_terminal_code
  BEFORE INSERT OR UPDATE OF name ON public.entries
  FOR EACH ROW EXECUTE FUNCTION public.set_terminal_code();

-- 4) Per-(terminal, event) sequence table
CREATE TABLE IF NOT EXISTS public.ticket_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL DEFAULT current_company_id(),
  terminal_kind text NOT NULL CHECK (terminal_kind IN ('bar','entry')),
  terminal_id uuid NOT NULL,
  event_id uuid,
  last_number integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ticket_sequences_unique
  ON public.ticket_sequences (terminal_kind, terminal_id, event_id) NULLS NOT DISTINCT;

ALTER TABLE public.ticket_sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON public.ticket_sequences;
CREATE POLICY tenant_isolation ON public.ticket_sequences
  AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (is_platform_admin(auth.uid()) OR company_id = current_company_id())
  WITH CHECK (is_platform_admin(auth.uid()) OR company_id = current_company_id());

DROP POLICY IF EXISTS auth_read_ticket_sequences ON public.ticket_sequences;
CREATE POLICY auth_read_ticket_sequences ON public.ticket_sequences
  FOR SELECT TO authenticated USING (true);

-- 5) ticket_number on sales
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS ticket_number text;
CREATE INDEX IF NOT EXISTS sales_ticket_number_idx ON public.sales(ticket_number);

-- 6) Function to compute next ticket number atomically
CREATE OR REPLACE FUNCTION public.next_ticket_number(_kind text, _terminal_id uuid, _event_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code text;
  cid uuid;
  n integer;
BEGIN
  IF _kind = 'bar' THEN
    SELECT terminal_code, company_id INTO code, cid FROM public.bars WHERE id = _terminal_id;
  ELSE
    SELECT terminal_code, company_id INTO code, cid FROM public.entries WHERE id = _terminal_id;
  END IF;

  IF code IS NULL THEN
    RAISE EXCEPTION 'Terminal % no encontrada para tipo %', _terminal_id, _kind;
  END IF;

  INSERT INTO public.ticket_sequences (company_id, terminal_kind, terminal_id, event_id, last_number, updated_at)
  VALUES (cid, _kind, _terminal_id, _event_id, 1, now())
  ON CONFLICT (terminal_kind, terminal_id, event_id)
  DO UPDATE SET last_number = public.ticket_sequences.last_number + 1, updated_at = now()
  RETURNING last_number INTO n;

  RETURN code || '-' || lpad(n::text, 6, '0');
END $$;

REVOKE ALL ON FUNCTION public.next_ticket_number(text, uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.next_ticket_number(text, uuid, uuid) TO authenticated;

-- 7) Trigger on sales: auto-fill ticket_number
CREATE OR REPLACE FUNCTION public.set_sale_ticket_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.ticket_number IS NOT NULL AND NEW.ticket_number <> '' THEN
    RETURN NEW;
  END IF;
  IF NEW.bar_id IS NOT NULL THEN
    NEW.ticket_number := public.next_ticket_number('bar', NEW.bar_id, NEW.event_id);
  ELSIF NEW.entry_id IS NOT NULL THEN
    NEW.ticket_number := public.next_ticket_number('entry', NEW.entry_id, NEW.event_id);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS sales_set_ticket_number ON public.sales;
CREATE TRIGGER sales_set_ticket_number
  BEFORE INSERT ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.set_sale_ticket_number();
