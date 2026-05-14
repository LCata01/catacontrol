ALTER TABLE public.ticket_types ADD COLUMN IF NOT EXISTS people_per_ticket integer NOT NULL DEFAULT 1;
ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS people_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.complimentary_tickets ADD COLUMN IF NOT EXISTS people_count integer NOT NULL DEFAULT 0;

-- Allow superadmin to force-close any shift (release a locked terminal)
DROP POLICY IF EXISTS "admin update any shift" ON public.shifts;
CREATE POLICY "admin update any shift" ON public.shifts FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'::app_role));

-- Realtime for shifts so terminal status updates live
ALTER PUBLICATION supabase_realtime ADD TABLE public.shifts;