
-- Vue invoker (respecte RLS du caller)
DROP VIEW IF EXISTS public.v_franchise_stock_kpis;
CREATE VIEW public.v_franchise_stock_kpis
WITH (security_invoker = on) AS
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

-- Revoke EXECUTE from anon on the new SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.user_franchise_ids(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.apply_stock_movement() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_sale_movement() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_receipt_code() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, PUBLIC;

GRANT EXECUTE ON FUNCTION public.user_franchise_ids(uuid) TO authenticated;
