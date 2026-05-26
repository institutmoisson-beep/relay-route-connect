import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/recharge")({ component: RechargePage });

const schema = z.object({
  amount: z.number().min(500).max(1000000),
  operator: z.enum(["orange", "moov", "mtn", "wave"]),
  sender_phone: z.string().min(8).max(20),
  transaction_id: z.string().min(3).max(50),
});

function RechargePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth", replace: true }); }, [user, loading, navigate]);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const f = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      amount: Number(f.get("amount")),
      operator: f.get("operator"),
      sender_phone: f.get("sender_phone"),
      transaction_id: f.get("transaction_id"),
    });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setSubmitting(true);
    const { error } = await supabase.from("msn_wallet_recharge_requests").insert({ user_id: user.id, ...parsed.data });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Demande envoyée ! Validation sous 24h.");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <SiteHeader />
      <main className="container mx-auto px-4 py-10 max-w-xl">
        <h1 className="text-3xl font-display font-bold mb-2">Recharger mon portefeuille</h1>
        <p className="text-muted-foreground mb-8">Effectuez le dépôt mobile puis remplissez le formulaire.</p>

        <div className="bg-bronze/10 border border-bronze/30 rounded-2xl p-5 mb-6 text-sm">
          <p className="font-semibold mb-2">Numéro MSN Delivery</p>
          <p>Orange / Moov / MTN / Wave : <span className="font-bold text-primary">+225 07 00 00 00 00</span></p>
          <p className="text-muted-foreground mt-2">Faites votre dépôt sur ce numéro, puis remplissez ci-dessous.</p>
        </div>

        <form onSubmit={submit} className="space-y-5 bg-card border border-border rounded-2xl p-6 shadow-soft">
          <div><Label>Montant (FCFA) *</Label><Input name="amount" type="number" min={500} max={1000000} step={100} required /></div>
          <div>
            <Label>Opérateur *</Label>
            <Select name="operator" defaultValue="orange">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="orange">Orange Money</SelectItem>
                <SelectItem value="moov">Moov Money</SelectItem>
                <SelectItem value="mtn">MTN MoMo</SelectItem>
                <SelectItem value="wave">Wave</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Votre numéro (émetteur) *</Label><Input name="sender_phone" type="tel" placeholder="+225 ..." required /></div>
          <div><Label>ID de transaction *</Label><Input name="transaction_id" required placeholder="Ex: MP240526.1234.A12345" /></div>
          <Button disabled={submitting} className="w-full bg-gradient-primary h-11">{submitting ? "..." : "Envoyer la demande"}</Button>
        </form>
      </main>
    </div>
  );
}
