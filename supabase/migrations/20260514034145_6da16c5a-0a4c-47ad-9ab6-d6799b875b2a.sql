-- sale_items
ALTER TABLE public.sale_items DROP CONSTRAINT sale_items_product_id_fkey;
ALTER TABLE public.sale_items ADD CONSTRAINT sale_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;

ALTER TABLE public.sale_items DROP CONSTRAINT sale_items_wristband_id_fkey;
ALTER TABLE public.sale_items ADD CONSTRAINT sale_items_wristband_id_fkey FOREIGN KEY (wristband_id) REFERENCES public.wristbands(id) ON DELETE SET NULL;

-- staff_consumptions
ALTER TABLE public.staff_consumptions DROP CONSTRAINT staff_consumptions_product_id_fkey;
ALTER TABLE public.staff_consumptions ADD CONSTRAINT staff_consumptions_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;

ALTER TABLE public.staff_consumptions DROP CONSTRAINT staff_consumptions_staff_member_id_fkey;
ALTER TABLE public.staff_consumptions ADD CONSTRAINT staff_consumptions_staff_member_id_fkey FOREIGN KEY (staff_member_id) REFERENCES public.staff_members(id) ON DELETE SET NULL;

ALTER TABLE public.staff_consumptions DROP CONSTRAINT staff_consumptions_bar_id_fkey;
ALTER TABLE public.staff_consumptions ADD CONSTRAINT staff_consumptions_bar_id_fkey FOREIGN KEY (bar_id) REFERENCES public.bars(id) ON DELETE SET NULL;

ALTER TABLE public.staff_consumptions DROP CONSTRAINT staff_consumptions_event_id_fkey;
ALTER TABLE public.staff_consumptions ADD CONSTRAINT staff_consumptions_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL;

-- sales
ALTER TABLE public.sales DROP CONSTRAINT sales_bar_id_fkey;
ALTER TABLE public.sales ADD CONSTRAINT sales_bar_id_fkey FOREIGN KEY (bar_id) REFERENCES public.bars(id) ON DELETE SET NULL;

ALTER TABLE public.sales DROP CONSTRAINT sales_entry_id_fkey;
ALTER TABLE public.sales ADD CONSTRAINT sales_entry_id_fkey FOREIGN KEY (entry_id) REFERENCES public.entries(id) ON DELETE SET NULL;

ALTER TABLE public.sales DROP CONSTRAINT sales_event_id_fkey;
ALTER TABLE public.sales ADD CONSTRAINT sales_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL;

-- shifts
ALTER TABLE public.shifts DROP CONSTRAINT shifts_bar_id_fkey;
ALTER TABLE public.shifts ADD CONSTRAINT shifts_bar_id_fkey FOREIGN KEY (bar_id) REFERENCES public.bars(id) ON DELETE SET NULL;

ALTER TABLE public.shifts DROP CONSTRAINT shifts_entry_id_fkey;
ALTER TABLE public.shifts ADD CONSTRAINT shifts_entry_id_fkey FOREIGN KEY (entry_id) REFERENCES public.entries(id) ON DELETE SET NULL;

ALTER TABLE public.shifts DROP CONSTRAINT shifts_event_id_fkey;
ALTER TABLE public.shifts ADD CONSTRAINT shifts_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL;

-- complimentary_tickets
ALTER TABLE public.complimentary_tickets DROP CONSTRAINT complimentary_tickets_entry_id_fkey;
ALTER TABLE public.complimentary_tickets ADD CONSTRAINT complimentary_tickets_entry_id_fkey FOREIGN KEY (entry_id) REFERENCES public.entries(id) ON DELETE SET NULL;

ALTER TABLE public.complimentary_tickets DROP CONSTRAINT complimentary_tickets_event_id_fkey;
ALTER TABLE public.complimentary_tickets ADD CONSTRAINT complimentary_tickets_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL;