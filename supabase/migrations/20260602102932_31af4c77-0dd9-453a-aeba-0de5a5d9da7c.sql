
-- ============ 1. TRACKING CODES POUR LIVRAISONS ============
ALTER TABLE public.msn_deliveries
  ADD COLUMN IF NOT EXISTS tracking_code text UNIQUE;

-- Function to generate unique short tracking code
CREATE OR REPLACE FUNCTION public.generate_tracking_code()
RETURNS text LANGUAGE plpgsql AS $$
DECLARE code text; exists_count int;
BEGIN
  LOOP
    code := 'MSN-' || to_char(now(),'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
    SELECT count(*) INTO exists_count FROM public.msn_deliveries WHERE tracking_code = code;
    EXIT WHEN exists_count = 0;
  END LOOP;
  RETURN code;
END;$$;

CREATE OR REPLACE FUNCTION public.set_tracking_code()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tracking_code IS NULL THEN
    NEW.tracking_code := public.generate_tracking_code();
  END IF;
  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS trg_set_tracking_code ON public.msn_deliveries;
CREATE TRIGGER trg_set_tracking_code
BEFORE INSERT ON public.msn_deliveries
FOR EACH ROW EXECUTE FUNCTION public.set_tracking_code();

-- Backfill existing rows
UPDATE public.msn_deliveries SET tracking_code = public.generate_tracking_code() WHERE tracking_code IS NULL;

-- Scan log for traceability
CREATE TABLE IF NOT EXISTS public.msn_delivery_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid NOT NULL REFERENCES public.msn_deliveries(id) ON DELETE CASCADE,
  scanned_by uuid NOT NULL,
  scanner_role text NOT NULL,
  action text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.msn_delivery_scans TO authenticated;
GRANT ALL ON public.msn_delivery_scans TO service_role;
ALTER TABLE public.msn_delivery_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Scans viewable by involved parties" ON public.msn_delivery_scans
FOR SELECT TO authenticated USING (
  scanned_by = auth.uid()
  OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')
  OR EXISTS (SELECT 1 FROM public.msn_deliveries d WHERE d.id = delivery_id AND (
    d.user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.msn_relay_points rp WHERE rp.id = d.relay_point_id AND rp.owner_id = auth.uid())
  ))
);

CREATE POLICY "Authorized scan insert" ON public.msn_delivery_scans
FOR INSERT TO authenticated WITH CHECK (
  scanned_by = auth.uid() AND (
    has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')
    OR has_role(auth.uid(),'relay_owner')
    OR EXISTS (SELECT 1 FROM public.graine_franchise_contracts c WHERE c.user_id = auth.uid())
  )
);

-- ============ 2. MSN VTC ============
CREATE TYPE vtc_vehicle_type AS ENUM ('moto','voiture','tricycle','camion');
CREATE TYPE vtc_driver_status AS ENUM ('hors_ligne','en_ligne','occupe');
CREATE TYPE vtc_ride_status AS ENUM ('en_attente','accepte','en_cours','termine','annule');

-- Settings (config admin VTC)
CREATE TABLE public.vtc_settings (
  vehicle_type vtc_vehicle_type PRIMARY KEY,
  base_price numeric NOT NULL DEFAULT 500,
  price_per_km numeric NOT NULL DEFAULT 200,
  price_per_min numeric NOT NULL DEFAULT 30,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vtc_settings TO anon, authenticated;
GRANT ALL ON public.vtc_settings TO service_role, authenticated;
ALTER TABLE public.vtc_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads vtc settings" ON public.vtc_settings FOR SELECT USING (true);
CREATE POLICY "Admins manage vtc settings" ON public.vtc_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

INSERT INTO public.vtc_settings(vehicle_type,base_price,price_per_km,price_per_min) VALUES
 ('moto',300,150,20),
 ('voiture',500,250,40),
 ('tricycle',400,180,25),
 ('camion',2000,500,80)
ON CONFLICT DO NOTHING;

-- Pricing multipliers (single row table)
CREATE TABLE public.vtc_pricing_modifiers (
  id int PRIMARY KEY DEFAULT 1,
  rain_active boolean NOT NULL DEFAULT false,
  rain_mult numeric NOT NULL DEFAULT 1.3,
  rush_active boolean NOT NULL DEFAULT false,
  rush_mult numeric NOT NULL DEFAULT 1.4,
  holiday_active boolean NOT NULL DEFAULT false,
  holiday_mult numeric NOT NULL DEFAULT 1.2,
  strike_active boolean NOT NULL DEFAULT false,
  strike_mult numeric NOT NULL DEFAULT 1.5,
  night_mult numeric NOT NULL DEFAULT 1.15,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT one_row CHECK (id = 1)
);
GRANT SELECT ON public.vtc_pricing_modifiers TO anon, authenticated;
GRANT ALL ON public.vtc_pricing_modifiers TO service_role, authenticated;
ALTER TABLE public.vtc_pricing_modifiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads vtc mods" ON public.vtc_pricing_modifiers FOR SELECT USING (true);
CREATE POLICY "Admins manage vtc mods" ON public.vtc_pricing_modifiers FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));
INSERT INTO public.vtc_pricing_modifiers(id) VALUES (1) ON CONFLICT DO NOTHING;

-- Drivers
CREATE TABLE public.vtc_drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  full_name text NOT NULL,
  phone text NOT NULL,
  vehicle_type vtc_vehicle_type NOT NULL,
  vehicle_plate text,
  vehicle_model text,
  id_photo_url text,
  vehicle_photo_url text,
  status vtc_driver_status NOT NULL DEFAULT 'hors_ligne',
  current_lat numeric,
  current_lng numeric,
  last_location_at timestamptz,
  total_earnings numeric NOT NULL DEFAULT 0,
  total_rides int NOT NULL DEFAULT 0,
  rating numeric NOT NULL DEFAULT 5,
  is_approved boolean NOT NULL DEFAULT false,
  is_blocked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vtc_drivers TO anon;
GRANT SELECT, INSERT, UPDATE ON public.vtc_drivers TO authenticated;
GRANT ALL ON public.vtc_drivers TO service_role;
ALTER TABLE public.vtc_drivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads approved drivers" ON public.vtc_drivers FOR SELECT
  USING (is_approved = true OR auth.uid() = user_id OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));
CREATE POLICY "Users create own driver profile" ON public.vtc_drivers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Driver or admin updates" ON public.vtc_drivers FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

-- Rides
CREATE TABLE public.vtc_rides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  driver_id uuid REFERENCES public.vtc_drivers(id),
  vehicle_type vtc_vehicle_type NOT NULL,
  status vtc_ride_status NOT NULL DEFAULT 'en_attente',
  pickup_address text NOT NULL,
  pickup_lat numeric NOT NULL,
  pickup_lng numeric NOT NULL,
  dropoff_address text NOT NULL,
  dropoff_lat numeric NOT NULL,
  dropoff_lng numeric NOT NULL,
  distance_km numeric NOT NULL,
  duration_min numeric NOT NULL,
  base_price numeric NOT NULL,
  final_price numeric NOT NULL,
  applied_modifiers jsonb NOT NULL DEFAULT '{}'::jsonb,
  ride_code text UNIQUE,
  notes text,
  cancel_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz
);
GRANT SELECT, INSERT, UPDATE ON public.vtc_rides TO authenticated;
GRANT ALL ON public.vtc_rides TO service_role;
ALTER TABLE public.vtc_rides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ride parties read" ON public.vtc_rides FOR SELECT TO authenticated USING (
  client_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.vtc_drivers d WHERE d.id = vtc_rides.driver_id AND d.user_id = auth.uid())
  OR (status = 'en_attente' AND EXISTS (SELECT 1 FROM public.vtc_drivers d WHERE d.user_id = auth.uid() AND d.vehicle_type = vtc_rides.vehicle_type AND d.status = 'en_ligne' AND d.is_approved))
  OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')
);
CREATE POLICY "Clients create rides" ON public.vtc_rides FOR INSERT TO authenticated
  WITH CHECK (client_id = auth.uid());
CREATE POLICY "Ride parties update" ON public.vtc_rides FOR UPDATE TO authenticated USING (
  client_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.vtc_drivers d WHERE d.user_id = auth.uid())
  OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')
);

-- Auto ride code + completion side-effects
CREATE OR REPLACE FUNCTION public.set_ride_code()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.ride_code IS NULL THEN
    NEW.ride_code := 'VTC-' || to_char(now(),'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
  END IF;
  RETURN NEW;
END;$$;
CREATE TRIGGER trg_set_ride_code BEFORE INSERT ON public.vtc_rides
FOR EACH ROW EXECUTE FUNCTION public.set_ride_code();

CREATE OR REPLACE FUNCTION public.handle_ride_completion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.status = 'termine' AND OLD.status <> 'termine' AND NEW.driver_id IS NOT NULL THEN
    UPDATE public.vtc_drivers
       SET total_earnings = total_earnings + NEW.final_price,
           total_rides = total_rides + 1,
           status = 'en_ligne'
     WHERE id = NEW.driver_id;
    NEW.completed_at := now();
  END IF;
  IF NEW.status = 'accepte' AND OLD.status = 'en_attente' THEN
    NEW.accepted_at := now();
    UPDATE public.vtc_drivers SET status='occupe' WHERE id = NEW.driver_id;
  END IF;
  IF NEW.status = 'en_cours' AND OLD.status <> 'en_cours' THEN
    NEW.started_at := now();
  END IF;
  RETURN NEW;
END;$$;
CREATE TRIGGER trg_handle_ride_completion BEFORE UPDATE ON public.vtc_rides
FOR EACH ROW EXECUTE FUNCTION public.handle_ride_completion();

-- Notify drivers on new ride request
CREATE OR REPLACE FUNCTION public.notify_drivers_new_ride()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d record;
BEGIN
  FOR d IN SELECT user_id FROM public.vtc_drivers
           WHERE vehicle_type = NEW.vehicle_type AND status='en_ligne' AND is_approved AND NOT is_blocked
  LOOP
    INSERT INTO public.msn_notifications(recipient_id, kind, title, body)
    VALUES (d.user_id, 'new_ride',
      'Nouvelle course VTC ' || NEW.vehicle_type,
      'De ' || NEW.pickup_address || ' vers ' || NEW.dropoff_address || ' — ' || NEW.final_price || ' FCFA');
  END LOOP;
  RETURN NEW;
END;$$;
CREATE TRIGGER trg_notify_drivers_new_ride AFTER INSERT ON public.vtc_rides
FOR EACH ROW WHEN (NEW.status = 'en_attente') EXECUTE FUNCTION public.notify_drivers_new_ride();

-- Add 'driver' role
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'driver';

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.vtc_rides;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vtc_drivers;
