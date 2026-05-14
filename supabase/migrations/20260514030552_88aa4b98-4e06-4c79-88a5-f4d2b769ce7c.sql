
INSERT INTO storage.buckets (id, name, public) VALUES ('branding','branding', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "branding public read" ON storage.objects FOR SELECT USING (bucket_id = 'branding');
CREATE POLICY "branding admin write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'branding' AND public.has_role(auth.uid(),'superadmin'));
CREATE POLICY "branding admin update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'branding' AND public.has_role(auth.uid(),'superadmin'));
CREATE POLICY "branding admin delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'branding' AND public.has_role(auth.uid(),'superadmin'));
