
REVOKE ALL ON FUNCTION public.next_ticket_number(text, uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.gen_terminal_code(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_terminal_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_sale_ticket_number() FROM PUBLIC, anon, authenticated;
