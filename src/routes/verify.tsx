import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, Package, ScanLine, Check, MapPin, Phone, User, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/verify")({ component: VerifyPage });

const STATUS_NEXT: Record<string, { label: string; next: string }> = {
  pending: { label: "Marquer comme récupéré", next: "picked_up" },
  picked_up: { label: "Arrivé au relais", next: "at_relay" },
  at_relay: { label: "Marquer livré", next: "delivered" },
};

function VerifyPage() {
  const { user, loading, isAdmin, roles } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [delivery, setDelivery] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [note, setNote] = useState("");
  const [working, setWorking] = useState(false);

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth", replace: true }); }, [user, loading, navigate]);

  const canVerify = isAdmin || roles.includes("relay_owner") || roles.includes("driver");

  const search = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!code.trim()) return;
    setSearching(true);
    const c = code.trim().toUpperCase();
    const { data, error } = await supabase
      .from("msn_deliveries")
      .select("*, msn_relay_points(name, city, neighborhood, address, phone, owner_id), profiles!msn_deliveries_user_id_fkey(full_name, phone)")
      .eq("tracking_code", c)
      .maybeSingle();
    setSearching(false);
    if (error || !data) {
      toast.error("Aucun colis trouvé avec ce code");
      setDelivery(null);
      return;
    }
    setDelivery(data);
  };

  const { data: scans, refetch: refetchScans } = useQuery({
    queryKey: ["scans", delivery?.id],
    enabled: !!delivery?.id,
    queryFn: async () => (await supabase.from("msn_delivery_scans").select("*").eq("delivery_id", delivery.id).order("created_at",{ascending:false})).data ?? [],
  });

  const recordScan = async (action: string, statusUpdate?: string) => {
    if (!delivery || !user) return;
    setWorking(true);
    const role = isAdmin ? "admin" : roles.includes("relay_owner") ? "relay_owner" : "driver";
    const { error: scanErr } = await supabase.from("msn_delivery_scans").insert({
      delivery_id: delivery.id,
      scanned_by: user.id,
      scanner_role: role,
      action,
      note: note || null,
    });
    if (scanErr) { toast.error(scanErr.message); setWorking(false); return; }
    if (statusUpdate) {
      const updates: any = { status: statusUpdate };
      if (statusUpdate === "picked_up") updates.picked_up_at = new Date().toISOString();
      if (statusUpdate === "at_relay") updates.at_relay_at = new Date().toISOString();
      if (statusUpdate === "delivered") updates.delivered_at = new Date().toISOString();
      const { error: upErr } = await supabase.from("msn_deliveries").update(updates).eq("id", delivery.id);
      if (upErr) toast.error(upErr.message);
      else setDelivery({ ...delivery, ...updates });
    }
    setNote("");
    refetchScans();
    setWorking(false);
    toast.success("Scan enregistré");
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <SiteHeader />
      <main className="container mx-auto px-4 py-10 max-w-3xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="size-12 rounded-2xl bg-gradient-primary grid place-items-center shadow-glow">
            <ScanLine className="size-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold">Vérification de colis</h1>
            <p className="text-muted-foreground text-sm">Saisissez le code unique du colis pour voir ses détails.</p>
          </div>
        </div>

        <form onSubmit={search} className="flex gap-2 mt-6 mb-8">
          <Input
            placeholder="MSN-251205-AB12CD"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="font-mono text-lg h-12"
          />
          <Button type="submit" disabled={searching} size="lg" className="bg-gradient-primary">
            <Search className="size-4 mr-1" />{searching ? "..." : "Vérifier"}
          </Button>
        </form>

        {delivery && (
          <div className="bg-card border border-border rounded-2xl shadow-soft overflow-hidden">
            <div className="p-6 bg-gradient-to-br from-primary/10 to-accent/40 border-b border-border">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="font-mono text-xl font-bold text-primary">{delivery.tracking_code}</div>
                <Badge className="capitalize">{delivery.status.replace("_"," ")}</Badge>
              </div>
              <div className="text-2xl font-bold mt-2">{delivery.provider_name}</div>
              {delivery.order_code && <div className="text-sm text-muted-foreground">Référence commande : {delivery.order_code}</div>}
            </div>

            <div className="p-6 grid sm:grid-cols-2 gap-4 text-sm">
              <Info icon={User} label="Client" value={(delivery as any).profiles?.full_name || "—"} />
              <Info icon={Phone} label="Téléphone client" value={(delivery as any).profiles?.phone || "—"} />
              <Info icon={MapPin} label="Lieu de retrait" value={delivery.provider_location || "—"} />
              <Info icon={Phone} label="Téléphone fournisseur" value={delivery.provider_phone || "—"} />
              <Info icon={Package} label="Point relais" value={(delivery as any).msn_relay_points ? `${(delivery as any).msn_relay_points.name} — ${(delivery as any).msn_relay_points.city}, ${(delivery as any).msn_relay_points.neighborhood}` : "—"} />
              <Info icon={Clock} label="Créée le" value={new Date(delivery.created_at).toLocaleString("fr-FR")} />
              <Info icon={MapPin} label="Distance" value={`${delivery.estimated_distance_km ?? "—"} km`} />
              <Info icon={Check} label="Paiement" value={delivery.payment_mode === "msn_delivery" ? "Portefeuille MSN" : "Direct fournisseur"} />
            </div>

            {delivery.notes && <div className="px-6 pb-4 text-sm"><b>Notes :</b> {delivery.notes}</div>}
            <div className="px-6 pb-4 text-sm"><b>Prix livraison :</b> <span className="text-primary font-bold">{Number(delivery.delivery_price).toLocaleString("fr-FR")} FCFA</span></div>

            {canVerify && (
              <div className="p-6 border-t border-border bg-muted/20 space-y-3">
                <Label>Note de vérification (optionnel)</Label>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Ex: Colis vérifié et conforme, en bon état..." />
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" disabled={working} onClick={() => recordScan("verify")}>
                    <ScanLine className="size-4 mr-1" />Scanner / Vérifier
                  </Button>
                  {STATUS_NEXT[delivery.status] && (
                    <Button disabled={working} className="bg-gradient-primary" onClick={() => recordScan(STATUS_NEXT[delivery.status].next, STATUS_NEXT[delivery.status].next)}>
                      <CheckCircle2 className="size-4 mr-1" />{STATUS_NEXT[delivery.status].label}
                    </Button>
                  )}
                </div>
              </div>
            )}

            <div className="p-6 border-t border-border">
              <h3 className="font-bold mb-3 flex items-center gap-2"><Clock className="size-4" />Historique des scans</h3>
              {!scans?.length ? (
                <p className="text-sm text-muted-foreground">Aucun scan pour ce colis.</p>
              ) : (
                <div className="space-y-2">
                  {scans.map(s => (
                    <div key={s.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 text-sm">
                      <div className="size-8 rounded-lg bg-primary/10 text-primary grid place-items-center"><ScanLine className="size-4" /></div>
                      <div className="flex-1">
                        <div className="font-semibold capitalize">{s.action.replace("_"," ")} · <span className="text-xs text-muted-foreground">{s.scanner_role}</span></div>
                        {s.note && <div className="text-muted-foreground">{s.note}</div>}
                        <div className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString("fr-FR")}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {!canVerify && user && (
          <p className="text-sm text-muted-foreground mt-6 p-4 rounded-xl bg-muted/40 border border-border">
            Vous pouvez consulter le code mais seuls les points relais, franchisés et administrateurs peuvent enregistrer une vérification.
          </p>
        )}
      </main>
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="size-4 text-muted-foreground mt-0.5" />
      <div>
        <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
        <div className="font-medium">{value}</div>
      </div>
    </div>
  );
}
