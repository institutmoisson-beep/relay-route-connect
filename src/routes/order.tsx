import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/order")({ component: OrderPage });

const schema = z.object({
  provider_name: z.string().min(2).max(100),
  provider_phone: z.string().max(20).optional(),
  provider_location: z.string().max(200).optional(),
  order_code: z.string().max(200).optional(),
  relay_point_id: z.string().uuid("Choisissez un point relais"),
  distance: z.number().min(0.5).max(100),
  payment_mode: z.enum(["msn_delivery", "direct_provider"]),
  notes: z.string().max(500).optional(),
});

function OrderPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [distance, setDistance] = useState(5);
  const [circ, setCirc] = useState({ rain: false, holiday: false, strike: false, weekend: false });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth", replace: true }); }, [user, loading, navigate]);

  const { data: pricing } = useQuery({
    queryKey: ["pricing"],
    queryFn: async () => (await supabase.from("msn_pricing_config").select("*").eq("id", 1).maybeSingle()).data,
  });
  const { data: relays } = useQuery({
    queryKey: ["relays"],
    queryFn: async () => (await supabase.from("msn_relay_points").select("id,name,city,neighborhood").eq("status","active").order("city")).data ?? [],
  });

  const price = useMemo(() => {
    if (!pricing) return 0;
    let p = Number(pricing.base_price) + Number(pricing.price_per_km) * distance;
    if (circ.rain) p *= Number(pricing.rain_multiplier);
    if (circ.holiday) p *= Number(pricing.holiday_multiplier);
    if (circ.strike) p *= Number(pricing.strike_multiplier);
    if (circ.weekend) p *= Number(pricing.weekend_multiplier);
    return Math.round(p);
  }, [pricing, distance, circ]);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const form = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      provider_name: form.get("provider_name"),
      provider_phone: form.get("provider_phone") || undefined,
      provider_location: form.get("provider_location") || undefined,
      order_code: form.get("order_code") || undefined,
      relay_point_id: form.get("relay_point_id"),
      distance,
      payment_mode: form.get("payment_mode"),
      notes: form.get("notes") || undefined,
    });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setSubmitting(true);
    let order_image_url: string | null = null;
    if (imageFile) {
      // For now, store as data URL placeholder — storage bucket setup can come later
      order_image_url = await new Promise<string>((res) => {
        const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(imageFile);
      });
    }
    const { error } = await supabase.from("msn_deliveries").insert({
      user_id: user.id,
      provider_name: parsed.data.provider_name,
      provider_phone: parsed.data.provider_phone ?? null,
      provider_location: parsed.data.provider_location ?? null,
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
        <p className="text-muted-foreground mb-8">Renseignez votre commande, choisissez un point relais et payez.</p>

        <form onSubmit={submit} className="space-y-6 bg-card border border-border rounded-2xl p-6 shadow-soft">
          <section className="space-y-4">
            <h2 className="font-bold text-lg">Fournisseur</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label>Nom du fournisseur *</Label><Input name="provider_name" required maxLength={100} placeholder="Ex: Restaurant Le Bonheur" /></div>
              <div><Label>Téléphone fournisseur</Label><Input name="provider_phone" maxLength={20} /></div>
            </div>
            <div><Label>Localisation</Label><Input name="provider_location" maxLength={200} placeholder="Cocody, Riviera 2" /></div>
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
              <Select name="relay_point_id">
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

          <section className="space-y-4">
            <h2 className="font-bold text-lg">Distance & circonstances</h2>
            <div>
              <Label>Distance estimée: <span className="text-primary font-bold">{distance} km</span></Label>
              <input type="range" min={1} max={50} step={0.5} value={distance} onChange={e => setDistance(Number(e.target.value))} className="w-full accent-primary" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { k: "rain", label: "Pluie" },
                { k: "holiday", label: "Jour férié" },
                { k: "strike", label: "Grève" },
                { k: "weekend", label: "Week-end" },
              ].map(c => (
                <label key={c.k} className="flex items-center gap-2 p-3 rounded-lg border border-border cursor-pointer hover:bg-accent">
                  <Checkbox checked={(circ as any)[c.k]} onCheckedChange={(v) => setCirc(prev => ({ ...prev, [c.k]: !!v }))} />
                  <span className="text-sm">{c.label}</span>
                </label>
              ))}
            </div>
          </section>

          <div><Label>Notes</Label><Textarea name="notes" maxLength={500} placeholder="Informations supplémentaires..." /></div>

          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Prix de livraison</div>
              <div className="text-3xl font-bold text-gradient">{price.toLocaleString("fr-FR")} FCFA</div>
            </div>
            <Button disabled={submitting} type="submit" size="lg" className="bg-gradient-primary shadow-glow h-12 px-6">
              {submitting ? "..." : "Valider la commande"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
