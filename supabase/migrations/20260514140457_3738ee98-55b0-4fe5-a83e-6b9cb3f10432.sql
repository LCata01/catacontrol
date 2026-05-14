DROP POLICY IF EXISTS "user update own shift" ON public.shifts;

CREATE POLICY "user update own shift"
ON public.shifts
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() AND status = 'open')
WITH CHECK (user_id = auth.uid());