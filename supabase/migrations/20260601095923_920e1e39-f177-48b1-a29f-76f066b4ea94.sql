-- Notifications table for internal channel between users / relay owners / franchisees / admins
CREATE TABLE public.msn_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_id UUID NOT NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link_url TEXT,
  related_delivery_id UUID,
  related_relay_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_msn_notif_recipient ON public.msn_notifications(recipient_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.msn_notifications TO authenticated;
GRANT ALL ON public.msn_notifications TO service_role;

ALTER TABLE public.msn_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recipients read own notifications" ON public.msn_notifications
  FOR SELECT TO authenticated
  USING (auth.uid() = recipient_id OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

CREATE POLICY "Recipients update own notifications" ON public.msn_notifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

CREATE POLICY "Authenticated insert notifications" ON public.msn_notifications
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admins delete notifications" ON public.msn_notifications
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

-- Trigger: when a delivery is created with a relay_point_id, notify the relay owner
CREATE OR REPLACE FUNCTION public.notify_relay_on_delivery()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE relay_owner UUID; relay_name TEXT; customer_name TEXT;
BEGIN
  IF NEW.relay_point_id IS NULL THEN RETURN NEW; END IF;
  SELECT owner_id, name INTO relay_owner, relay_name FROM public.msn_relay_points WHERE id = NEW.relay_point_id;
  IF relay_owner IS NULL THEN RETURN NEW; END IF;
  SELECT COALESCE(full_name,'Client') INTO customer_name FROM public.profiles WHERE id = NEW.user_id;
  INSERT INTO public.msn_notifications(recipient_id, kind, title, body, related_delivery_id, related_relay_id)
  VALUES (
    relay_owner,
    'new_delivery',
    'Nouvelle livraison vers ' || COALESCE(relay_name,'votre relais'),
    customer_name || ' a sélectionné votre point relais. Commande: ' || COALESCE(NEW.order_code,'(sans code)') || ' — Fournisseur: ' || NEW.provider_name,
    NEW.id,
    NEW.relay_point_id
  );
  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS trg_notify_relay_on_delivery ON public.msn_deliveries;
CREATE TRIGGER trg_notify_relay_on_delivery
AFTER INSERT ON public.msn_deliveries
FOR EACH ROW EXECUTE FUNCTION public.notify_relay_on_delivery();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.msn_notifications;