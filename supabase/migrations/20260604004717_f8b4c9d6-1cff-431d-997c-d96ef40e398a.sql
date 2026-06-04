-- Remove crowdfunding/investment platform entirely
DROP TABLE IF EXISTS public.crowd_investments CASCADE;
DROP TABLE IF EXISTS public.crowd_wallets CASCADE;
DROP TABLE IF EXISTS public.crowd_kyc CASCADE;
DROP TABLE IF EXISTS public.crowd_projects CASCADE;

-- Admin audit log table (immutable trail of critical admin actions)
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  target_type text,
  target_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_hash text,
  user_agent_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.admin_audit_logs TO authenticated;
GRANT ALL ON public.admin_audit_logs TO service_role;

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins/super_admins can read audit logs
CREATE POLICY "Admins read audit logs"
  ON public.admin_audit_logs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Only admins can insert their own logs; nobody can update or delete (immutable)
CREATE POLICY "Admins insert their own audit logs"
  ON public.admin_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    admin_id = auth.uid()
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  );

-- No UPDATE, no DELETE policies → trail is append-only/immutable for users.

CREATE INDEX IF NOT EXISTS admin_audit_logs_admin_id_idx ON public.admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS admin_audit_logs_created_at_idx ON public.admin_audit_logs(created_at DESC);