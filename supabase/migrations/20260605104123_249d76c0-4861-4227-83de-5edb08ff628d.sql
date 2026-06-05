
-- Bucket graine-stock : chaque franchisé a son dossier = franchise_id
CREATE POLICY "graine-stock owner read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'graine-stock' AND (
  (storage.foldername(name))[1]::uuid IN (SELECT public.user_franchise_ids(auth.uid()))
  OR public.has_role(auth.uid(),'admin')
));

CREATE POLICY "graine-stock owner write"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'graine-stock' AND (storage.foldername(name))[1]::uuid IN (SELECT public.user_franchise_ids(auth.uid())));

CREATE POLICY "graine-stock owner update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'graine-stock' AND (storage.foldername(name))[1]::uuid IN (SELECT public.user_franchise_ids(auth.uid())));

CREATE POLICY "graine-stock owner delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'graine-stock' AND (storage.foldername(name))[1]::uuid IN (SELECT public.user_franchise_ids(auth.uid())));
