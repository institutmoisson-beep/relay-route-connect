
ALTER TABLE public.msn_relay_points ADD COLUMN IF NOT EXISTS latitude numeric, ADD COLUMN IF NOT EXISTS longitude numeric;
ALTER TABLE public.msn_pricing_config
  ADD COLUMN IF NOT EXISTS rain_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS strike_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS holiday_active boolean NOT NULL DEFAULT false;
ALTER TABLE public.msn_relay_applications
  ADD COLUMN IF NOT EXISTS id_photo_url text,
  ADD COLUMN IF NOT EXISTS space_photo_url text;

CREATE TABLE IF NOT EXISTS public.msn_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL,
  user_id uuid NOT NULL,
  relay_point_id uuid,
  partner_name text NOT NULL,
  space_name text NOT NULL,
  city text NOT NULL,
  neighborhood text NOT NULL,
  address text NOT NULL,
  signed_by_admin text NOT NULL DEFAULT 'Celvus Parfait',
  partner_signature text,
  partner_signed_at timestamptz,
  contract_number text NOT NULL UNIQUE DEFAULT ('MSN-' || to_char(now(),'YYYYMMDD') || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,8)),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.msn_contracts TO authenticated;
GRANT ALL ON public.msn_contracts TO service_role;
ALTER TABLE public.msn_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners view own contract" ON public.msn_contracts FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));
CREATE POLICY "Owners sign own contract" ON public.msn_contracts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));
CREATE POLICY "Admins create contracts" ON public.msn_contracts FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

CREATE TABLE IF NOT EXISTS public.msn_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  image_url text,
  link_url text,
  link_label text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.msn_broadcasts TO authenticated;
GRANT ALL ON public.msn_broadcasts TO service_role;
ALTER TABLE public.msn_broadcasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated read broadcasts" ON public.msn_broadcasts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins create broadcasts" ON public.msn_broadcasts FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));
CREATE POLICY "Admins modify broadcasts" ON public.msn_broadcasts FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));
CREATE POLICY "Admins delete broadcasts" ON public.msn_broadcasts FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

INSERT INTO storage.buckets (id,name,public) VALUES ('relay-applications','relay-applications',false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id,name,public) VALUES ('order-images','order-images',false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id,name,public) VALUES ('broadcast-media','broadcast-media',true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id,name,public) VALUES ('contracts','contracts',false) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "users upload own relay app files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id='relay-applications' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "users read own relay app files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id='relay-applications' AND (auth.uid()::text = (storage.foldername(name))[1] OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')));
CREATE POLICY "users upload own order images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id='order-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "users read own order images" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id='order-images' AND (auth.uid()::text = (storage.foldername(name))[1] OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')));
CREATE POLICY "public read broadcast media" ON storage.objects FOR SELECT TO public USING (bucket_id='broadcast-media');
CREATE POLICY "admins upload broadcast media" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id='broadcast-media' AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')));
CREATE POLICY "users read own contracts" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id='contracts' AND (auth.uid()::text = (storage.foldername(name))[1] OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'phone');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  IF lower(NEW.email) = 'picelvus@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin') ON CONFLICT DO NOTHING;
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE u uuid;
BEGIN
  SELECT id INTO u FROM auth.users WHERE lower(email)='picelvus@gmail.com' LIMIT 1;
  IF u IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (u, 'super_admin') ON CONFLICT DO NOTHING;
    INSERT INTO public.user_roles (user_id, role) VALUES (u, 'admin') ON CONFLICT DO NOTHING;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.handle_application_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE new_relay_id uuid; profile_name text;
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    INSERT INTO public.msn_relay_points (owner_id, name, space_type, country, city, neighborhood, address, phone, status)
    VALUES (NEW.user_id, NEW.space_name, NEW.space_type, NEW.country, NEW.city, NEW.neighborhood, NEW.address, NEW.phone, 'active')
    RETURNING id INTO new_relay_id;
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.user_id, 'relay_owner') ON CONFLICT DO NOTHING;
    SELECT full_name INTO profile_name FROM public.profiles WHERE id = NEW.user_id;
    INSERT INTO public.msn_contracts (application_id, user_id, relay_point_id, partner_name, space_name, city, neighborhood, address)
    VALUES (NEW.id, NEW.user_id, new_relay_id, COALESCE(profile_name,'Partenaire'), NEW.space_name, NEW.city, NEW.neighborhood, NEW.address);
    NEW.reviewed_at = now();
  ELSIF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
    NEW.reviewed_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_application_status_change ON public.msn_relay_applications;
CREATE TRIGGER on_application_status_change BEFORE UPDATE ON public.msn_relay_applications
  FOR EACH ROW EXECUTE FUNCTION public.handle_application_approval();

DROP TRIGGER IF EXISTS on_recharge_status_change ON public.msn_wallet_recharge_requests;
CREATE TRIGGER on_recharge_status_change BEFORE UPDATE ON public.msn_wallet_recharge_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_recharge_approval();

ALTER PUBLICATION supabase_realtime ADD TABLE public.msn_broadcasts;
