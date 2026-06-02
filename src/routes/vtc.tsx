import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bike, Car, Truck, MapPin, Loader2, Sparkles, Clock, Navigation, History, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { geocode, getBrowserLocation, haversineKm } from "@/lib/geo";

export const Route = createFileRoute("/vtc")({ component: VtcPage });

type VType = "moto" | "voiture" | "tricycle" | "camion";

const VEHICLES: { value: VType; label: string; icon: any; desc: string }[] = [
  { value: "moto", label: "Moto", icon: Bike, desc: "Rapide, économique" },
  { value: "voiture", label: "Voiture", icon: Car, desc: "Confort, jusqu'à 4 places" },
  { value: "tricycle", label: "Tricycle", icon: Bike, desc: "Petits colis, courses urbaines" },
  { value: "camion", label: "Camion", icon: Truck, desc: "Déménagement, grosse marchandise" },
];

const RIDE_STATUS: Record<string, { label: string; color: string }> = {
  en_attente: { label: "En attente d'un chauffeur", color: "bg-amber-500/15 text-amber-700 border-amber-500/40" },
  accepte: { label: "Chauffeur en route", color: "bg-blue-500/15 text-blue-700 border-blue-500/40" },
  en_cours: { label: "Course en cours", color: "bg-primary/15 text-primary border-primary/40" },
  termine: { label: "Terminée", color: "bg-green-500/15 text-green-700 border-green-500/40" },
  annule: { label: "Annulée", color: "bg-red-500/15 text-red-700 border-red-500/40" },
};

function VtcPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [vehicleType, setVehicleType] = useState<VType>("moto");
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [pickupCoord, setPickupCoord] = useState<{ lat: number; lon: number } | null>(null);
  const [dropoffCoord, setDropoffCoord] = useState<{ lat: number; lon: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [price, setPrice] = useState<number | null>(null);
  const [computing, setComputing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth", replace: true }); }, [user, loading, navigate]);

  const { data: settings } = useQuery({
    queryKey: ["vtc-settings"],
    queryFn: async () => (await supabase.from("vtc_settings").select("*")).data ?? [],
  });
  const { data: mods } = useQuery({
    queryKey: ["vtc-mods"],
    queryFn: async () => (await supabase.from("vtc_pricing_modifiers").select("*").eq("id", 1).maybeSingle()).data,
  });

  const { data: activeRide, refetch } = useQuery({
    queryKey: ["my-active-ride", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("vtc_rides").select("*, vtc_drivers(full_name, phone, vehicle_plate, vehicle_model, current_lat, current_lng)")
      .eq("client_id", user!.id).not("status","in","(termine,annule)").order("created_at",{ascending:false}).limit(1).maybeSingle()).data,
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`my-rides-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "vtc_rides", filter: `client_id=eq.${user.id}` }, () => refetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, refetch]);

  const setting = useMemo(() => settings?.find((s: any) => s.vehicle_type === vehicleType), [settings, vehicleType]);

  const compute = async () => {
    if (!pickup.trim() || !dropoff.trim()) { toast.error("Renseignez les adresses"); return; }
    if (!setting || !mods) return;
    setComputing(true);
    const [a, b] = await Promise.all([
      pickupCoord ? Promise.resolve(pickupCoord) : geocode(`${pickup}, Côte d'Ivoire`),
      geocode(`${dropoff}, Côte d'Ivoire`),
    ]);
    if (!a || !b) { toast.error("Adresse introuvable"); setComputing(false); return; }
    setPickupCoord(a); setDropoffCoord(b);
    const km = Math.max(0.5, haversineKm(a, b));
    // average urban speed ~25 km/h
    const min = Math.max(2, (km / 25) * 60);
    setDistance(Math.round(km * 10) / 10);
    setDuration(Math.round(min));
    let p = Number(setting.base_price) + Number(setting.price_per_km) * km + Number(setting.price_per_min) * min;
    const applied: string[] = [];
    if (mods.rain_active) { p *= Number(mods.rain_mult); applied.push("pluie"); }
    if (mods.rush_active) { p *= Number(mods.rush_mult); applied.push("heure de pointe"); }
    if (mods.holiday_active) { p *= Number(mods.holiday_mult); applied.push("jour férié"); }
    if (mods.strike_active) { p *= Number(mods.strike_mult); applied.push("grève"); }
    const hour = new Date().getHours();
    if (hour >= 22 || hour < 6) { p *= Number(mods.night_mult); applied.push("nuit"); }
    setPrice(Math.round(p));
    setComputing(false);
    toast.success(`${km.toFixed(1)} km · ~${Math.round(min)} min`);
  };

  const useMyLocation = async () => {
    try {
      const c = await getBrowserLocation();
      setPickupCoord(c);
      setPickup(`Position actuelle (${c.lat.toFixed(4)}, ${c.lon.toFixed(4)})`);
      toast.success("Position détectée");
    } catch (e: any) { toast.error(e?.message || "Géolocalisation refusée"); }
  };

  const submit = async () => {
    if (!user || !pickupCoord || !dropoffCoord || distance == null || duration == null || price == null) return;
    setSubmitting(true);
    const applied: any = {};
    if (mods?.rain_active) applied.rain = true;
    if (mods?.rush_active) applied.rush = true;
    if (mods?.holiday_active) applied.holiday = true;
    if (mods?.strike_active) applied.strike = true;
    const hour = new Date().getHours();
    if (hour >= 22 || hour < 6) applied.night = true;
    const { error } = await supabase.from("vtc_rides").insert({
      client_id: user.id,
      vehicle_type: vehicleType,
      pickup_address: pickup,
      pickup_lat: pickupCoord.lat,
      pickup_lng: pickupCoord.lon,
      dropoff_address: dropoff,
      dropoff_lat: dropoffCoord.lat,
      dropoff_lng: dropoffCoord.lon,
      distance_km: distance,
      duration_min: duration,
      base_price: Number(setting!.base_price),
      final_price: price,
      applied_modifiers: applied,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Course demandée ! Recherche d'un chauffeur...");
    refetch();
  };

  const cancelRide = async () => {
    if (!activeRide) return;
    await supabase.from("vtc_rides").update({ status: "annule", cancel_reason: "Annulée par le client" }).eq("id", activeRide.id);
    refetch();
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <SiteHeader />
      <main className="container mx-auto px-4 py-10 max-w-3xl">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-2xl bg-gradient-primary grid place-items-center shadow-glow">
              <Sparkles className="size-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold">MSN VTC</h1>
              <p className="text-muted-foreground text-sm">Moto, voiture, tricycle ou camion — un chauffeur en quelques secondes.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm"><Link to="/vtc-driver"><UserCog className="size-4 mr-1" />Mode chauffeur</Link></Button>
            <Button asChild variant="ghost" size="sm"><Link to="/vtc-history"><History className="size-4 mr-1" />Historique</Link></Button>
          </div>
        </div>

        {activeRide && (
          <div className="mt-6 bg-card border border-border rounded-2xl p-6 shadow-soft">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="font-mono text-sm text-primary">{activeRide.ride_code}</div>
              <Badge className={`${RIDE_STATUS[activeRide.status]?.color} border`}>{RIDE_STATUS[activeRide.status]?.label}</Badge>
            </div>
            <div className="text-sm space-y-1">
              <div className="flex items-center gap-2"><MapPin className="size-4 text-primary" /> <b>De :</b> {activeRide.pickup_address}</div>
              <div className="flex items-center gap-2"><Navigation className="size-4 text-primary" /> <b>À :</b> {activeRide.dropoff_address}</div>
              <div className="flex items-center gap-2"><Clock className="size-4 text-primary" /> {activeRide.distance_km} km · ~{activeRide.duration_min} min · <b>{Number(activeRide.final_price).toLocaleString("fr-FR")} FCFA</b></div>
            </div>
            {activeRide.vtc_drivers && (
              <div className="mt-4 p-3 rounded-xl bg-accent/40 border border-border text-sm">
                <div className="font-semibold">{activeRide.vtc_drivers.full_name} · {activeRide.vtc_drivers.vehicle_model || activeRide.vehicle_type}</div>
                <div className="text-muted-foreground">{activeRide.vtc_drivers.phone} · {activeRide.vtc_drivers.vehicle_plate || "—"}</div>
              </div>
            )}
            {activeRide.status === "en_attente" && (
              <Button variant="outline" size="sm" className="mt-4" onClick={cancelRide}>Annuler la demande</Button>
            )}
          </div>
        )}

        <div className="mt-8 bg-card border border-border rounded-2xl p-6 shadow-soft space-y-6">
          <div>
            <Label className="mb-3 block">Type de véhicule</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {VEHICLES.map(v => {
                const s = settings?.find((x: any) => x.vehicle_type === v.value);
                if (s && !s.is_active) return null;
                return (
                  <button key={v.value} type="button" onClick={() => { setVehicleType(v.value); setPrice(null); }}
                    className={`p-4 rounded-xl border-2 transition text-left ${vehicleType === v.value ? "border-primary bg-primary/5 shadow-glow" : "border-border hover:border-primary/50"}`}>
                    <v.icon className="size-6 text-primary mb-2" />
                    <div className="font-bold">{v.label}</div>
                    <div className="text-xs text-muted-foreground">{v.desc}</div>
                    {s && <div className="text-xs mt-1 text-primary font-semibold">dès {Number(s.base_price).toLocaleString("fr-FR")} FCFA</div>}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label>Lieu de départ</Label>
            <div className="flex gap-2">
              <Input value={pickup} onChange={e => { setPickup(e.target.value); setPickupCoord(null); }} placeholder="Cocody Riviera 2, Abidjan" />
              <Button type="button" variant="outline" onClick={useMyLocation}><MapPin className="size-4" /></Button>
            </div>
          </div>

          <div>
            <Label>Destination</Label>
            <Input value={dropoff} onChange={e => setDropoff(e.target.value)} placeholder="Plateau, Abidjan" />
          </div>

          <Button type="button" variant="outline" onClick={compute} disabled={computing} className="w-full">
            {computing ? <Loader2 className="size-4 animate-spin mr-1" /> : <Navigation className="size-4 mr-1" />} Calculer le prix
          </Button>

          {price != null && (
            <div className="rounded-xl bg-gradient-to-br from-primary/10 to-accent/30 p-5 border border-border">
              <div className="flex justify-between text-sm mb-2"><span>Distance</span><b>{distance} km</b></div>
              <div className="flex justify-between text-sm mb-2"><span>Durée estimée</span><b>~{duration} min</b></div>
              <div className="flex justify-between items-end mt-3 pt-3 border-t border-border">
                <span className="text-sm text-muted-foreground">Prix total</span>
                <span className="text-3xl font-bold text-gradient">{price.toLocaleString("fr-FR")} FCFA</span>
              </div>
              <Button disabled={submitting || !!activeRide} onClick={submit} className="w-full mt-4 bg-gradient-primary shadow-glow h-12">
                {activeRide ? "Une course est déjà en cours" : submitting ? "..." : "Confirmer la course"}
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
