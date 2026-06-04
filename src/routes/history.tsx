import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Package, Wallet, Bell, Filter, Download, ArrowLeft, Store, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { ADMIN_SLUG } from "@/lib/admin-security";

export const Route = createFileRoute("/history")({ component: HistoryPage });

type Row = {
  id: string;
  kind: "delivery" | "recharge" | "notification";
  date: string;
  title: string;
  subtitle: string;
  status: string;
  amount?: number;
};

function HistoryPage() {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [kind, setKind] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [q, setQ] = useState("");

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth", replace: true }); }, [user, loading, navigate]);

  // Deliveries: as customer + as relay owner (RLS already allows both)
  const { data: deliveries } = useQuery({
    queryKey: ["history-deliveries", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase
      .from("msn_deliveries")
      .select("*, msn_relay_points(name, city, neighborhood, owner_id)")
      .order("created_at", { ascending: false })
      .limit(500)).data ?? [],
  });
  const { data: recharges } = useQuery({
    queryKey: ["history-recharges", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase
      .from("msn_wallet_recharge_requests")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(500)).data ?? [],
  });
  const { data: notifications } = useQuery({
    queryKey: ["history-notifs", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase
      .from("msn_notifications")
      .select("*")
      .eq("recipient_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(500)).data ?? [],
  });

  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    (deliveries ?? []).forEach((d: any) => {
      const isMine = d.user_id === user?.id;
      const relay = d.msn_relay_points;
      out.push({
        id: `d-${d.id}`,
        kind: "delivery",
        date: d.created_at,
        title: isMine ? `Commande chez ${d.provider_name}` : `Livraison reçue · ${d.provider_name}`,
        subtitle: `${d.order_code ? `Cmd #${d.order_code} · ` : ""}${relay ? `${relay.name} — ${relay.city}` : "Sans relais"}${d.estimated_distance_km ? ` · ${d.estimated_distance_km} km` : ""}`,
        status: d.status,
        amount: Number(d.delivery_price ?? 0),
      });
    });
    (recharges ?? []).forEach((r: any) => out.push({
      id: `r-${r.id}`,
      kind: "recharge",
      date: r.created_at,
      title: `Recharge · ${r.operator}`,
      subtitle: `TXN ${r.transaction_id} · Émetteur ${r.sender_phone}`,
      status: r.status,
      amount: Number(r.amount),
    }));
    (notifications ?? []).forEach((n: any) => out.push({
      id: `n-${n.id}`,
      kind: "notification",
      date: n.created_at,
      title: n.title,
      subtitle: n.body ?? "",
      status: n.is_read ? "read" : "unread",
    }));
    return out.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [deliveries, recharges, notifications, user?.id]);

  const filtered = useMemo(() => rows.filter(r => {
    if (kind !== "all" && r.kind !== kind) return false;
    if (status !== "all" && r.status !== status) return false;
    if (from && new Date(r.date) < new Date(from)) return false;
    if (to) { const end = new Date(to); end.setDate(end.getDate() + 1); if (new Date(r.date) >= end) return false; }
    if (q) {
      const needle = q.toLowerCase();
      if (!(`${r.title} ${r.subtitle}`.toLowerCase().includes(needle))) return false;
    }
    return true;
  }), [rows, kind, status, from, to, q]);

  const total = filtered.filter(r => r.kind !== "notification").reduce((s, r) => s + (r.amount ?? 0), 0);

  const exportCsv = () => {
    const header = ["Date", "Type", "Titre", "Détails", "Statut", "Montant FCFA"].join(";");
    const lines = filtered.map(r => [
      new Date(r.date).toLocaleString("fr-FR"),
      r.kind,
      `"${r.title.replace(/"/g, "'")}"`,
      `"${r.subtitle.replace(/"/g, "'")}"`,
      r.status,
      r.amount ?? "",
    ].join(";"));
    const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `historique-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  };

  if (loading || !user) return <div className="min-h-screen grid place-items-center">Chargement…</div>;

  return (
    <div className="min-h-screen bg-muted/30">
      <SiteHeader />
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <Link to="/dashboard" className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:underline mb-1"><ArrowLeft className="size-3" />Tableau de bord</Link>
            <h1 className="text-3xl font-display font-bold">Historique des transactions</h1>
            <p className="text-muted-foreground text-sm">Commandes, recharges, livraisons reçues (relais) et notifications internes.</p>
          </div>
          <div className="flex gap-2">
            {isAdmin && <Button asChild variant="outline"><Link to="/admin">Admin global</Link></Button>}
            <Button variant="outline" onClick={exportCsv}><Download className="size-4 mr-1" />Exporter CSV</Button>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 mb-6 shadow-soft">
          <div className="flex items-center gap-2 mb-4 text-sm font-semibold"><Filter className="size-4" />Filtres</div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div><Label className="text-xs">Recherche</Label>
              <div className="relative"><Search className="absolute left-2 top-2.5 size-4 text-muted-foreground" /><Input className="pl-8" placeholder="Mot-clé, code, fournisseur..." value={q} onChange={e => setQ(e.target.value)} /></div>
            </div>
            <div><Label className="text-xs">Du</Label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} /></div>
            <div><Label className="text-xs">Au</Label><Input type="date" value={to} onChange={e => setTo(e.target.value)} /></div>
            <div><Label className="text-xs">Type</Label>
              <Select value={kind} onValueChange={setKind}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tout</SelectItem>
                  <SelectItem value="delivery">Livraisons</SelectItem>
                  <SelectItem value="recharge">Recharges</SelectItem>
                  <SelectItem value="notification">Notifications</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Statut</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="picked_up">Ramassé</SelectItem>
                  <SelectItem value="at_relay">Au relais</SelectItem>
                  <SelectItem value="delivered">Livré</SelectItem>
                  <SelectItem value="approved">Validé</SelectItem>
                  <SelectItem value="rejected">Rejeté</SelectItem>
                  <SelectItem value="cancelled">Annulé</SelectItem>
                  <SelectItem value="unread">Non lue</SelectItem>
                  <SelectItem value="read">Lue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <Badge className="bg-primary/10 text-primary border border-primary/30">{filtered.length} résultats</Badge>
            <Badge className="bg-bronze/10 text-bronze border border-bronze/30">Total mouvement: {total.toLocaleString("fr-FR")} FCFA</Badge>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-soft overflow-hidden divide-y divide-border">
          {!filtered.length ? (
            <div className="p-12 text-center text-muted-foreground">Aucune transaction ne correspond à ces filtres.</div>
          ) : filtered.map(r => {
            const Icon = r.kind === "delivery" ? Package : r.kind === "recharge" ? Wallet : Bell;
            return (
              <div key={r.id} className="p-4 flex flex-wrap items-center gap-4">
                <div className="size-11 rounded-xl bg-accent grid place-items-center text-bronze shrink-0"><Icon className="size-5" /></div>
                <div className="flex-1 min-w-[200px]">
                  <div className="font-semibold text-sm">{r.title}</div>
                  <div className="text-xs text-muted-foreground">{r.subtitle}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{new Date(r.date).toLocaleString("fr-FR")}</div>
                </div>
                <Badge variant="outline" className="capitalize">{r.status.replace("_", " ")}</Badge>
                {r.amount != null && <div className="font-bold text-primary text-sm">{r.amount.toLocaleString("fr-FR")} FCFA</div>}
              </div>
            );
          })}
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mt-8">
          <Link to="/become-relay" className="rounded-2xl p-5 bg-gradient-bronze text-bronze-foreground shadow-elegant flex items-center gap-3"><Store className="size-6" /><div><div className="font-bold">Devenir point relais</div><div className="text-xs opacity-80">Recevez des commandes et consultez votre historique dédié.</div></div></Link>
          <Link to="/franchise" className="rounded-2xl p-5 bg-gradient-primary text-primary-foreground shadow-glow flex items-center gap-3"><Sprout className="size-6" /><div><div className="font-bold">Franchise La Graine</div><div className="text-xs opacity-90">Suivez votre activité et vos approvisionnements.</div></div></Link>
        </div>
      </main>
    </div>
  );
}
