ALTER TABLE public.sale_items DROP CONSTRAINT sale_items_ticket_type_id_fkey;
ALTER TABLE public.sale_items ADD CONSTRAINT sale_items_ticket_type_id_fkey FOREIGN KEY (ticket_type_id) REFERENCES public.ticket_types(id) ON DELETE SET NULL;

ALTER TABLE public.complimentary_tickets DROP CONSTRAINT complimentary_tickets_ticket_type_id_fkey;
ALTER TABLE public.complimentary_tickets ADD CONSTRAINT complimentary_tickets_ticket_type_id_fkey FOREIGN KEY (ticket_type_id) REFERENCES public.ticket_types(id) ON DELETE SET NULL;