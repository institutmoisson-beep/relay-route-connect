import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { Upload, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { geocode, getBrowserLocation, haversineKm, isWeekend, type LatLng } from "@/lib/geo";

export const Route = createFileRoute("/order")({ component: OrderPage });

const schema = z.object({
  provider_name: z.string().min(2).max(100),
  provider_phone: z.string().max(20).optional(),
  provider_location: z.string().min(2).max(200),
  order_code: z.string().max(200).optional(),
  relay_point_id: z.string().uuid("Choisissez un point relais"),
  payment_mode: z.enum(["msn_delivery", "direct_provider"]),
  notes: z.string().max(500).optional(),
});

function OrderPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [distance, setDistance] = useState<number | null>(null);
  const [computing, setComputing] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [providerCoord, setProviderCoord] = useState<LatLng | null>(null);
  const [relayId, setRelayId] = useState<string>("");
  const [providerLoc, setProviderLoc] = useState("");

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth", replace: true }); }, [user, loading, navigate]);

  const { data: pricing } = useQuery({
    queryKey: ["pricing"],
    queryFn: async () => (await supabase.from("msn_pricing_config").select("*").eq("id", 1).maybeSingle()).data,
  });
  const { data: relays } = useQuery({
    queryKey: ["relays-geo"],
    queryFn: async () => (await supabase.from("msn_relay_points").select("id,name,city,neighborhood,latitude,longitude").eq("status","active").order("city")).data ?? [],
  });

  const selectedRelay = useMemo(() => relays?.find(r => r.id === relayId) ?? null, [relays, relayId]);

  const computeDistance = async (provider: LatLng) => {
    if (!selectedRelay?.latitude || !selectedRelay?.longitude) {
      // Geocode from city + neighborhood as fallback
      const q = `${selectedRelay?.neighborhood}, ${selectedRelay?.city}, Côte d'Ivoire`;
      const relayCoord = await geocode(q);
      if (!relayCoord) { toast.error("Impossible de localiser le relais"); return; }
      const km = haversineKm(provider, relayCoord);
      setDistance(Math.max(0.5, Math.round(km * 10) / 10));
    } else {
      const km = haversineKm(provider, { lat: Number(selectedRelay.latitude), lon: Number(selectedRelay.longitude) });
      setDistance(Math.max(0.5, Math.round(km * 10) / 10));
    }
  };

  const useMyLocation = async () => {
    if (!relayId) { toast.error("Choisissez un relais d'abord"); return; }
    setComputing(true);
    try {
      const coord = await getBrowserLocation();
      setProviderCoord(coord);
      await computeDistance(coord);
      toast.success("Position détectée");
    } catch (e: any) {
      toast.error(e?.message || "Géolocalisation refusée");
    } finally { setComputing(false); }
  };

  const geocodeProvider = async () => {
    if (!providerLoc || !relayId) { toast.error("Renseignez la localisation et le relais"); return; }
    setComputing(true);
    const coord = await geocode(`${providerLoc}, Côte d'Ivoire`);
    if (!coord) { toast.error("Adresse introuvable"); setComputing(false); return; }
    setProviderCoord(coord);
    await computeDistance(coord);
    setComputing(false);
  };

  const price = useMemo(() => {
    if (!pricing || distance == null) return 0;
    let p = Number(pricing.base_price) + Number(pricing.price_per_km) * distance;
    if (pricing.rain_active) p *= Number(pricing.rain_multiplier);
    if (pricing.holiday_active) p *= Number(pricing.holiday_multiplier);
    if (pricing.strike_active) p *= Number(pricing.strike_multiplier);
    if (isWeekend()) p *= Number(pricing.weekend_multiplier);
    return Math.round(p);
  }, [pricing, distance]);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    if (distance == null) { toast.error("Calculez d'abord la distance"); return; }
    const form = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      provider_name: form.get("provider_name"),
      provider_phone: form.get("provider_phone") || undefined,
      provider_location: providerLoc,
      order_code: form.get("order_code") || undefined,
      relay_point_id: relayId,
      payment_mode: form.get("payment_mode"),
      notes: form.get("notes") || undefined,
    });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setSubmitting(true);
    let order_image_url: string | null = null;
    if (imageFile) {
      const path = `${user.id}/${Date.now()}-${imageFile.name}`;
      const { error: upErr } = await supabase.storage.from("order-images").upload(path, imageFile);
      if (upErr) { toast.error(upErr.message); setSubmitting(false); return; }
      order_image_url = path;
    }
    const circ: Record<string, boolean> = { weekend: isWeekend() };
    if (pricing?.rain_active) circ.rain = true;
    if (pricing?.holiday_active) circ.holiday = true;
    if (pricing?.strike_active) circ.strike = true;

    const { error } = await supabase.from("msn_deliveries").insert({
      user_id: user.id,
      provider_name: parsed.data.provider_name,
      provider_phone: parsed.data.provider_phone ?? null,
      provider_location: parsed.data.provider_location,
      order_code: parsed.data.order_code ?? null,
      order_image_url,
      relay_point_id: parsed.data.relay_point_id,
      payment_mode: parsed.data.payment_mode,
      estimated_distance_km: distance,
      delivery_price: price,
      circumstances: circ,
      notes: parsed.data.notes ?? null,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Commande créée !");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <SiteHeader />
      <main className="container mx-auto px-4 py-10 max-w-3xl">
        <h1 className="text-3xl font-display font-bold mb-2">Nouvelle commande</h1>
        <p className="text-muted-foreground mb-8">Distance et tarif calculés automatiquement via OpenStreetMap.</p>

        <form onSubmit={submit} className="space-y-6 bg-card border border-border rounded-2xl p-6 shadow-soft">
          <section className="space-y-4">
            <h2 className="font-bold text-lg">Fournisseur</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label>Nom du fournisseur *</Label><Input name="provider_name" required maxLength={100} placeholder="Ex: Restaurant Le Bonheur" /></div>
              <div><Label>Téléphone fournisseur</Label><Input name="provider_phone" maxLength={20} /></div>
            </div>
            <div>
              <Label>Localisation (ville, quartier) *</Label>
              <div className="flex gap-2">
                <Input value={providerLoc} onChange={e => setProviderLoc(e.target.value)} maxLength={200} placeholder="Cocody Riviera 2, Abidjan" required />
                <Button type="button" variant="outline" onClick={geocodeProvider} disabled={computing}>Localiser</Button>
              </div>
              <button type="button" onClick={useMyLocation} disabled={computing} className="text-sm text-primary inline-flex items-center gap-1 mt-2 hover:underline">
                {computing ? <Loader2 className="size-3 animate-spin" /> : <MapPin className="size-3" />} Utiliser ma position
              </button>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="font-bold text-lg">Commande</h2>
            <div><Label>Code / Référence de commande</Label><Input name="order_code" maxLength={200} /></div>
            <div>
              <Label>Capture / image du reçu</Label>
              <label className="flex items-center gap-3 p-4 border border-dashed border-border rounded-xl cursor-pointer hover:border-primary transition">
                <Upload className="size-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{imageFile?.name || "Cliquez pour télécharger une image"}</span>
                <input type="file" accept="image/*" className="hidden" onChange={e => setImageFile(e.target.files?.[0] ?? null)} />
              </label>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="font-bold text-lg">Point relais & paiement</h2>
            <div>
              <Label>Point relais de livraison *</Label>
              <Select value={relayId} onValueChange={(v) => { setRelayId(v); if (providerCoord) computeDistance(providerCoord); }}>
                <SelectTrigger><SelectValue placeholder="Choisir un relais" /></SelectTrigger>
                <SelectContent>
                  {relays?.map(r => <SelectItem key={r.id} value={r.id}>{r.name} — {r.city}, {r.neighborhood}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Mode de paiement de l'article *</Label>
              <Select name="payment_mode" defaultValue="msn_delivery">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="msn_delivery">Via MSN Delivery (portefeuille)</SelectItem>
                  <SelectItem value="direct_provider">Direct chez le fournisseur</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </section>

          <div><Label>Notes</Label><Textarea name="notes" maxLength={500} placeholder="Informations supplémentaires..." /></div>

          <div className="rounded-xl bg-accent/40 border border-border p-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Distance calculée</span>
              <span className="font-bold">{distance != null ? `${distance} km` : "—"}</span>
            </div>
            <div className="flex justify-between items-center mt-2 text-sm">
              <span className="text-muted-foreground">Conditions appliquées</span>
              <span className="text-xs">
                {[
                  isWeekend() && "Week-end",
                  pricing?.rain_active && "Pluie",
                  pricing?.holiday_active && "Jour férié",
                  pricing?.strike_active && "Grève",
                ].filter(Boolean).join(" · ") || "Normales"}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Prix de livraison</div>
              <div className="text-3xl font-bold text-gradient">{price.toLocaleString("fr-FR")} FCFA</div>
            </div>
            <Button disabled={submitting || distance == null} type="submit" size="lg" className="bg-gradient-primary shadow-glow h-12 px-6">
              {submitting ? "..." : "Valider la commande"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
