
-- ============ PAYMENT SERVICES ============
CREATE TYPE payment_service_kind AS ENUM ('mobile_money','payment_link','crypto');

CREATE TABLE public.msn_payment_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind payment_service_kind NOT NULL,
  label text NOT NULL,
  identifier text NOT NULL,
  instructions text,
  link_url text,
  logo_url text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.msn_payment_services TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.msn_payment_services TO authenticated;
GRANT ALL ON public.msn_payment_services TO service_role;
ALTER TABLE public.msn_payment_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads active payment services" ON public.msn_payment_services FOR SELECT USING (is_active = true OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));
CREATE POLICY "Admins manage payment services" ON public.msn_payment_services FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

INSERT INTO public.msn_payment_services (kind,label,identifier,instructions,sort_order) VALUES
  ('mobile_money','Orange Money','+225 07 00 00 00 00','Faites un dépôt sur ce numéro puis remplissez le formulaire.',1),
  ('mobile_money','Wave','+225 01 00 00 00 00','Transfert Wave instantané vers ce numéro.',2);

-- ============ RELAY BLOCK ============
ALTER TABLE public.msn_relay_points ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false;

-- ============ GRAINE PRODUCTS ============
CREATE TABLE public.graine_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  quantity int NOT NULL DEFAULT 0,
  image_url text,
  category text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.graine_products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.graine_products TO authenticated;
GRANT ALL ON public.graine_products TO service_role;
ALTER TABLE public.graine_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads active products" ON public.graine_products FOR SELECT USING (is_active = true OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));
CREATE POLICY "Admins manage products" ON public.graine_products FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

-- ============ FRANCHISE APPLICATIONS ============
CREATE TYPE graine_franchise_status AS ENUM ('pending','approved','rejected');

CREATE TABLE public.graine_franchise_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  shop_name text NOT NULL,
  shop_type text NOT NULL,
  country text NOT NULL DEFAULT 'Côte d''Ivoire',
  city text NOT NULL,
  neighborhood text NOT NULL,
  address text NOT NULL,
  phone text NOT NULL,
  monthly_revenue numeric,
  owner_id_url text,
  shop_photo_url text,
  selected_product_ids uuid[] NOT NULL DEFAULT '{}',
  description text,
  status graine_franchise_status NOT NULL DEFAULT 'pending',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.graine_franchise_applications TO authenticated;
GRANT ALL ON public.graine_franchise_applications TO service_role;
ALTER TABLE public.graine_franchise_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users create franchise applications" ON public.graine_franchise_applications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users view own franchise applications" ON public.graine_franchise_applications FOR SELECT TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));
CREATE POLICY "Admins manage franchise applications" ON public.graine_franchise_applications FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

-- ============ FRANCHISE CONTRACTS ============
CREATE TABLE public.graine_franchise_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL,
  user_id uuid NOT NULL,
  contract_number text NOT NULL DEFAULT (('GRAINE-' || to_char(now(),'YYYYMMDD') || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  franchisee_name text NOT NULL,
  shop_name text NOT NULL,
  city text NOT NULL,
  neighborhood text NOT NULL,
  address text NOT NULL,
  resupply_quota_pct numeric NOT NULL DEFAULT 80,
  signed_by_admin text NOT NULL DEFAULT 'Celvus Parfait',
  franchisee_signature text,
  franchisee_signed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.graine_franchise_contracts TO authenticated;
GRANT ALL ON public.graine_franchise_contracts TO service_role;
ALTER TABLE public.graine_franchise_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own franchise contracts" ON public.graine_franchise_contracts FOR SELECT TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));
CREATE POLICY "Franchisees sign own contracts" ON public.graine_franchise_contracts FOR UPDATE TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));
CREATE POLICY "Admins create franchise contracts" ON public.graine_franchise_contracts FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

-- Trigger: approval -> contract + role
CREATE OR REPLACE FUNCTION public.handle_franchise_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE profile_name text;
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    SELECT COALESCE(full_name,'Franchisé') INTO profile_name FROM public.profiles WHERE id = NEW.user_id;
    INSERT INTO public.graine_franchise_contracts (application_id, user_id, franchisee_name, shop_name, city, neighborhood, address)
    VALUES (NEW.id, NEW.user_id, profile_name, NEW.shop_name, NEW.city, NEW.neighborhood, NEW.address);
    NEW.reviewed_at = now();
  ELSIF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
    NEW.reviewed_at = now();
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_franchise_approval BEFORE UPDATE ON public.graine_franchise_applications FOR EACH ROW EXECUTE FUNCTION public.handle_franchise_approval();

-- ============ STORAGE BUCKETS ============
INSERT INTO storage.buckets (id,name,public) VALUES ('graine-products','graine-products',true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id,name,public) VALUES ('graine-applications','graine-applications',false) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read graine-products" ON storage.objects FOR SELECT USING (bucket_id = 'graine-products');
CREATE POLICY "Admins write graine-products" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='graine-products' AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')));
CREATE POLICY "Admins update graine-products" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id='graine-products' AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')));
CREATE POLICY "Admins delete graine-products" ON storage.objects FOR DELETE TO authenticated USING (bucket_id='graine-products' AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')));

CREATE POLICY "Users upload own franchise files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='graine-applications' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users read own franchise files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='graine-applications' AND (auth.uid()::text = (storage.foldername(name))[1] OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')));

-- ============ PROFILES: allow admin delete (cascade via cleanup) ============
-- Already covered by service_role; admins use UPDATE is_blocked.
