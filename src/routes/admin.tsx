import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Shield, Send, CheckCircle2, XCircle, Image as ImageIcon, ExternalLink, Eye, Plus, Trash2, Ban, Unlock, Package, Sprout, CreditCard, Users, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { compressImage } from "@/lib/image-compress";

export const Route = createFileRoute("/admin")({ component: AdminPage });

const TABS = [
  { k: "pricing", l: "Tarifs", icon: CreditCard },
  { k: "users", l: "Utilisateurs", icon: Users },
  { k: "relays", l: "Points relais", icon: Store },
  { k: "applications", l: "Candidatures relais", icon: CheckCircle2 },
  { k: "deliveries", l: "Livraisons", icon: Package },
  { k: "recharges", l: "Recharges", icon: CreditCard },
  { k: "history", l: "Historique global", icon: Package },
  { k: "payments", l: "Services paiement", icon: CreditCard },
  { k: "products", l: "Produits Graine", icon: Sprout },
  { k: "franchises", l: "Franchises Graine", icon: Sprout },
  { k: "broadcast", l: "Diffusion", icon: Send },
];

function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<string>("pricing");

  useEffect(() => {
    if (!loading) {
      if (!user) navigate({ to: "/auth", replace: true });
      else if (!isAdmin) navigate({ to: "/dashboard", replace: true });
    }
  }, [user, isAdmin, loading, navigate]);

  if (loading || !user || !isAdmin) return <div className="min-h-screen grid place-items-center">Chargement…</div>;

  return (
    <div className="min-h-screen bg-muted/30">
      <SiteHeader />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="size-12 rounded-2xl bg-gradient-bronze text-bronze-foreground grid place-items-center shadow-elegant"><Shield className="size-6" /></div>
          <div>
            <h1 className="text-3xl font-display font-bold">Administration</h1>
            <p className="text-muted-foreground text-sm">Pilotage MSN Delivery & La Graine — Celvus Parfait</p>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-soft overflow-hidden">
          <div className="flex border-b border-border overflow-x-auto">
            {TABS.map(t => (
              <button key={t.k} onClick={() => setTab(t.k)} className={`px-4 py-4 text-xs sm:text-sm font-semibold whitespace-nowrap flex items-center gap-1.5 ${tab===t.k?"text-primary border-b-2 border-primary":"text-muted-foreground"}`}>
                <t.icon className="size-3.5" />{t.l}
              </button>
            ))}
          </div>
          <div className="p-6">
            {tab === "pricing" && <PricingPanel qc={qc} />}
            {tab === "users" && <UsersPanel qc={qc} />}
            {tab === "relays" && <RelaysPanel qc={qc} />}
            {tab === "applications" && <ApplicationsPanel qc={qc} />}
            {tab === "deliveries" && <DeliveriesPanel />}
            {tab === "recharges" && <RechargesPanel qc={qc} />}
            {tab === "history" && <GlobalHistoryPanel />}
            {tab === "payments" && <PaymentServicesPanel qc={qc} />}
            {tab === "products" && <ProductsPanel qc={qc} />}
            {tab === "franchises" && <FranchisesPanel qc={qc} />}
            {tab === "broadcast" && <BroadcastPanel userId={user.id} qc={qc} />}
          </div>
        </div>
      </main>
    </div>
  );
}

// ============= PRICING =============
function PricingPanel({ qc }: any) {
  const { data: p } = useQuery({
    queryKey: ["admin-pricing"],
    queryFn: async () => (await supabase.from("msn_pricing_config").select("*").eq("id", 1).maybeSingle()).data,
  });
  const [form, setForm] = useState<any>(null);
  useEffect(() => { if (p && !form) setForm(p); }, [p, form]);
  if (!form) return null;
  const save = async () => {
    const { error } = await supabase.from("msn_pricing_config").update({
      base_price: Number(form.base_price), price_per_km: Number(form.price_per_km),
      weekend_multiplier: Number(form.weekend_multiplier), rain_multiplier: Number(form.rain_multiplier),
      holiday_multiplier: Number(form.holiday_multiplier), strike_multiplier: Number(form.strike_multiplier),
      rain_active: !!form.rain_active, holiday_active: !!form.holiday_active, strike_active: !!form.strike_active,
    }).eq("id", 1);
    if (error) { toast.error(error.message); return; }
    toast.success("Tarifs mis à jour");
    qc.invalidateQueries({ queryKey: ["pricing"] });
    qc.invalidateQueries({ queryKey: ["admin-pricing"] });
  };
  const Num = ({ k, label }: any) => (<div><Label>{label}</Label><Input type="number" step="0.01" value={form[k] ?? ""} onChange={e => setForm({ ...form, [k]: e.target.value })} /></div>);
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="grid sm:grid-cols-2 gap-4">
        <Num k="base_price" label="Prix de base (FCFA)" />
        <Num k="price_per_km" label="Prix par km (FCFA)" />
      </div>
      <div>
        <h3 className="font-bold mb-3">Multiplicateurs</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <Num k="weekend_multiplier" label="× Week-end" />
          <Num k="rain_multiplier" label="× Pluie" />
          <Num k="holiday_multiplier" label="× Jour férié" />
          <Num k="strike_multiplier" label="× Grève" />
        </div>
      </div>
      <div>
        <h3 className="font-bold mb-3">Conditions actives</h3>
        <div className="space-y-3">
          {[{k:"rain_active",l:"Pluie en cours"},{k:"holiday_active",l:"Jour férié"},{k:"strike_active",l:"Grève en cours"}].map(s => (
            <label key={s.k} className="flex items-center justify-between p-3 rounded-lg border">
              <span className="text-sm">{s.l}</span>
              <Switch checked={!!form[s.k]} onCheckedChange={(v) => setForm({ ...form, [s.k]: v })} />
            </label>
          ))}
        </div>
      </div>
      <Button onClick={save} className="bg-gradient-primary">Enregistrer</Button>
    </div>
  );
}

// ============= USERS =============
function UsersPanel({ qc }: any) {
  const { data } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => (await supabase.from("profiles").select("*").order("created_at",{ascending:false}).limit(500)).data ?? [],
  });
  const toggleBlock = async (id: string, blocked: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_blocked: !blocked }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(blocked ? "Débloqué" : "Bloqué");
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  };
  return (
    <div className="space-y-2">
      {!data?.length && <p className="text-sm text-muted-foreground">Aucun utilisateur.</p>}
      {data?.map(u => (
        <div key={u.id} className="border rounded-xl p-4 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <div className="font-bold">{u.full_name || "—"} {u.is_blocked && <Badge className="bg-destructive/20 text-destructive border-destructive/40 border ml-2">Bloqué</Badge>}</div>
            <div className="text-xs text-muted-foreground">{u.phone || "—"} · {Number(u.wallet_balance).toLocaleString("fr-FR")} FCFA</div>
          </div>
          <Button size="sm" variant={u.is_blocked ? "outline" : "destructive"} onClick={() => toggleBlock(u.id, u.is_blocked)}>
            {u.is_blocked ? <><Unlock className="size-3 mr-1" />Débloquer</> : <><Ban className="size-3 mr-1" />Bloquer</>}
          </Button>
        </div>
      ))}
    </div>
  );
}

// ============= RELAYS =============
function RelaysPanel({ qc }: any) {
  const { data } = useQuery({
    queryKey: ["admin-relays"],
    queryFn: async () => (await supabase.from("msn_relay_points").select("*").order("created_at",{ascending:false})).data ?? [],
  });
  const [open, setOpen] = useState(false);
  const toggle = async (id: string, blocked: boolean) => {
    const { error } = await supabase.from("msn_relay_points").update({ is_blocked: !blocked, status: !blocked ? "suspended" : "active" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Mis à jour"); qc.invalidateQueries({ queryKey: ["admin-relays"] });
  };
  const del = async (id: string) => {
    if (!confirm("Supprimer définitivement ce point relais ?")) return;
    const { error } = await supabase.from("msn_relay_points").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Supprimé"); qc.invalidateQueries({ queryKey: ["admin-relays"] });
  };
  const setTrust = async (id: string, trust_level: string) => {
    const { error } = await supabase.from("msn_relay_points").update({ trust_level: trust_level as any }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Niveau de confiance mis à jour"); qc.invalidateQueries({ queryKey: ["admin-relays"] });
  };
  const create = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload: any = {
      name: String(f.get("name") || "").trim(),
      space_type: f.get("space_type"),
      country: String(f.get("country") || "Côte d'Ivoire").trim(),
      city: String(f.get("city") || "").trim(),
      neighborhood: String(f.get("neighborhood") || "").trim(),
      address: String(f.get("address") || "").trim() || null,
      phone: String(f.get("phone") || "").trim() || null,
      trust_level: f.get("trust_level") || "standard",
      status: "active",
    };
    if (!payload.name || !payload.city || !payload.neighborhood) return toast.error("Nom, ville et quartier requis");
    const { error } = await supabase.from("msn_relay_points").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Point relais créé"); setOpen(false);
    qc.invalidateQueries({ queryKey: ["admin-relays"] });
  };
  return (
    <div className="space-y-2">
      <div className="flex justify-between mb-2">
        <p className="text-sm text-muted-foreground">Vous pouvez créer un point relais directement, sans candidature.</p>
        <Button size="sm" className="bg-gradient-primary" onClick={() => setOpen(true)}><Plus className="size-3 mr-1" />Créer un relais</Button>
      </div>
      {!data?.length && <p className="text-sm text-muted-foreground">Aucun relais.</p>}
      {data?.map(r => (
        <div key={r.id} className="border rounded-xl p-4 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <div className="font-bold">{r.name} {r.is_blocked && <Badge className="bg-destructive/20 text-destructive border-destructive/40 border ml-2">Bloqué</Badge>}</div>
            <div className="text-xs text-muted-foreground">{r.city}, {r.neighborhood} · {r.space_type} · ★ {Number(r.rating).toFixed(1)} ({r.total_reviews})</div>
          </div>
          <Select defaultValue={r.trust_level} onValueChange={(v) => setTrust(r.id, v)}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="verified">Vérifié</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant={r.is_blocked ? "outline" : "destructive"} onClick={() => toggle(r.id, r.is_blocked)}>
            {r.is_blocked ? <><Unlock className="size-3 mr-1" />Débloquer</> : <><Ban className="size-3 mr-1" />Bloquer</>}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => del(r.id)}><Trash2 className="size-3" /></Button>
        </div>
      ))}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Créer un point relais</DialogTitle></DialogHeader>
          <form onSubmit={create} className="space-y-3">
            <div><Label>Nom de l'espace</Label><Input name="name" required /></div>
            <div>
              <Label>Type</Label>
              <Select name="space_type" defaultValue="shop">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="shop">Boutique</SelectItem>
                  <SelectItem value="restaurant">Restaurant</SelectItem>
                  <SelectItem value="maquis">Maquis</SelectItem>
                  <SelectItem value="establishment">Établissement</SelectItem>
                  <SelectItem value="individual">Particulier</SelectItem>
                  <SelectItem value="other">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Pays</Label><Input name="country" defaultValue="Côte d'Ivoire" /></div>
              <div><Label>Ville</Label><Input name="city" required /></div>
            </div>
            <div><Label>Quartier</Label><Input name="neighborhood" required /></div>
            <div><Label>Adresse</Label><Input name="address" /></div>
            <div><Label>Téléphone</Label><Input name="phone" /></div>
            <div>
              <Label>Niveau de confiance</Label>
              <Select name="trust_level" defaultValue="standard">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="verified">Vérifié</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter><Button type="submit" className="bg-gradient-primary">Créer</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============= APPLICATIONS =============
function ApplicationsPanel({ qc }: any) {
  const { data } = useQuery({
    queryKey: ["admin-applications"],
    queryFn: async () => (await supabase.from("msn_relay_applications").select("*").order("created_at",{ascending:false})).data ?? [],
  });
  const decide = async (id: string, status: "approved"|"rejected") => {
    const { error } = await supabase.from("msn_relay_applications").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(status === "approved" ? "Approuvée + contrat généré" : "Rejetée");
    qc.invalidateQueries({ queryKey: ["admin-applications"] });
  };
  const viewFile = async (path: string) => {
    const { data } = await supabase.storage.from("relay-applications").createSignedUrl(path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank"); else toast.error("Fichier introuvable");
  };
  return (
    <div className="space-y-3">
      {!data?.length && <p className="text-sm text-muted-foreground">Aucune candidature.</p>}
      {data?.map(a => (
        <div key={a.id} className="border rounded-xl p-4 flex flex-wrap items-start gap-3">
          <div className="flex-1 min-w-[240px]">
            <div className="font-bold">{a.space_name} <span className="text-xs text-muted-foreground">· {a.space_type}</span></div>
            <div className="text-sm text-muted-foreground">{a.city}, {a.neighborhood} · {a.phone}</div>
            <div className="text-xs text-muted-foreground mt-1">{a.address}</div>
            <div className="flex gap-2 mt-2">
              {a.id_photo_url && <Button size="sm" variant="outline" onClick={() => viewFile(a.id_photo_url!)}><Eye className="size-3 mr-1" />ID</Button>}
              {a.space_photo_url && <Button size="sm" variant="outline" onClick={() => viewFile(a.space_photo_url!)}><Eye className="size-3 mr-1" />Espace</Button>}
            </div>
          </div>
          <Badge>{a.status}</Badge>
          {a.status === "pending" && (
            <div className="flex gap-2">
              <Button size="sm" className="bg-success text-success-foreground" onClick={() => decide(a.id,"approved")}>Approuver</Button>
              <Button size="sm" variant="destructive" onClick={() => decide(a.id,"rejected")}>Rejeter</Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ============= DELIVERIES =============
function DeliveriesPanel() {
  const [q, setQ] = useState(""); const [from, setFrom] = useState(""); const [to, setTo] = useState(""); const [st, setSt] = useState("all");
  const { data } = useQuery({
    queryKey: ["admin-deliveries"],
    queryFn: async () => (await supabase.from("msn_deliveries").select("*, msn_relay_points(name,city), profiles!msn_deliveries_user_id_fkey(full_name)").order("created_at",{ascending:false}).limit(500)).data ?? [],
  });
  const filtered = (data ?? []).filter((d: any) => {
    if (st !== "all" && d.status !== st) return false;
    if (from && new Date(d.created_at) < new Date(from)) return false;
    if (to) { const e = new Date(to); e.setDate(e.getDate()+1); if (new Date(d.created_at) >= e) return false; }
    if (q) { const n = q.toLowerCase(); if (!`${d.provider_name} ${d.order_code ?? ""} ${d.msn_relay_points?.name ?? ""} ${d.msn_relay_points?.city ?? ""}`.toLowerCase().includes(n)) return false; }
    return true;
  });
  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-4 gap-2">
        <Input placeholder="Recherche fournisseur, code, relais..." value={q} onChange={e=>setQ(e.target.value)} />
        <Input type="date" value={from} onChange={e=>setFrom(e.target.value)} />
        <Input type="date" value={to} onChange={e=>setTo(e.target.value)} />
        <Select value={st} onValueChange={setSt}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
          <SelectItem value="all">Tous statuts</SelectItem><SelectItem value="pending">En attente</SelectItem><SelectItem value="picked_up">Ramassé</SelectItem><SelectItem value="at_relay">Au relais</SelectItem><SelectItem value="delivered">Livré</SelectItem><SelectItem value="cancelled">Annulé</SelectItem>
        </SelectContent></Select>
      </div>
      <div className="text-xs text-muted-foreground">{filtered.length} livraisons · Total {filtered.reduce((s:number,d:any)=>s+Number(d.delivery_price||0),0).toLocaleString("fr-FR")} FCFA</div>
      {!filtered.length && <p className="text-sm text-muted-foreground">Aucune livraison.</p>}
      {filtered.map((d:any) => (
        <div key={d.id} className="border rounded-xl p-4 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[240px]">
            <div className="font-bold text-sm">{d.provider_name} {d.order_code && <span className="text-xs text-muted-foreground">· #{d.order_code}</span>}</div>
            <div className="text-xs text-muted-foreground">Client: {d.profiles?.full_name ?? d.user_id.slice(0,8)} · {d.msn_relay_points?.name ?? "Sans relais"} · {d.estimated_distance_km} km · {Number(d.delivery_price).toLocaleString("fr-FR")} FCFA</div>
          </div>
          <Badge>{d.status}</Badge>
          <span className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleDateString("fr-FR")}</span>
        </div>
      ))}
    </div>
  );
}

// ============= GLOBAL HISTORY =============
function GlobalHistoryPanel() {
  const [scope, setScope] = useState<"all"|"user"|"relay"|"franchise">("all");
  const [target, setTarget] = useState("");
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");

  const { data: deliveries } = useQuery({ queryKey:["adm-h-del"], queryFn: async () => (await supabase.from("msn_deliveries").select("*, msn_relay_points(name,city,owner_id), profiles!msn_deliveries_user_id_fkey(full_name)").order("created_at",{ascending:false}).limit(1000)).data ?? [] });
  const { data: recharges } = useQuery({ queryKey:["adm-h-rec"], queryFn: async () => (await supabase.from("msn_wallet_recharge_requests").select("*, profiles!msn_wallet_recharge_requests_user_id_fkey(full_name)").order("created_at",{ascending:false}).limit(1000)).data ?? [] });
  const { data: franchises } = useQuery({ queryKey:["adm-h-fr"], queryFn: async () => (await supabase.from("graine_franchise_contracts").select("*").order("created_at",{ascending:false})).data ?? [] });
  const { data: relays } = useQuery({ queryKey:["adm-h-relays"], queryFn: async () => (await supabase.from("msn_relay_points").select("id,name,owner_id,city")).data ?? [] });

  const inDate = (d:string) => {
    if (from && new Date(d) < new Date(from)) return false;
    if (to) { const e = new Date(to); e.setDate(e.getDate()+1); if (new Date(d) >= e) return false; }
    return true;
  };
  const matchTarget = (row: { user_id?: string; relay_id?: string|null; franchise_id?: string }) => {
    if (scope === "all" || !target) return true;
    if (scope === "user") return row.user_id === target;
    if (scope === "relay") return row.relay_id === target;
    if (scope === "franchise") return row.franchise_id === target;
    return true;
  };

  type R = { id:string; date:string; kind:string; title:string; sub:string; status:string; amount?:number; user_id?:string; relay_id?:string|null; franchise_id?:string };
  const rows: R[] = [];
  (deliveries ?? []).forEach((d:any) => rows.push({ id:`d-${d.id}`, date:d.created_at, kind:"Livraison", title:`${d.provider_name} → ${d.msn_relay_points?.name ?? "?"}`, sub:`Client: ${d.profiles?.full_name ?? d.user_id.slice(0,8)} · ${d.estimated_distance_km} km`, status:d.status, amount:Number(d.delivery_price||0), user_id:d.user_id, relay_id:d.relay_point_id }));
  (recharges ?? []).forEach((r:any) => rows.push({ id:`r-${r.id}`, date:r.created_at, kind:"Recharge", title:`${r.operator} · ${Number(r.amount).toLocaleString("fr-FR")} FCFA`, sub:`Client: ${r.profiles?.full_name ?? r.user_id.slice(0,8)} · TXN ${r.transaction_id}`, status:r.status, amount:Number(r.amount), user_id:r.user_id }));
  (franchises ?? []).forEach((f:any) => rows.push({ id:`f-${f.id}`, date:f.created_at, kind:"Franchise", title:`${f.shop_name} (${f.contract_number})`, sub:`${f.franchisee_name} · ${f.city}`, status:f.franchisee_signature ? "signé" : "non signé", user_id:f.user_id, franchise_id:f.id }));

  const filtered = rows.filter(r => inDate(r.date) && matchTarget(r)).sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime());

  const users = Array.from(new Map([...deliveries??[], ...recharges??[]].map((x:any)=>[x.user_id, x.profiles?.full_name ?? x.user_id.slice(0,8)])).entries());
  const franchiseOpts = (franchises ?? []).map((f:any)=>({id:f.id, name:`${f.shop_name} (${f.contract_number})`}));

  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-5 gap-2">
        <Select value={scope} onValueChange={(v:any)=>{ setScope(v); setTarget(""); }}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Tout</SelectItem><SelectItem value="user">Par utilisateur</SelectItem><SelectItem value="relay">Par relais</SelectItem><SelectItem value="franchise">Par franchise</SelectItem></SelectContent>
        </Select>
        {scope === "user" && (
          <Select value={target} onValueChange={setTarget}><SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger><SelectContent>{users.map(([id,name])=>(<SelectItem key={id} value={id}>{name}</SelectItem>))}</SelectContent></Select>
        )}
        {scope === "relay" && (
          <Select value={target} onValueChange={setTarget}><SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger><SelectContent>{(relays??[]).map((r:any)=>(<SelectItem key={r.id} value={r.id}>{r.name} — {r.city}</SelectItem>))}</SelectContent></Select>
        )}
        {scope === "franchise" && (
          <Select value={target} onValueChange={setTarget}><SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger><SelectContent>{franchiseOpts.map(f=>(<SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>))}</SelectContent></Select>
        )}
        <Input type="date" value={from} onChange={e=>setFrom(e.target.value)} />
        <Input type="date" value={to} onChange={e=>setTo(e.target.value)} />
      </div>
      <div className="text-xs text-muted-foreground">{filtered.length} entrées · Total {filtered.reduce((s,r)=>s+(r.amount||0),0).toLocaleString("fr-FR")} FCFA</div>
      <div className="divide-y border rounded-xl">
        {!filtered.length && <p className="text-sm text-muted-foreground p-4">Aucune entrée.</p>}
        {filtered.slice(0, 300).map(r => (
          <div key={r.id} className="p-3 flex flex-wrap items-center gap-3">
            <Badge variant="outline">{r.kind}</Badge>
            <div className="flex-1 min-w-[240px]">
              <div className="text-sm font-semibold">{r.title}</div>
              <div className="text-xs text-muted-foreground">{r.sub} · {new Date(r.date).toLocaleString("fr-FR")}</div>
            </div>
            <Badge>{r.status}</Badge>
            {r.amount != null && <span className="text-sm font-bold text-primary">{r.amount.toLocaleString("fr-FR")} FCFA</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============= RECHARGES =============
function RechargesPanel({ qc }: any) {
  const { data } = useQuery({
    queryKey: ["admin-recharges"],
    queryFn: async () => (await supabase.from("msn_wallet_recharge_requests").select("*").order("created_at",{ascending:false})).data ?? [],
  });
  const decide = async (id: string, status: "approved"|"rejected") => {
    const { error } = await supabase.from("msn_wallet_recharge_requests").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Mis à jour"); qc.invalidateQueries({ queryKey: ["admin-recharges"] });
  };
  return (
    <div className="space-y-3">
      {!data?.length && <p className="text-sm text-muted-foreground">Aucune recharge.</p>}
      {data?.map(r => (
        <div key={r.id} className="border rounded-xl p-4 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[240px]">
            <div className="font-bold">{Number(r.amount).toLocaleString("fr-FR")} FCFA · {r.operator}</div>
            <div className="text-sm text-muted-foreground">TXN: {r.transaction_id} · {r.sender_phone}</div>
          </div>
          <Badge>{r.status}</Badge>
          {r.status === "pending" && (
            <div className="flex gap-2">
              <Button size="sm" className="bg-success text-success-foreground" onClick={() => decide(r.id,"approved")}>Valider</Button>
              <Button size="sm" variant="destructive" onClick={() => decide(r.id,"rejected")}>Rejeter</Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ============= PAYMENT SERVICES =============
function PaymentServicesPanel({ qc }: any) {
  const { data } = useQuery({
    queryKey: ["admin-payment-services"],
    queryFn: async () => (await supabase.from("msn_payment_services").select("*").order("sort_order")).data ?? [],
  });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload: any = {
      kind: f.get("kind"), label: String(f.get("label") || "").trim(),
      identifier: String(f.get("identifier") || "").trim(),
      instructions: String(f.get("instructions") || "").trim() || null,
      link_url: String(f.get("link_url") || "").trim() || null,
      sort_order: Number(f.get("sort_order") || 0),
      is_active: f.get("is_active") === "on",
    };
    const { error } = editing
      ? await supabase.from("msn_payment_services").update(payload).eq("id", editing.id)
      : await supabase.from("msn_payment_services").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Enregistré");
    setOpen(false); setEditing(null);
    qc.invalidateQueries({ queryKey: ["admin-payment-services"] });
    qc.invalidateQueries({ queryKey: ["payment-services"] });
  };
  const del = async (id: string) => {
    if (!confirm("Supprimer ce service ?")) return;
    const { error } = await supabase.from("msn_payment_services").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Supprimé"); qc.invalidateQueries({ queryKey: ["admin-payment-services"] });
  };

  return (
    <div>
      <div className="flex justify-between mb-4">
        <p className="text-sm text-muted-foreground">Mobile money, lien de paiement, adresse crypto.</p>
        <Button size="sm" className="bg-gradient-primary" onClick={() => { setEditing(null); setOpen(true); }}><Plus className="size-3 mr-1" />Ajouter</Button>
      </div>
      <div className="space-y-2">
        {data?.map(s => (
          <div key={s.id} className="border rounded-xl p-4 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[240px]">
              <div className="font-bold">{s.label} <span className="text-xs text-muted-foreground">· {s.kind}</span> {!s.is_active && <Badge className="ml-2">Inactif</Badge>}</div>
              <div className="text-xs text-muted-foreground break-all">{s.identifier}</div>
            </div>
            <Button size="sm" variant="outline" onClick={() => { setEditing(s); setOpen(true); }}>Modifier</Button>
            <Button size="sm" variant="ghost" onClick={() => del(s.id)}><Trash2 className="size-3" /></Button>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Modifier" : "Nouveau"} service de paiement</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div>
              <Label>Type</Label>
              <Select name="kind" defaultValue={editing?.kind || "mobile_money"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  <SelectItem value="payment_link">Lien de paiement</SelectItem>
                  <SelectItem value="crypto">Cryptomonnaie</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Libellé</Label><Input name="label" required defaultValue={editing?.label} /></div>
            <div><Label>Identifiant (numéro / adresse)</Label><Input name="identifier" required defaultValue={editing?.identifier} placeholder="+225..., bc1q..., URL" /></div>
            <div><Label>Lien externe (optionnel)</Label><Input name="link_url" type="url" defaultValue={editing?.link_url} placeholder="https://..." /></div>
            <div><Label>Instructions</Label><Textarea name="instructions" defaultValue={editing?.instructions} rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Ordre</Label><Input name="sort_order" type="number" defaultValue={editing?.sort_order || 0} /></div>
              <label className="flex items-end gap-2 pb-2"><input type="checkbox" name="is_active" defaultChecked={editing?.is_active ?? true} /> Actif</label>
            </div>
            <DialogFooter><Button type="submit" className="bg-gradient-primary">Enregistrer</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============= PRODUCTS =============
function ProductsPanel({ qc }: any) {
  const { data } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => (await supabase.from("graine_products").select("*").order("created_at",{ascending:false})).data ?? [],
  });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);

  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    let image_url = editing?.image_url ?? null;
    if (file) {
      const compressed = await compressImage(file);
      const path = `${Date.now()}-${compressed.name}`;
      const { error: upErr } = await supabase.storage.from("graine-products").upload(path, compressed, { upsert: true });
      if (upErr) return toast.error(upErr.message);
      image_url = supabase.storage.from("graine-products").getPublicUrl(path).data.publicUrl;
    }
    const payload: any = {
      name: String(f.get("name") || "").trim(),
      description: String(f.get("description") || "").trim() || null,
      price: Number(f.get("price") || 0),
      quantity: Number(f.get("quantity") || 0),
      category: String(f.get("category") || "").trim() || null,
      is_active: f.get("is_active") === "on",
      image_url,
    };
    const { error } = editing
      ? await supabase.from("graine_products").update(payload).eq("id", editing.id)
      : await supabase.from("graine_products").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Enregistré");
    setOpen(false); setEditing(null); setFile(null);
    qc.invalidateQueries({ queryKey: ["admin-products"] });
    qc.invalidateQueries({ queryKey: ["graine-products"] });
  };
  const del = async (id: string) => {
    if (!confirm("Supprimer ce produit ?")) return;
    const { error } = await supabase.from("graine_products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Supprimé"); qc.invalidateQueries({ queryKey: ["admin-products"] });
  };

  return (
    <div>
      <div className="flex justify-between mb-4">
        <p className="text-sm text-muted-foreground">Catalogue La Graine — produits proposables aux franchisés.</p>
        <Button size="sm" className="bg-gradient-primary" onClick={() => { setEditing(null); setFile(null); setOpen(true); }}><Plus className="size-3 mr-1" />Ajouter</Button>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {data?.map(p => (
          <div key={p.id} className="border rounded-xl overflow-hidden">
            {p.image_url ? <img src={p.image_url} alt={p.name} className="aspect-video w-full object-cover" /> : <div className="aspect-video bg-accent grid place-items-center"><Sprout className="size-8 text-bronze" /></div>}
            <div className="p-3">
              <div className="font-bold text-sm">{p.name}</div>
              <div className="text-xs text-muted-foreground">{Number(p.price).toLocaleString("fr-FR")} F · Stock {p.quantity}</div>
              <div className="flex gap-2 mt-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => { setEditing(p); setFile(null); setOpen(true); }}>Modifier</Button>
                <Button size="sm" variant="ghost" onClick={() => del(p.id)}><Trash2 className="size-3" /></Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Modifier" : "Nouveau"} produit Graine</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div><Label>Nom</Label><Input name="name" required defaultValue={editing?.name} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Prix (FCFA)</Label><Input name="price" type="number" min={0} required defaultValue={editing?.price || 0} /></div>
              <div><Label>Quantité</Label><Input name="quantity" type="number" min={0} required defaultValue={editing?.quantity || 0} /></div>
            </div>
            <div><Label>Catégorie</Label><Input name="category" defaultValue={editing?.category} /></div>
            <div><Label>Description</Label><Textarea name="description" defaultValue={editing?.description} rows={3} /></div>
            <div>
              <Label>Image</Label>
              <label className="flex items-center gap-2 p-3 border border-dashed rounded-lg cursor-pointer">
                <ImageIcon className="size-4" /><span className="text-sm flex-1">{file?.name || (editing?.image_url ? "Garder image actuelle" : "Choisir")}</span>
                <input type="file" accept="image/*" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
              </label>
            </div>
            <label className="flex items-center gap-2"><input type="checkbox" name="is_active" defaultChecked={editing?.is_active ?? true} /> Actif</label>
            <DialogFooter><Button type="submit" className="bg-gradient-primary">Enregistrer</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============= FRANCHISES =============
function FranchisesPanel({ qc }: any) {
  const { data } = useQuery({
    queryKey: ["admin-franchises"],
    queryFn: async () => (await supabase.from("graine_franchise_applications").select("*").order("created_at",{ascending:false})).data ?? [],
  });
  const { data: contracts } = useQuery({
    queryKey: ["admin-franchise-contracts"],
    queryFn: async () => (await supabase.from("graine_franchise_contracts").select("*").order("created_at",{ascending:false})).data ?? [],
  });
  const { data: users } = useQuery({
    queryKey: ["admin-users-select"],
    queryFn: async () => (await supabase.from("profiles").select("id, full_name, phone").order("created_at",{ascending:false}).limit(500)).data ?? [],
  });
  const [open, setOpen] = useState(false);
  const [pickedUser, setPickedUser] = useState<string>("");
  const decide = async (id: string, status: "approved"|"rejected") => {
    const { error } = await supabase.from("graine_franchise_applications").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(status === "approved" ? "Approuvée + contrat franchise généré" : "Rejetée");
    qc.invalidateQueries({ queryKey: ["admin-franchises"] });
    qc.invalidateQueries({ queryKey: ["admin-franchise-contracts"] });
  };
  const create = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!pickedUser) return toast.error("Sélectionnez un utilisateur");
    const f = new FormData(e.currentTarget);
    const u = users?.find((x: any) => x.id === pickedUser);
    const payload: any = {
      user_id: pickedUser,
      application_id: pickedUser, // pas d'application — on réutilise l'ID utilisateur (champ requis)
      franchisee_name: u?.full_name || "Franchisé",
      shop_name: String(f.get("shop_name") || "").trim(),
      city: String(f.get("city") || "").trim(),
      neighborhood: String(f.get("neighborhood") || "").trim(),
      address: String(f.get("address") || "").trim(),
      resupply_quota_pct: Number(f.get("resupply_quota_pct") || 80),
    };
    if (!payload.shop_name || !payload.city || !payload.neighborhood || !payload.address) return toast.error("Tous les champs sont requis");
    const { error } = await supabase.from("graine_franchise_contracts").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Franchise créée — contrat généré");
    setOpen(false); setPickedUser("");
    qc.invalidateQueries({ queryKey: ["admin-franchise-contracts"] });
  };
  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <p className="text-sm text-muted-foreground">Candidatures + franchises créées directement par l'administrateur.</p>
        <Button size="sm" className="bg-gradient-primary" onClick={() => setOpen(true)}><Plus className="size-3 mr-1" />Créer une franchise</Button>
      </div>

      <div>
        <h3 className="font-bold text-sm mb-2">Candidatures</h3>
        {!data?.length && <p className="text-sm text-muted-foreground">Aucune candidature.</p>}
        <div className="space-y-2">
          {data?.map(a => (
            <div key={a.id} className="border rounded-xl p-4 flex flex-wrap items-start gap-3">
              <div className="flex-1 min-w-[240px]">
                <div className="font-bold">{a.shop_name} <span className="text-xs text-muted-foreground">· {a.shop_type}</span></div>
                <div className="text-sm text-muted-foreground">{a.city}, {a.neighborhood} · {a.phone}</div>
                <div className="text-xs text-muted-foreground">{a.selected_product_ids?.length || 0} produit(s) sélectionné(s)</div>
                {a.description && <p className="text-sm mt-1 italic line-clamp-2">"{a.description}"</p>}
              </div>
              <Badge>{a.status}</Badge>
              {a.status === "pending" && (
                <div className="flex gap-2">
                  <Button size="sm" className="bg-success text-success-foreground" onClick={() => decide(a.id,"approved")}>Approuver</Button>
                  <Button size="sm" variant="destructive" onClick={() => decide(a.id,"rejected")}>Rejeter</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-bold text-sm mb-2">Contrats actifs</h3>
        {!contracts?.length && <p className="text-sm text-muted-foreground">Aucun contrat.</p>}
        <div className="space-y-2">
          {contracts?.map(c => (
            <div key={c.id} className="border rounded-xl p-3 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[240px]">
                <div className="font-bold text-sm">{c.shop_name} <span className="text-xs text-muted-foreground">· {c.contract_number}</span></div>
                <div className="text-xs text-muted-foreground">{c.franchisee_name} · {c.city}, {c.neighborhood} · {c.resupply_quota_pct}%</div>
              </div>
              {c.franchisee_signed_at ? <Badge className="bg-success/20 text-success border-success/40 border">Signé</Badge> : <Badge>En attente signature</Badge>}
            </div>
          ))}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Créer une franchise La Graine</DialogTitle></DialogHeader>
          <form onSubmit={create} className="space-y-3">
            <div>
              <Label>Franchisé (utilisateur)</Label>
              <Select value={pickedUser} onValueChange={setPickedUser}>
                <SelectTrigger><SelectValue placeholder="Choisir un utilisateur" /></SelectTrigger>
                <SelectContent>
                  {users?.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>{u.full_name || "Sans nom"} {u.phone ? `· ${u.phone}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Nom de la boutique</Label><Input name="shop_name" required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Ville</Label><Input name="city" required /></div>
              <div><Label>Quartier</Label><Input name="neighborhood" required /></div>
            </div>
            <div><Label>Adresse</Label><Input name="address" required /></div>
            <div><Label>Quota d'approvisionnement (%)</Label><Input name="resupply_quota_pct" type="number" min={0} max={100} defaultValue={80} /></div>
            <DialogFooter><Button type="submit" className="bg-gradient-primary">Créer la franchise</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============= BROADCAST =============
function BroadcastPanel({ userId, qc }: any) {
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { data: history } = useQuery({
    queryKey: ["admin-broadcasts"],
    queryFn: async () => (await supabase.from("msn_broadcasts").select("*").order("created_at",{ascending:false}).limit(20)).data ?? [],
  });
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const title = String(f.get("title") || "").trim();
    const body = String(f.get("body") || "").trim();
    const link_url = String(f.get("link_url") || "").trim() || null;
    const link_label = String(f.get("link_label") || "").trim() || null;
    if (title.length < 2 || body.length < 2) return toast.error("Titre et message requis");
    setSubmitting(true);
    let image_url: string | null = null;
    if (file) {
      const compressed = await compressImage(file);
      const path = `${userId}/${Date.now()}-${compressed.name}`;
      const { error: upErr } = await supabase.storage.from("broadcast-media").upload(path, compressed);
      if (upErr) { toast.error(upErr.message); setSubmitting(false); return; }
      image_url = supabase.storage.from("broadcast-media").getPublicUrl(path).data.publicUrl;
    }
    const { error } = await supabase.from("msn_broadcasts").insert({ author_id: userId, title, body, image_url, link_url, link_label });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Diffusé à tous"); (e.target as HTMLFormElement).reset(); setFile(null);
    qc.invalidateQueries({ queryKey: ["admin-broadcasts"] });
    qc.invalidateQueries({ queryKey: ["broadcasts"] });
  };
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <form onSubmit={submit} className="space-y-3">
        <div><Label>Titre</Label><Input name="title" required maxLength={100} /></div>
        <div><Label>Message</Label><Textarea name="body" required maxLength={2000} rows={6} /></div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label>Lien</Label><Input name="link_url" type="url" placeholder="https://..." /></div>
          <div><Label>Libellé du lien</Label><Input name="link_label" maxLength={50} /></div>
        </div>
        <div>
          <Label>Image (optionnelle)</Label>
          <label className="flex items-center gap-3 p-3 border border-dashed rounded-xl cursor-pointer">
            <ImageIcon className="size-4" /><span className="text-sm flex-1">{file?.name || "Choisir une image"}</span>
            <input type="file" accept="image/*" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
          </label>
        </div>
        <Button disabled={submitting} className="w-full bg-gradient-primary h-11"><Send className="size-4" />{submitting ? "..." : "Diffuser à tous"}</Button>
      </form>
      <div>
        <h3 className="font-bold mb-3">Historique</h3>
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {history?.map(m => (
            <div key={m.id} className="border rounded-lg p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold text-sm">{m.title}</div>
                <div className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleDateString("fr-FR")}</div>
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{m.body}</p>
              {m.link_url && <a href={m.link_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary inline-flex items-center gap-1 mt-1"><ExternalLink className="size-3" />{m.link_label || "Lien"}</a>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
