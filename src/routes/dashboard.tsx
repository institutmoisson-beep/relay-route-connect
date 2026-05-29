import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Wallet, Package, MapPin, CheckCircle2, Clock, Truck, Plus, ArrowRight, Store, Shield, Inbox, FileText, Download, PenLine, Star, Sprout } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { generateContractPDF, type ContractData } from "@/lib/contract-pdf";
import { generateFranchiseContractPDF, type FranchiseContractData } from "@/lib/franchise-pdf";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
});


const STATUS_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  pending: { label: "En attente", icon: Clock, color: "bg-warning/20 text-warning-foreground border-warning/40" },
  picked_up: { label: "Ramassé", icon: Truck, color: "bg-blue-500/20 text-blue-700 border-blue-500/40 dark:text-blue-300" },
  at_relay: { label: "Au point relais", icon: MapPin, color: "bg-bronze/20 text-bronze border-bronze/40" },
  delivered: { label: "Livré", icon: CheckCircle2, color: "bg-success/20 text-success-foreground border-success/40" },
  cancelled: { label: "Annulé", icon: Clock, color: "bg-destructive/20 text-destructive border-destructive/40" },
};

function Dashboard() {
  const { user, profile, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [tab, setTab] = useState<"deliveries" | "recharges" | "contracts" | "franchises">("deliveries");
  const [signingContract, setSigningContract] = useState<any | null>(null);
  const [signingFranchise, setSigningFranchise] = useState<any | null>(null);
  const [sigName, setSigName] = useState("");
  const [ratingDelivery, setRatingDelivery] = useState<any | null>(null);
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingComment, setRatingComment] = useState("");


  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", replace: true });
  }, [user, loading, navigate]);

  const { data: deliveries } = useQuery({
    queryKey: ["deliveries", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("msn_deliveries").select("*, msn_relay_points(name, city, neighborhood)").eq("user_id", user!.id).order("created_at",{ascending:false})).data ?? [],
  });
  const { data: recharges } = useQuery({
    queryKey: ["recharges", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("msn_wallet_recharge_requests").select("*").eq("user_id", user!.id).order("created_at",{ascending:false})).data ?? [],
  });
  const { data: contracts } = useQuery({
    queryKey: ["contracts", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("msn_contracts").select("*").eq("user_id", user!.id).order("created_at",{ascending:false})).data ?? [],
  });
  const { data: franchises } = useQuery({
    queryKey: ["franchise-contracts", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("graine_franchise_contracts").select("*").eq("user_id", user!.id).order("created_at",{ascending:false})).data ?? [],
  });
  const { data: myReviews } = useQuery({
    queryKey: ["my-reviews", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("msn_relay_reviews").select("delivery_id").eq("user_id", user!.id)).data ?? [],
  });
  const reviewedIds = new Set((myReviews ?? []).map((r: any) => r.delivery_id));


  if (loading || !user) {
    return <div className="min-h-screen grid place-items-center">Chargement…</div>;
  }

  const stats = {
    total: deliveries?.length ?? 0,
    inProgress: deliveries?.filter(d => ["pending","picked_up","at_relay"].includes(d.status)).length ?? 0,
    delivered: deliveries?.filter(d => d.status === "delivered").length ?? 0,
  };

  const downloadContract = (c: ContractData) => {
    const pdf = generateContractPDF(c);
    pdf.save(`Contrat-${c.contract_number}.pdf`);
  };

  const signContract = async () => {
    if (!signingContract || sigName.trim().length < 2) { toast.error("Saisissez votre signature (nom)"); return; }
    const { error } = await supabase.from("msn_contracts").update({
      partner_signature: sigName.trim(),
      partner_signed_at: new Date().toISOString(),
    }).eq("id", signingContract.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Contrat signé !");
    setSigningContract(null); setSigName("");
    qc.invalidateQueries({ queryKey: ["contracts"] });
    qc.invalidateQueries({ queryKey: ["contracts"] });
  };

  const downloadFranchise = (c: FranchiseContractData) => {
    const pdf = generateFranchiseContractPDF(c);
    pdf.save(`Franchise-${c.contract_number}.pdf`);
  };

  const signFranchise = async () => {
    if (!signingFranchise || sigName.trim().length < 2) { toast.error("Saisissez votre signature (nom)"); return; }
    const { error } = await supabase.from("graine_franchise_contracts").update({
      franchisee_signature: sigName.trim(),
      franchisee_signed_at: new Date().toISOString(),
    }).eq("id", signingFranchise.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Contrat franchise signé !");
    setSigningFranchise(null); setSigName("");
    qc.invalidateQueries({ queryKey: ["franchise-contracts"] });
  };

  const submitRating = async () => {
    if (!ratingDelivery) return;
    const { error } = await supabase.from("msn_relay_reviews").insert({
      user_id: user!.id,
      relay_point_id: ratingDelivery.relay_point_id,
      delivery_id: ratingDelivery.id,
      rating: ratingStars,
      comment: ratingComment.trim() || null,
    });
    if (error) { toast.error(error.message); return; }
    // Update relay aggregate
    const { data: agg } = await supabase.from("msn_relay_reviews").select("rating").eq("relay_point_id", ratingDelivery.relay_point_id);
    if (agg && agg.length) {
      const avg = agg.reduce((s: number, r: any) => s + r.rating, 0) / agg.length;
      await supabase.from("msn_relay_points").update({ rating: Number(avg.toFixed(2)), total_reviews: agg.length }).eq("id", ratingDelivery.relay_point_id);
    }
    toast.success("Merci pour votre avis !");
    setRatingDelivery(null); setRatingStars(5); setRatingComment("");
    qc.invalidateQueries({ queryKey: ["my-reviews"] });
  };


  return (
    <div className="min-h-screen bg-muted/30">
      <SiteHeader />
      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold">Bonjour, {profile?.full_name || "👋"}</h1>
            <p className="text-muted-foreground mt-1">Voici l'état de vos livraisons.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {isAdmin && (
              <Button asChild size="lg" className="bg-gradient-bronze text-bronze-foreground shadow-elegant">
                <Link to="/admin"><Shield className="mr-1 size-4" />Administration</Link>
              </Button>
            )}
            <Button asChild className="bg-gradient-primary shadow-glow"><Link to="/order"><Plus className="mr-1 size-4" />Nouvelle commande</Link></Button>
            <Button asChild variant="outline"><Link to="/inbox"><Inbox className="mr-1 size-4" />Boîte canal</Link></Button>
            <Button asChild variant="outline"><Link to="/recharge"><Wallet className="mr-1 size-4" />Recharger</Link></Button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="rounded-2xl p-6 bg-gradient-bronze text-bronze-foreground shadow-elegant">
            <div className="flex items-center justify-between mb-3">
              <Wallet className="size-6 opacity-80" />
              <span className="text-xs uppercase tracking-wider opacity-80">Portefeuille</span>
            </div>
            <div className="text-3xl font-bold">{Number(profile?.wallet_balance ?? 0).toLocaleString("fr-FR")} <span className="text-lg opacity-80">FCFA</span></div>
            <Link to="/recharge" className="text-xs mt-2 inline-flex items-center gap-1 opacity-90 hover:opacity-100">Recharger <ArrowRight className="size-3" /></Link>
          </div>
          <Kpi icon={Package} label="Total commandes" value={stats.total} />
          <Kpi icon={Truck} label="En cours" value={stats.inProgress} />
          <Kpi icon={CheckCircle2} label="Livrées" value={stats.delivered} />
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-soft overflow-hidden">
          <div className="flex border-b border-border overflow-x-auto">
            <TabBtn active={tab==="deliveries"} onClick={() => setTab("deliveries")}>Mes livraisons</TabBtn>
            <TabBtn active={tab==="recharges"} onClick={() => setTab("recharges")}>Mes recharges</TabBtn>
            <TabBtn active={tab==="contracts"} onClick={() => setTab("contracts")}>Mes contrats {contracts?.length ? `(${contracts.length})` : ""}</TabBtn>
          </div>

          {tab === "deliveries" && (
            <div className="divide-y divide-border">
              {!deliveries?.length ? (
                <EmptyState icon={Package} title="Aucune commande" desc="Passez votre première commande dès maintenant." cta={<Button asChild className="bg-gradient-primary"><Link to="/order">Commander</Link></Button>} />
              ) : deliveries.map(d => {
                const s = STATUS_LABELS[d.status];
                return (
                  <div key={d.id} className="p-5 flex flex-wrap items-center gap-4">
                    <div className="size-12 rounded-xl bg-accent grid place-items-center text-bronze"><Package /></div>
                    <div className="flex-1 min-w-[200px]">
                      <div className="font-semibold">{d.provider_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {d.order_code && <>Cmd #{d.order_code} · </>}
                        {(d as any).msn_relay_points ? `${(d as any).msn_relay_points.name} — ${(d as any).msn_relay_points.city}` : "Relais non sélectionné"}
                        {d.estimated_distance_km && <> · {d.estimated_distance_km} km</>}
                      </div>
                    </div>
                    <Badge className={`${s.color} border`}><s.icon className="size-3 mr-1" />{s.label}</Badge>
                    <div className="font-bold text-primary">{Number(d.delivery_price).toLocaleString("fr-FR")} FCFA</div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === "recharges" && (
            <div className="divide-y divide-border">
              {!recharges?.length ? (
                <EmptyState icon={Wallet} title="Aucune recharge" desc="Rechargez votre portefeuille pour payer vos livraisons." cta={<Button asChild className="bg-gradient-primary"><Link to="/recharge">Recharger</Link></Button>} />
              ) : recharges.map(r => (
                <div key={r.id} className="p-5 flex flex-wrap items-center gap-4">
                  <div className="size-12 rounded-xl bg-accent grid place-items-center text-bronze"><Wallet /></div>
                  <div className="flex-1 min-w-[200px]">
                    <div className="font-semibold">{Number(r.amount).toLocaleString("fr-FR")} FCFA · {r.operator.toUpperCase()}</div>
                    <div className="text-sm text-muted-foreground">TXN: {r.transaction_id} · {new Date(r.created_at).toLocaleDateString("fr-FR")}</div>
                  </div>
                  <Badge className={r.status === "approved" ? "bg-success/20 text-success-foreground border-success/40 border" : r.status === "rejected" ? "bg-destructive/20 text-destructive border-destructive/40 border" : "bg-warning/20 text-warning-foreground border-warning/40 border"}>
                    {r.status === "approved" ? "Validée" : r.status === "rejected" ? "Rejetée" : "En attente"}
                  </Badge>
                </div>
              ))}
            </div>
          )}

          {tab === "contracts" && (
            <div className="divide-y divide-border">
              {!contracts?.length ? (
                <EmptyState icon={FileText} title="Aucun contrat" desc="Vos contrats de partenariat apparaîtront ici après acceptation de votre candidature." />
              ) : contracts.map(c => (
                <div key={c.id} className="p-5 flex flex-wrap items-center gap-4">
                  <div className="size-12 rounded-xl bg-accent grid place-items-center text-bronze"><FileText /></div>
                  <div className="flex-1 min-w-[200px]">
                    <div className="font-semibold">{c.space_name}</div>
                    <div className="text-sm text-muted-foreground">N° {c.contract_number} · {c.city}, {c.neighborhood}</div>
                  </div>
                  {c.partner_signature ? (
                    <Badge className="bg-success/20 text-success-foreground border-success/40 border">Signé</Badge>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setSigningContract(c)}><PenLine className="size-3 mr-1" />Signer</Button>
                  )}
                  <Button size="sm" className="bg-gradient-primary" onClick={() => downloadContract(c as ContractData)}><Download className="size-3 mr-1" />Télécharger</Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 rounded-2xl bg-hero text-white p-8 flex flex-wrap items-center justify-between gap-6 shadow-elegant relative overflow-hidden">
          <div className="glow-orb size-[300px] -right-10 -top-10" />
          <div className="flex items-start gap-4 relative">
            <div className="size-12 rounded-xl bg-gradient-primary grid place-items-center"><Store /></div>
            <div>
              <h3 className="text-xl font-bold">Devenez point relais MSN</h3>
              <p className="opacity-80 text-sm mt-1">Transformez votre espace en source de revenus.</p>
            </div>
          </div>
          <Button asChild className="bg-gradient-primary shadow-glow relative"><Link to="/become-relay">Postuler</Link></Button>
        </div>
      </main>

      <Dialog open={!!signingContract} onOpenChange={(o) => !o && setSigningContract(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Signature numérique du contrat</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Saisissez votre nom complet pour signer numériquement le contrat <strong>{signingContract?.contract_number}</strong>.</p>
          <Input placeholder="Votre nom complet" value={sigName} onChange={e => setSigName(e.target.value)} maxLength={80} />
          <div className="p-4 rounded-lg bg-accent/40 border border-dashed text-center font-serif italic text-2xl text-primary">
            {sigName || "Votre signature"}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSigningContract(null)}>Annuler</Button>
            <Button className="bg-gradient-primary" onClick={signContract}>Signer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TabBtn({ active, onClick, children }: any) {
  return <button onClick={onClick} className={`px-6 py-4 font-semibold text-sm transition whitespace-nowrap ${active?"text-primary border-b-2 border-primary":"text-muted-foreground"}`}>{children}</button>;
}
function Kpi({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="rounded-2xl p-6 bg-card border border-border shadow-soft">
      <div className="flex items-center justify-between mb-3">
        <Icon className="size-6 text-primary" />
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  );
}
function EmptyState({ icon: Icon, title, desc, cta }: any) {
  return (
    <div className="py-16 text-center">
      <div className="size-16 rounded-2xl bg-accent grid place-items-center text-bronze mx-auto mb-4"><Icon /></div>
      <h3 className="font-bold text-lg">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1 mb-5">{desc}</p>
      {cta}
    </div>
  );
}
