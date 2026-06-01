DROP POLICY IF EXISTS "Authenticated insert notifications" ON public.msn_notifications;
CREATE POLICY "Scoped insert notifications" ON public.msn_notifications
  FOR INSERT TO authenticated
  WITH CHECK (recipient_id = auth.uid() OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));