import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Shield, Send, CheckCircle2, XCircle, Image as ImageIcon, ExternalLink, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/admin")({ component: AdminPage });

function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"pricing" | "applications" | "recharges" | "broadcast">("pricing");

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
            <p className="text-muted-foreground text-sm">Pilotage MSN Delivery — Celvus Parfait</p>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-soft overflow-hidden">
          <div className="flex border-b border-border overflow-x-auto">
            {[
              { k: "pricing", l: "Tarifs & conditions" },
              { k: "applications", l: "Candidatures relais" },
              { k: "recharges", l: "Recharges" },
              { k: "broadcast", l: "Diffusion canal" },
            ].map(t => (
              <button key={t.k} onClick={() => setTab(t.k as any)} className={`px-6 py-4 text-sm font-semibold whitespace-nowrap ${tab===t.k?"text-primary border-b-2 border-primary":"text-muted-foreground"}`}>{t.l}</button>
            ))}
          </div>

          <div className="p-6">
            {tab === "pricing" && <PricingPanel qc={qc} />}
            {tab === "applications" && <ApplicationsPanel qc={qc} />}
            {tab === "recharges" && <RechargesPanel qc={qc} />}
            {tab === "broadcast" && <BroadcastPanel userId={user.id} qc={qc} />}
          </div>
        </div>
      </main>
    </div>
  );
}

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
      base_price: Number(form.base_price),
      price_per_km: Number(form.price_per_km),
      weekend_multiplier: Number(form.weekend_multiplier),
      rain_multiplier: Number(form.rain_multiplier),
      holiday_multiplier: Number(form.holiday_multiplier),
      strike_multiplier: Number(form.strike_multiplier),
      rain_active: !!form.rain_active,
      holiday_active: !!form.holiday_active,
      strike_active: !!form.strike_active,
    }).eq("id", 1);
    if (error) { toast.error(error.message); return; }
    toast.success("Tarifs mis à jour");
    qc.invalidateQueries({ queryKey: ["pricing"] });
    qc.invalidateQueries({ queryKey: ["admin-pricing"] });
  };

  const Num = ({ k, label }: any) => (
    <div><Label>{label}</Label><Input type="number" step="0.01" value={form[k] ?? ""} onChange={e => setForm({ ...form, [k]: e.target.value })} /></div>
  );

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
        <h3 className="font-bold mb-3">Conditions actives maintenant</h3>
        <div className="space-y-3">
          {[
            { k: "rain_active", l: "Pluie en cours" },
            { k: "holiday_active", l: "Jour férié aujourd'hui" },
            { k: "strike_active", l: "Grève en cours" },
          ].map(s => (
            <label key={s.k} className="flex items-center justify-between p-3 rounded-lg border border-border">
              <span className="text-sm">{s.l}</span>
              <Switch checked={!!form[s.k]} onCheckedChange={(v) => setForm({ ...form, [s.k]: v })} />
            </label>
          ))}
          <p className="text-xs text-muted-foreground">Le week-end est détecté automatiquement par le système.</p>
        </div>
      </div>
      <Button onClick={save} className="bg-gradient-primary">Enregistrer</Button>
    </div>
  );
}

function ApplicationsPanel({ qc }: any) {
  const { data } = useQuery({
    queryKey: ["admin-applications"],
    queryFn: async () => (await supabase.from("msn_relay_applications").select("*").order("created_at",{ascending:false})).data ?? [],
  });
  const decide = async (id: string, status: "approved"|"rejected") => {
    const { error } = await supabase.from("msn_relay_applications").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(status === "approved" ? "Candidature approuvée + contrat généré" : "Candidature rejetée");
    qc.invalidateQueries({ queryKey: ["admin-applications"] });
  };
  const viewFile = async (path: string) => {
    const { data } = await supabase.storage.from("relay-applications").createSignedUrl(path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    else toast.error("Fichier introuvable");
  };
  return (
    <div className="space-y-3">
      {!data?.length && <p className="text-muted-foreground text-sm">Aucune candidature.</p>}
      {data?.map(a => (
        <div key={a.id} className="border border-border rounded-xl p-4 flex flex-wrap items-start gap-3">
          <div className="flex-1 min-w-[240px]">
            <div className="font-bold">{a.space_name} <span className="text-xs text-muted-foreground">· {a.space_type}</span></div>
            <div className="text-sm text-muted-foreground">{a.city}, {a.neighborhood} · {a.phone}</div>
            <div className="text-xs text-muted-foreground mt-1">{a.address}</div>
            {a.description && <p className="text-sm mt-2 italic">"{a.description}"</p>}
            <div className="flex gap-2 mt-2">
              {a.id_photo_url && <Button size="sm" variant="outline" onClick={() => viewFile(a.id_photo_url)}><Eye className="size-3 mr-1" />Pièce ID</Button>}
              {a.space_photo_url && <Button size="sm" variant="outline" onClick={() => viewFile(a.space_photo_url)}><Eye className="size-3 mr-1" />Espace</Button>}
            </div>
          </div>
          <Badge className={a.status==="pending"?"bg-warning/20 border-warning/40 text-warning-foreground border":a.status==="approved"?"bg-success/20 border-success/40 border":"bg-destructive/20 border-destructive/40 border"}>{a.status}</Badge>
          {a.status === "pending" && (
            <div className="flex gap-2">
              <Button size="sm" className="bg-success text-success-foreground" onClick={() => decide(a.id,"approved")}><CheckCircle2 className="size-3 mr-1" />Approuver</Button>
              <Button size="sm" variant="destructive" onClick={() => decide(a.id,"rejected")}><XCircle className="size-3 mr-1" />Rejeter</Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function RechargesPanel({ qc }: any) {
  const { data } = useQuery({
    queryKey: ["admin-recharges"],
    queryFn: async () => (await supabase.from("msn_wallet_recharge_requests").select("*").order("created_at",{ascending:false})).data ?? [],
  });
  const decide = async (id: string, status: "approved"|"rejected") => {
    const { error } = await supabase.from("msn_wallet_recharge_requests").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Mis à jour");
    qc.invalidateQueries({ queryKey: ["admin-recharges"] });
  };
  return (
    <div className="space-y-3">
      {!data?.length && <p className="text-muted-foreground text-sm">Aucune recharge.</p>}
      {data?.map(r => (
        <div key={r.id} className="border border-border rounded-xl p-4 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[240px]">
            <div className="font-bold">{Number(r.amount).toLocaleString("fr-FR")} FCFA · {r.operator.toUpperCase()}</div>
            <div className="text-sm text-muted-foreground">TXN: {r.transaction_id} · {r.sender_phone}</div>
            <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("fr-FR")}</div>
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
    if (title.length < 2 || body.length < 2) { toast.error("Titre et message requis"); return; }
    setSubmitting(true);
    let image_url: string | null = null;
    if (file) {
      const path = `${userId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("broadcast-media").upload(path, file);
      if (upErr) { toast.error(upErr.message); setSubmitting(false); return; }
      const { data: pub } = supabase.storage.from("broadcast-media").getPublicUrl(path);
      image_url = pub.publicUrl;
    }
    const { error } = await supabase.from("msn_broadcasts").insert({ author_id: userId, title, body, image_url, link_url, link_label });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Message diffusé à tous les utilisateurs");
    (e.target as HTMLFormElement).reset(); setFile(null);
    qc.invalidateQueries({ queryKey: ["admin-broadcasts"] });
    qc.invalidateQueries({ queryKey: ["broadcasts"] });
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <form onSubmit={submit} className="space-y-3">
        <h3 className="font-bold mb-1">Nouveau message canal</h3>
        <div><Label>Titre</Label><Input name="title" required maxLength={100} /></div>
        <div><Label>Message</Label><Textarea name="body" required maxLength={2000} rows={6} /></div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label>Lien (Zoom, réunion...)</Label><Input name="link_url" type="url" placeholder="https://zoom.us/..." /></div>
          <div><Label>Libellé du lien</Label><Input name="link_label" maxLength={50} placeholder="Rejoindre la réunion" /></div>
        </div>
        <div>
          <Label>Image (optionnelle)</Label>
          <label className="flex items-center gap-3 p-3 border border-dashed border-border rounded-xl cursor-pointer hover:border-primary transition">
            <ImageIcon className="size-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{file?.name || "Choisir une image"}</span>
            <input type="file" accept="image/*" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
          </label>
        </div>
        <Button disabled={submitting} className="w-full bg-gradient-primary h-11"><Send className="size-4" />{submitting ? "Envoi..." : "Diffuser à tous"}</Button>
      </form>
      <div>
        <h3 className="font-bold mb-3">Historique</h3>
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {history?.map(m => (
            <div key={m.id} className="border border-border rounded-lg p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold text-sm">{m.title}</div>
                <div className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleDateString("fr-FR")}</div>
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{m.body}</p>
              {m.link_url && <a href={m.link_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary inline-flex items-center gap-1 mt-1"><ExternalLink className="size-3" />{m.link_label || "Lien"}</a>}
            </div>
          ))}
          {!history?.length && <p className="text-sm text-muted-foreground">Aucun message diffusé.</p>}
        </div>
      </div>
    </div>
  );
}
