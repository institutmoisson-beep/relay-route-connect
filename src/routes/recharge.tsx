import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { Smartphone, Link2, Bitcoin, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/recharge")({ component: RechargePage });

const schema = z.object({
  amount: z.number().min(500).max(5000000),
  operator: z.string().min(2).max(40),
  sender_phone: z.string().min(3).max(80),
  transaction_id: z.string().min(3).max(80),
});

const ICONS: Record<string, any> = { mobile_money: Smartphone, payment_link: Link2, crypto: Bitcoin };

function RechargePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth", replace: true }); }, [user, loading, navigate]);

  const { data: services } = useQuery({
    queryKey: ["payment-services"],
    queryFn: async () => (await supabase.from("msn_payment_services").select("*").eq("is_active", true).order("sort_order")).data ?? [],
  });

  useEffect(() => { if (services && services.length && !selected) setSelected(services[0].id); }, [services, selected]);

  const svc = services?.find(s => s.id === selected);

  const copy = (txt: string) => { navigator.clipboard.writeText(txt); toast.success("Copié"); };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !svc) return;
    const f = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      amount: Number(f.get("amount")),
      operator: svc.label,
      sender_phone: f.get("sender_phone"),
      transaction_id: f.get("transaction_id"),
    });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setSubmitting(true);
    const { error } = await supabase.from("msn_wallet_recharge_requests").insert({ user_id: user.id, ...parsed.data });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Demande envoyée ! Validation après vérification.");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <SiteHeader />
      <main className="container mx-auto px-4 py-10 max-w-3xl">
        <h1 className="text-3xl font-display font-bold mb-2">Recharger mon portefeuille</h1>
        <p className="text-muted-foreground mb-8">Choisissez un service, effectuez le paiement, puis confirmez ci-dessous.</p>

        {!services?.length ? (
          <div className="p-8 bg-card border rounded-2xl text-center text-muted-foreground">Aucun service de paiement disponible pour le moment.</div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
              {services.map(s => {
                const Icon = ICONS[s.kind] || Smartphone;
                const active = selected === s.id;
                return (
                  <button key={s.id} onClick={() => setSelected(s.id)} className={`text-left p-4 rounded-2xl border-2 transition ${active ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/50"}`}>
                    <div className="flex items-center gap-3">
                      <div className={`size-10 rounded-xl grid place-items-center ${active ? "bg-gradient-primary text-primary-foreground" : "bg-accent text-bronze"}`}><Icon className="size-5" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm truncate">{s.label}</div>
                        <div className="text-xs text-muted-foreground capitalize">{s.kind.replace("_", " ")}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {svc && (
              <>
                <div className="bg-bronze/10 border border-bronze/30 rounded-2xl p-5 mb-6">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Instructions</p>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-lg text-primary break-all">{svc.identifier}</span>
                    <Button size="sm" variant="ghost" onClick={() => copy(svc.identifier)}><Copy className="size-3" /></Button>
                  </div>
                  {svc.link_url && (
                    <Button asChild variant="outline" size="sm" className="mb-2"><a href={svc.link_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="size-3 mr-1" />Ouvrir le lien</a></Button>
                  )}
                  {svc.instructions && <p className="text-sm text-muted-foreground mt-2">{svc.instructions}</p>}
                </div>

                <form onSubmit={submit} className="space-y-5 bg-card border border-border rounded-2xl p-6 shadow-soft">
                  <div><Label>Montant (FCFA) *</Label><Input name="amount" type="number" min={500} step={100} required /></div>
                  <div><Label>Votre identifiant émetteur (téléphone / wallet) *</Label><Input name="sender_phone" required maxLength={80} /></div>
                  <div><Label>ID de transaction *</Label><Input name="transaction_id" required maxLength={80} placeholder="Hash, référence MP, txid..." /></div>
                  <Button disabled={submitting} className="w-full bg-gradient-primary h-11">{submitting ? "..." : `Envoyer la demande (${svc.label})`}</Button>
                </form>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
