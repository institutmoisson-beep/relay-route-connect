
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'relay_owner', 'user');
CREATE TYPE public.relay_space_type AS ENUM ('shop', 'restaurant', 'maquis', 'establishment', 'individual', 'other');
CREATE TYPE public.trust_level AS ENUM ('standard', 'verified', 'premium');
CREATE TYPE public.relay_status AS ENUM ('active', 'pending', 'suspended');
CREATE TYPE public.delivery_status AS ENUM ('pending', 'picked_up', 'at_relay', 'delivered', 'cancelled');
CREATE TYPE public.payment_mode AS ENUM ('msn_delivery', 'direct_provider');
CREATE TYPE public.recharge_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.application_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.mobile_operator AS ENUM ('orange', 'moov', 'mtn', 'wave');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  wallet_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User Roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Relay points
CREATE TABLE public.msn_relay_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  space_type relay_space_type NOT NULL,
  country TEXT NOT NULL DEFAULT 'Côte d''Ivoire',
  city TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  trust_level trust_level NOT NULL DEFAULT 'standard',
  status relay_status NOT NULL DEFAULT 'active',
  rating NUMERIC(3,2) DEFAULT 0,
  total_reviews INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.msn_relay_points ENABLE ROW LEVEL SECURITY;

-- Relay applications
CREATE TABLE public.msn_relay_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  space_name TEXT NOT NULL,
  space_type relay_space_type NOT NULL,
  country TEXT NOT NULL DEFAULT 'Côte d''Ivoire',
  city TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  description TEXT,
  status application_status NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);
ALTER TABLE public.msn_relay_applications ENABLE ROW LEVEL SECURITY;

-- Deliveries
CREATE TABLE public.msn_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_code TEXT,
  order_image_url TEXT,
  provider_name TEXT NOT NULL,
  provider_phone TEXT,
  provider_location TEXT,
  relay_point_id UUID REFERENCES public.msn_relay_points(id) ON DELETE SET NULL,
  payment_mode payment_mode NOT NULL DEFAULT 'msn_delivery',
  estimated_distance_km NUMERIC(6,2) DEFAULT 5,
  delivery_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  circumstances JSONB DEFAULT '{}'::jsonb,
  status delivery_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  picked_up_at TIMESTAMPTZ,
  at_relay_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ
);
ALTER TABLE public.msn_deliveries ENABLE ROW LEVEL SECURITY;

-- Wallet recharge requests
CREATE TABLE public.msn_wallet_recharge_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  operator mobile_operator NOT NULL,
  sender_phone TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  status recharge_status NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);
ALTER TABLE public.msn_wallet_recharge_requests ENABLE ROW LEVEL SECURITY;

-- Reviews
CREATE TABLE public.msn_relay_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relay_point_id UUID NOT NULL REFERENCES public.msn_relay_points(id) ON DELETE CASCADE,
  delivery_id UUID REFERENCES public.msn_deliveries(id) ON DELETE SET NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.msn_relay_reviews ENABLE ROW LEVEL SECURITY;

-- Pricing config
CREATE TABLE public.msn_pricing_config (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  base_price NUMERIC(10,2) NOT NULL DEFAULT 500,
  price_per_km NUMERIC(10,2) NOT NULL DEFAULT 150,
  rain_multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.2,
  holiday_multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.3,
  strike_multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.5,
  weekend_multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.msn_pricing_config (id) VALUES (1);
ALTER TABLE public.msn_pricing_config ENABLE ROW LEVEL SECURITY;

-- ============ RLS POLICIES ============

-- profiles
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins update profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- user_roles
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- msn_relay_points (public read for active relays)
CREATE POLICY "Anyone reads active relays" ON public.msn_relay_points FOR SELECT USING (status = 'active' OR auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage relays" ON public.msn_relay_points FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners update own relay" ON public.msn_relay_points FOR UPDATE TO authenticated USING (auth.uid() = owner_id);

-- msn_relay_applications
CREATE POLICY "Users view own applications" ON public.msn_relay_applications FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create applications" ON public.msn_relay_applications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage applications" ON public.msn_relay_applications FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- msn_deliveries
CREATE POLICY "Users view own deliveries" ON public.msn_deliveries FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.msn_relay_points rp WHERE rp.id = msn_deliveries.relay_point_id AND rp.owner_id = auth.uid()));
CREATE POLICY "Users create deliveries" ON public.msn_deliveries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins update deliveries" ON public.msn_deliveries FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.msn_relay_points rp WHERE rp.id = msn_deliveries.relay_point_id AND rp.owner_id = auth.uid()));

-- msn_wallet_recharge_requests
CREATE POLICY "Users view own recharges" ON public.msn_wallet_recharge_requests FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create recharges" ON public.msn_wallet_recharge_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins update recharges" ON public.msn_wallet_recharge_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- msn_relay_reviews
CREATE POLICY "Anyone reads reviews" ON public.msn_relay_reviews FOR SELECT USING (true);
CREATE POLICY "Users create reviews" ON public.msn_relay_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own reviews" ON public.msn_relay_reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- msn_pricing_config (public read)
CREATE POLICY "Anyone reads pricing" ON public.msn_pricing_config FOR SELECT USING (true);
CREATE POLICY "Admins update pricing" ON public.msn_pricing_config FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ TRIGGERS ============

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'phone');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-credit wallet on recharge approval
CREATE OR REPLACE FUNCTION public.handle_recharge_approval()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    UPDATE public.profiles SET wallet_balance = wallet_balance + NEW.amount, updated_at = now()
    WHERE id = NEW.user_id;
    NEW.reviewed_at = now();
  ELSIF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
    NEW.reviewed_at = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_recharge_status_change
BEFORE UPDATE ON public.msn_wallet_recharge_requests
FOR EACH ROW EXECUTE FUNCTION public.handle_recharge_approval();

-- Auto-create relay point on application approval
CREATE OR REPLACE FUNCTION public.handle_application_approval()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    INSERT INTO public.msn_relay_points (owner_id, name, space_type, country, city, neighborhood, address, phone, status)
    VALUES (NEW.user_id, NEW.space_name, NEW.space_type, NEW.country, NEW.city, NEW.neighborhood, NEW.address, NEW.phone, 'active');
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.user_id, 'relay_owner') ON CONFLICT DO NOTHING;
    NEW.reviewed_at = now();
  ELSIF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
    NEW.reviewed_at = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_application_status_change
BEFORE UPDATE ON public.msn_relay_applications
FOR EACH ROW EXECUTE FUNCTION public.handle_application_approval();
