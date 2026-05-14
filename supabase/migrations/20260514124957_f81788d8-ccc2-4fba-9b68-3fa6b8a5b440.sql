
-- Tighten cashier UPDATE on sales: must belong to a shift that is still open
DROP POLICY IF EXISTS "user update own sales" ON public.sales;
CREATE POLICY "user update own sales"
ON public.sales
FOR UPDATE
TO authenticated
USING (
  (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.shifts s
      WHERE s.id = sales.shift_id AND s.status = 'open'
    )
  )
  OR public.has_role(auth.uid(), 'superadmin'::app_role)
)
WITH CHECK (
  (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.shifts s
      WHERE s.id = sales.shift_id AND s.status = 'open'
    )
  )
  OR public.has_role(auth.uid(), 'superadmin'::app_role)
);

-- Tighten cashier UPDATE on shifts: only their own and only while open
DROP POLICY IF EXISTS "user update own shift" ON public.shifts;
CREATE POLICY "user update own shift"
ON public.shifts
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() AND status = 'open')
WITH CHECK (user_id = auth.uid() AND status = 'open');

-- Revoke EXECUTE on company password helpers from regular users.
-- These are only meant to be called by the server (service role), which bypasses GRANTs.
REVOKE EXECUTE ON FUNCTION public.set_company_password(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.verify_company_password(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_company_secure(text, text, text) FROM PUBLIC, anon, authenticated;
