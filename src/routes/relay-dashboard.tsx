import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Package, MapPin, CheckCircle2, Clock, Truck, ScanLine, TrendingUp, Bell, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SiteHeader } from "@/components/site-header";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/relay-dashboard")({ component: RelayDashboard });

function RelayDashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [scanMode, setScanMode] = useState<null | "receive" | "deliver">(null);
  const [search, setSearch] = useState("");

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth", replace: true }); }, [user, loading, navigate]);

  const { data: relays } = useQuery({
    queryKey: ["my-relays", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("msn_relay_points").select("id, name, city, neighborhood, status").eq("owner_id", user!.id)).data ?? [],
  });

  const relayIds = useMemo(() => (relays ?? []).map(r => r.id), [relays]);

  const { data: deliveries, refetch } = useQuery({
    queryKey: ["relay-deliveries", relayIds.join(",")],
    enabled: relayIds.length > 0,
    queryFn: async () => (await supabase.from("msn_deliveries").select("*, msn_relay_points(name, city)").in("relay_point_id", relayIds).order("created_at",{ascending:false}).limit(200)).data ?? [],
  });

  const { data: notifs } = useQuery({
    queryKey: ["relay-notifs", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("msn_notifications").select("*").eq("recipient_id", user!.id).order("created_at",{ascending:false}).limit(20)).data ?? [],
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("relay-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "msn_deliveries" }, () => refetch())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "msn_notifications", filter: `recipient_id=eq.${user.id}` }, () => qc.invalidateQueries({ queryKey: ["relay-notifs"] }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, refetch, qc]);

  const incoming = (deliveries ?? []).filter(d => d.status === "pending" || d.status === "picked_up");
  const atRelay = (deliveries ?? []).filter(d => d.status === "at_relay");
  const delivered = (deliveries ?? []).filter(d => d.status === "delivered");

  const monthRevenue = delivered
    .filter(d => new Date(d.delivered_at ?? d.created_at).getMonth() === new Date().getMonth())
    .reduce((s, d) => s + Number(d.delivery_price ?? 0) * 0.15, 0); // 15% commission relais estimée

  const onScan = async (code: string) => {
    if (!scanMode) return;
    const d = (deliveries ?? []).find(x => x.tracking_code?.toLowerCase() === code.toLowerCase());
    if (!d) { toast.error("Colis introuvable dans vos relais"); return; }
    if (scanMode === "receive") {
      if (!["pending","picked_up"].includes(d.status)) { toast.error("Ce colis n'est pas en attente de réception"); return; }
      const { error } = await supabase.from("msn_deliveries").update({ status: "at_relay", at_relay_at: new Date().toISOString() }).eq("id", d.id);
      if (error) { toast.error(error.message); return; }
      await supabase.from("msn_delivery_scans").insert({ delivery_id: d.id, scanned_by: user!.id, scanner_role: "relay_owner", action: "at_relay", note: "Scan réception" });
      toast.success(`Colis ${d.tracking_code} reçu au relais`);
    } else {
      if (d.status !== "at_relay") { toast.error("Ce colis n'est pas prêt à être remis"); return; }
      const { error } = await supabase.from("msn_deliveries").update({ status: "delivered", delivered_at: new Date().toISOString() }).eq("id", d.id);
      if (error) { toast.error(error.message); return; }
      await supabase.from("msn_delivery_scans").insert({ delivery_id: d.id, scanned_by: user!.id, scanner_role: "relay_owner", action: "delivered", note: "Remise au client" });
      toast.success(`Colis ${d.tracking_code} remis au client`);
    }
    refetch();
    setScanMode(null);
  };

  if (loading || !user) return <div className="min-h-screen grid place-items-center">Chargement…</div>;

  if (!relays?.length) {
    return (
      <div className="min-h-screen bg-muted/30">
        <SiteHeader />
        <main className="container mx-auto px-4 py-16 max-w-2xl text-center">
          <Store className="size-14 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-display font-bold">Vous n'avez pas encore de point relais actif</h1>
          <p className="text-muted-foreground mt-2 mb-6">Postulez pour devenir point relais MSN Delivery.</p>
          <Button asChild className="bg-gradient-primary"><Link to="/become-relay">Postuler</Link></Button>
        </main>
      </div>
    );
  }

  const filtered = (deliveries ?? []).filter(d => !search || d.tracking_code?.toLowerCase().includes(search.toLowerCase()) || d.order_code?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-muted/30">
      <SiteHeader />
      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold">Dashboard Point Relais</h1>
            <p className="text-muted-foreground mt-1">{relays.map(r => r.name).join(" · ")}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => setScanMode("receive")} className="bg-gradient-primary shadow-glow"><ScanLine className="mr-1 size-4" />Scanner réception</Button>
            <Button onClick={() => setScanMode("deliver")} variant="outline"><ScanLine className="mr-1 size-4" />Scanner remise client</Button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Kpi icon={Clock} label="En attente" value={incoming.length} tone="warning" />
          <Kpi icon={MapPin} label="À remettre" value={atRelay.length} tone="bronze" />
          <Kpi icon={CheckCircle2} label="Remis (total)" value={delivered.length} tone="success" />
          <Kpi icon={TrendingUp} label="Commission ce mois" value={`${Math.round(monthRevenue).toLocaleString("fr-FR")} F`} tone="primary" />
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <Card title={`À recevoir (${incoming.length})`} empty="Aucun colis attendu">
            {incoming.slice(0, 8).map(d => <Row key={d.id} d={d} />)}
          </Card>
          <Card title={`Prêts à remettre (${atRelay.length})`} empty="Aucun colis en stock">
            {atRelay.slice(0, 8).map(d => <Row key={d.id} d={d} highlight />)}
          </Card>
          <Card title="Notifications" empty="Pas de notifications">
            {(notifs ?? []).slice(0, 8).map((n: any) => (
              <div key={n.id} className="p-3 border-b last:border-0 text-sm">
                <div className="flex items-center gap-2 mb-1"><Bell className="size-3 text-primary" /><span className="font-semibold">{n.title}</span></div>
                <p className="text-xs text-muted-foreground">{n.body}</p>
              </div>
            ))}
          </Card>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-soft overflow-hidden">
          <div className="p-4 border-b flex flex-wrap items-center gap-3 justify-between">
            <h2 className="font-display font-bold text-lg">Historique</h2>
            <Input placeholder="Code tracking ou commande…" value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
          </div>
          <div className="divide-y">
            {!filtered.length ? <p className="p-6 text-muted-foreground text-sm text-center">Aucun colis</p> : filtered.slice(0, 50).map(d => <Row key={d.id} d={d} dense />)}
          </div>
        </div>
      </main>

      <BarcodeScanner open={!!scanMode} onClose={() => setScanMode(null)} onCode={onScan} />
    </div>
  );
}

function Kpi({ icon: Icon, label, value, tone = "primary" }: any) {
  const tones: Record<string,string> = {
    primary: "bg-gradient-primary text-primary-foreground",
    bronze: "bg-gradient-bronze text-bronze-foreground",
    warning: "bg-warning/20 text-warning-foreground border border-warning/30",
    success: "bg-success/20 text-success-foreground border border-success/30",
  };
  return (
    <div className={`rounded-2xl p-5 shadow-elegant ${tones[tone]}`}>
      <div className="flex items-center justify-between mb-2"><Icon className="size-5 opacity-80" /><span className="text-[10px] uppercase tracking-wider opacity-80">{label}</span></div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  );
}

function Card({ title, empty, children }: any) {
  const hasContent = Array.isArray(children) ? children.length > 0 : !!children;
  return (
    <div className="bg-card rounded-2xl border border-border shadow-soft overflow-hidden">
      <div className="p-4 border-b font-display font-bold">{title}</div>
      <div className="max-h-96 overflow-auto">{hasContent ? children : <p className="p-6 text-sm text-muted-foreground text-center">{empty}</p>}</div>
    </div>
  );
}

const STATUS: Record<string,{label:string;cls:string;icon:any}> = {
  pending: { label: "En attente", cls: "bg-warning/20 text-warning-foreground border-warning/30", icon: Clock },
  picked_up: { label: "Ramassé", cls: "bg-blue-500/20 text-blue-700 border-blue-500/30 dark:text-blue-300", icon: Truck },
  at_relay: { label: "Au relais", cls: "bg-bronze/20 text-bronze border-bronze/30", icon: MapPin },
  delivered: { label: "Remis", cls: "bg-success/20 text-success-foreground border-success/30", icon: CheckCircle2 },
  cancelled: { label: "Annulé", cls: "bg-destructive/20 text-destructive border-destructive/30", icon: Clock },
};

function Row({ d, highlight, dense }: any) {
  const s = STATUS[d.status] ?? STATUS.pending;
  return (
    <div className={`p-3 flex items-center gap-3 ${highlight ? "bg-primary/5" : ""}`}>
      <div className="size-9 rounded-lg bg-accent grid place-items-center text-bronze shrink-0"><Package className="size-4" /></div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm truncate">{d.provider_name}</div>
        {d.tracking_code && <div className="text-[10px] font-mono text-primary">{d.tracking_code}</div>}
        {!dense && <div className="text-xs text-muted-foreground truncate">{d.order_code ? `Cmd #${d.order_code}` : "Sans code"}</div>}
      </div>
      <Badge className={`${s.cls} border text-xs`}><s.icon className="size-3 mr-1" />{s.label}</Badge>
    </div>
  );
}
