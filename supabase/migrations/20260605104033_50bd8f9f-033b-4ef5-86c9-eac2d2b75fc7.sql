
-- =====================================================================
-- CHANTIER 1 — Stock supérette pour franchises Graine
-- =====================================================================

-- Helper : franchises (ids) appartenant à un utilisateur
CREATE OR REPLACE FUNCTION public.user_franchise_ids(_uid uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.graine_franchise_contracts WHERE user_id = _uid
$$;

-- ---------------------------------------------------------------------
-- 1) graine_stock_items
-- ---------------------------------------------------------------------
CREATE TABLE public.graine_stock_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id uuid NOT NULL REFERENCES public.graine_franchise_contracts(id) ON DELETE CASCADE,
  name text NOT NULL,
  barcode text,
  sku text,
  category text,
  unit text DEFAULT 'pcs',
  cost_price numeric(12,2) DEFAULT 0,
  sell_price numeric(12,2) NOT NULL DEFAULT 0,
  stock_qty numeric(12,3) NOT NULL DEFAULT 0,
  low_stock_threshold numeric(12,3) NOT NULL DEFAULT 5,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (franchise_id, barcode)
);
CREATE INDEX ON public.graine_stock_items(franchise_id);
CREATE INDEX ON public.graine_stock_items(barcode);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.graine_stock_items TO authenticated;
GRANT ALL ON public.graine_stock_items TO service_role;
ALTER TABLE public.graine_stock_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner manages items"
ON public.graine_stock_items FOR ALL TO authenticated
USING (franchise_id IN (SELECT public.user_franchise_ids(auth.uid())))
WITH CHECK (franchise_id IN (SELECT public.user_franchise_ids(auth.uid())));

CREATE POLICY "admins read all items"
ON public.graine_stock_items FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------
-- 2) graine_stock_movements
-- ---------------------------------------------------------------------
CREATE TABLE public.graine_stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.graine_stock_items(id) ON DELETE CASCADE,
  franchise_id uuid NOT NULL REFERENCES public.graine_franchise_contracts(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('in','out','adjust','sale')),
  qty numeric(12,3) NOT NULL,
  unit_price numeric(12,2),
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.graine_stock_movements(franchise_id, created_at DESC);
CREATE INDEX ON public.graine_stock_movements(item_id);

GRANT SELECT, INSERT ON public.graine_stock_movements TO authenticated;
GRANT ALL ON public.graine_stock_movements TO service_role;
ALTER TABLE public.graine_stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner mvmts"
ON public.graine_stock_movements FOR ALL TO authenticated
USING (franchise_id IN (SELECT public.user_franchise_ids(auth.uid())))
WITH CHECK (franchise_id IN (SELECT public.user_franchise_ids(auth.uid())));

CREATE POLICY "admins read mvmts"
ON public.graine_stock_movements FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------
-- 3) graine_sales + graine_sale_items
-- ---------------------------------------------------------------------
CREATE TABLE public.graine_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id uuid NOT NULL REFERENCES public.graine_franchise_contracts(id) ON DELETE CASCADE,
  cashier_id uuid,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cash',
  customer_phone text,
  receipt_code text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.graine_sales(franchise_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.graine_sales TO authenticated;
GRANT ALL ON public.graine_sales TO service_role;
ALTER TABLE public.graine_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner sales"
ON public.graine_sales FOR ALL TO authenticated
USING (franchise_id IN (SELECT public.user_franchise_ids(auth.uid())))
WITH CHECK (franchise_id IN (SELECT public.user_franchise_ids(auth.uid())));

CREATE POLICY "admins read sales"
ON public.graine_sales FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.graine_sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.graine_sales(id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.graine_stock_items(id) ON DELETE SET NULL,
  franchise_id uuid NOT NULL REFERENCES public.graine_franchise_contracts(id) ON DELETE CASCADE,
  name_snapshot text NOT NULL,
  qty numeric(12,3) NOT NULL,
  unit_price numeric(12,2) NOT NULL,
  subtotal numeric(12,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.graine_sale_items(sale_id);
CREATE INDEX ON public.graine_sale_items(item_id);

GRANT SELECT, INSERT ON public.graine_sale_items TO authenticated;
GRANT ALL ON public.graine_sale_items TO service_role;
ALTER TABLE public.graine_sale_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner sale_items"
ON public.graine_sale_items FOR ALL TO authenticated
USING (franchise_id IN (SELECT public.user_franchise_ids(auth.uid())))
WITH CHECK (franchise_id IN (SELECT public.user_franchise_ids(auth.uid())));

CREATE POLICY "admins read sale_items"
ON public.graine_sale_items FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_items_updated
BEFORE UPDATE ON public.graine_stock_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Mouvement → ajuste le stock
CREATE OR REPLACE FUNCTION public.apply_stock_movement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE delta numeric;
BEGIN
  IF NEW.kind = 'in' THEN delta := NEW.qty;
  ELSIF NEW.kind IN ('out','sale') THEN delta := -NEW.qty;
  ELSIF NEW.kind = 'adjust' THEN delta := NEW.qty;  -- qty signée
  ELSE delta := 0;
  END IF;
  UPDATE public.graine_stock_items SET stock_qty = stock_qty + delta WHERE id = NEW.item_id;

  -- Alerte stock bas
  PERFORM 1 FROM public.graine_stock_items i
    JOIN public.graine_franchise_contracts c ON c.id = i.franchise_id
    WHERE i.id = NEW.item_id AND i.stock_qty <= i.low_stock_threshold AND delta < 0;
  IF FOUND THEN
    INSERT INTO public.msn_notifications(recipient_id, kind, title, body)
    SELECT c.user_id, 'stock_low', 'Stock bas — ' || i.name,
           'Il reste ' || i.stock_qty || ' ' || COALESCE(i.unit,'pcs') || ' de ' || i.name
    FROM public.graine_stock_items i
    JOIN public.graine_franchise_contracts c ON c.id = i.franchise_id
    WHERE i.id = NEW.item_id;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_apply_stock_movement
AFTER INSERT ON public.graine_stock_movements
FOR EACH ROW EXECUTE FUNCTION public.apply_stock_movement();

-- Vente : générer reçu + créer mouvements
CREATE OR REPLACE FUNCTION public.set_receipt_code()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.receipt_code IS NULL THEN
    NEW.receipt_code := 'RCT-' || to_char(now(),'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_set_receipt_code
BEFORE INSERT ON public.graine_sales
FOR EACH ROW EXECUTE FUNCTION public.set_receipt_code();

CREATE OR REPLACE FUNCTION public.create_sale_movement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.item_id IS NOT NULL THEN
    INSERT INTO public.graine_stock_movements(item_id, franchise_id, kind, qty, unit_price, note, created_by)
    VALUES (NEW.item_id, NEW.franchise_id, 'sale', NEW.qty, NEW.unit_price, 'sale:' || NEW.sale_id, auth.uid());
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_create_sale_movement
AFTER INSERT ON public.graine_sale_items
FOR EACH ROW EXECUTE FUNCTION public.create_sale_movement();

-- ---------------------------------------------------------------------
-- Vue agrégée admin (KPIs par franchise)
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_franchise_stock_kpis AS
SELECT
  c.id AS franchise_id,
  c.shop_name,
  c.city,
  COALESCE((SELECT COUNT(*) FROM public.graine_stock_items i WHERE i.franchise_id = c.id AND i.is_active), 0) AS items_count,
  COALESCE((SELECT COUNT(*) FROM public.graine_stock_items i WHERE i.franchise_id = c.id AND i.is_active AND i.stock_qty <= i.low_stock_threshold), 0) AS low_stock_count,
  COALESCE((SELECT SUM(total_amount) FROM public.graine_sales s WHERE s.franchise_id = c.id AND s.created_at >= date_trunc('day', now())), 0) AS revenue_today,
  COALESCE((SELECT SUM(total_amount) FROM public.graine_sales s WHERE s.franchise_id = c.id AND s.created_at >= date_trunc('month', now())), 0) AS revenue_month
FROM public.graine_franchise_contracts c;

GRANT SELECT ON public.v_franchise_stock_kpis TO authenticated;
