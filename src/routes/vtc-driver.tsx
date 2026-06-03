import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bike, Power, MapPin, CheckCircle2, XCircle, Navigation, Wallet, Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { getBrowserLocation } from "@/lib/geo";

export const Route = createFileRoute("/vtc-driver")({ component: VtcDriverPage });

function VtcDriverPage() {
  const { user, loading, profile } = useAuth();
  const navigate = useNavigate();
  const [registering, setRegistering] = useState(false);
  const [working, setWorking] = useState(false);

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth", replace: true }); }, [user, loading, navigate]);

  const { data: driver, refetch: refetchDriver } = useQuery({
    queryKey: ["my-driver", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("vtc_drivers").select("*").eq("user_id", user!.id).maybeSingle()).data,
  });

  const { data: rides, refetch: refetchRides } = useQuery({
    queryKey: ["driver-rides", driver?.id, driver?.vehicle_type, driver?.status],
    enabled: !!driver && driver.is_approved,
    queryFn: async () => {
      const own = await supabase.from("vtc_rides").select("*").or(`driver_id.eq.${driver!.id}`).not("status","in","(termine,annule)").order("created_at",{ascending:false});
      const pending = driver!.status === "en_ligne"
        ? await supabase.from("vtc_rides").select("*").eq("status","en_attente").eq("vehicle_type", driver!.vehicle_type).order("created_at",{ascending:false}).limit(20)
        : { data: [] };
      return { own: own.data ?? [], pending: pending.data ?? [] };
    },
  });

  useEffect(() => {
    if (!driver) return;
    const ch = supabase.channel(`vtc-rides-driver-${driver.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "vtc_rides" }, () => refetchRides())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [driver, refetchRides]);

  // Push location every 30s when online
  useEffect(() => {
    if (!driver || driver.status === "hors_ligne") return;
    const push = async () => {
      try {
        const c = await getBrowserLocation();
        await supabase.from("vtc_drivers").update({ current_lat: c.lat, current_lng: c.lon, last_location_at: new Date().toISOString() }).eq("id", driver.id);
      } catch {}
    };
    push();
    const iv = setInterval(push, 30000);
    return () => clearInterval(iv);
  }, [driver]);

  // Withdrawals
  const { data: withdrawals, refetch: refetchW } = useQuery<any[]>({
    queryKey: ["driver-withdrawals", driver?.id],
    enabled: !!driver,
    queryFn: async () => ((await (supabase as any).from("vtc_withdrawal_requests").select("*").eq("driver_id", driver!.id).order("created_at",{ascending:false})).data ?? []),
  });
  const [wOpen, setWOpen] = useState(false);
  const submitWithdrawal = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!driver || !user) return;
    const fd = new FormData(e.currentTarget);
    const amount = Number(fd.get("amount"));
    if (amount <= 0 || amount > Number(driver.total_earnings)) { toast.error("Montant invalide"); return; }
    const { error } = await (supabase as any).from("vtc_withdrawal_requests").insert({
      driver_id: driver.id,
      user_id: user.id,
      amount,
      operator: String(fd.get("operator") || "wave"),
      recipient_number: String(fd.get("recipient_number") || ""),
      recipient_name: String(fd.get("recipient_name") || ""),
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Demande de retrait envoyée");
    setWOpen(false); refetchW();
  };

  const toggleStatus = async () => {
    if (!driver) return;
    const next = driver.status === "en_ligne" ? "hors_ligne" : "en_ligne";
    setWorking(true);
    await supabase.from("vtc_drivers").update({ status: next }).eq("id", driver.id);
    setWorking(false);
    refetchDriver();
    toast.success(next === "en_ligne" ? "Vous êtes en ligne" : "Vous êtes hors ligne");
  };

  const acceptRide = async (rideId: string) => {
    if (!driver) return;
    setWorking(true);
    const { error } = await supabase.from("vtc_rides").update({ status: "accepte", driver_id: driver.id }).eq("id", rideId).eq("status","en_attente");
    setWorking(false);
    if (error) toast.error(error.message);
    else { toast.success("Course acceptée !"); refetchRides(); refetchDriver(); }
  };

  const updateRideStatus = async (rideId: string, status: "accepte" | "en_cours" | "termine" | "annule") => {
    setWorking(true);
    await supabase.from("vtc_rides").update({ status }).eq("id", rideId);
    setWorking(false);
    refetchRides();
    if (status === "termine") refetchDriver();
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-muted/30">
      <SiteHeader />
      <main className="container mx-auto px-4 py-10 max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="size-12 rounded-2xl bg-gradient-primary grid place-items-center shadow-glow"><Bike className="size-6 text-primary-foreground" /></div>
          <div>
            <h1 className="text-3xl font-display font-bold">Mode chauffeur</h1>
            <p className="text-muted-foreground text-sm">Connectez-vous, recevez des courses en temps réel.</p>
          </div>
        </div>

        {!driver && (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-soft space-y-4 text-center">
            <h2 className="font-bold text-lg">Devenir chauffeur MSN VTC</h2>
            <p className="text-sm text-muted-foreground">Soumettez votre candidature complète (documents, véhicule, permis) pour rejoindre la flotte.</p>
            <Button asChild className="bg-gradient-primary"><Link to="/become-driver">Postuler maintenant</Link></Button>
          </div>
        )}

        {driver && !driver.is_approved && (
          <div className="bg-amber-500/10 border border-amber-500/40 text-amber-900 rounded-2xl p-6">
            <h2 className="font-bold mb-1">Candidature en attente</h2>
            <p className="text-sm">Votre dossier est en cours d'examen. Un administrateur va vous valider sous peu.</p>
          </div>
        )}

        {driver && driver.is_approved && (
          <>
            <div className="bg-card border border-border rounded-2xl p-6 shadow-soft">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="text-sm text-muted-foreground">Statut actuel</div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={driver.status === "en_ligne" ? "bg-green-500/15 text-green-700 border-green-500/40 border" : driver.status === "occupe" ? "bg-amber-500/15 text-amber-700 border-amber-500/40 border" : "bg-muted text-muted-foreground border"}>
                      {driver.status === "en_ligne" ? "En ligne" : driver.status === "occupe" ? "En course" : "Hors ligne"}
                    </Badge>
                    <span className="text-sm capitalize">{driver.vehicle_type}</span>
                  </div>
                </div>
                <Button onClick={toggleStatus} disabled={working || driver.status === "occupe"} className={driver.status === "en_ligne" ? "" : "bg-gradient-primary"}>
                  <Power className="size-4 mr-1" />{driver.status === "en_ligne" ? "Passer hors ligne" : "Passer en ligne"}
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-6 text-center">
                <Stat icon={Wallet} label="Gains totaux" value={`${Number(driver.total_earnings).toLocaleString("fr-FR")} F`} />
                <Stat icon={Navigation} label="Courses" value={String(driver.total_rides)} />
                <Stat icon={Star} label="Note" value={Number(driver.rating).toFixed(1)} />
              </div>
            </div>

            {/* Active rides */}
            {!!rides?.own.length && (
              <div className="mt-6">
                <h2 className="font-bold mb-3">Course en cours</h2>
                {rides.own.map((r: any) => (
                  <RideCard key={r.id} ride={r} actions={
                    <>
                      {r.status === "accepte" && <Button size="sm" onClick={() => updateRideStatus(r.id, "en_cours")}><Navigation className="size-4 mr-1" />Démarrer</Button>}
                      {r.status === "en_cours" && <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => updateRideStatus(r.id, "termine")}><CheckCircle2 className="size-4 mr-1" />Terminer</Button>}
                      {(r.status === "accepte" || r.status === "en_attente") && <Button size="sm" variant="outline" onClick={() => updateRideStatus(r.id, "annule")}><XCircle className="size-4 mr-1" />Annuler</Button>}
                    </>
                  } />
                ))}
              </div>
            )}

            {/* Pending available rides */}
            {driver.status === "en_ligne" && (
              <div className="mt-6">
                <h2 className="font-bold mb-3">Courses disponibles ({rides?.pending.length ?? 0})</h2>
                {!rides?.pending.length ? (
                  <div className="text-sm text-muted-foreground p-4 bg-muted/30 rounded-xl border border-border flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" /> En attente de nouvelles demandes...
                  </div>
                ) : rides.pending.map((r: any) => (
                  <RideCard key={r.id} ride={r} actions={
                    <Button size="sm" className="bg-gradient-primary" onClick={() => acceptRide(r.id)} disabled={working}>
                      <CheckCircle2 className="size-4 mr-1" />Accepter
                    </Button>
                  } />
                ))}
              </div>
            )}

            <div className="mt-6 text-center">
              <Button asChild variant="ghost"><Link to="/vtc-history">Voir l'historique de mes courses</Link></Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: any) {
  return (
    <div className="p-3 rounded-xl bg-muted/40 border border-border">
      <Icon className="size-4 mx-auto text-primary mb-1" />
      <div className="text-lg font-bold">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function RideCard({ ride, actions }: { ride: any; actions: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 mb-3 shadow-soft">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div className="font-mono text-xs text-primary">{ride.ride_code}</div>
        <Badge className="capitalize">{ride.vehicle_type}</Badge>
      </div>
      <div className="text-sm space-y-1">
        <div className="flex items-start gap-2"><MapPin className="size-4 text-primary mt-0.5" /> {ride.pickup_address}</div>
        <div className="flex items-start gap-2"><Navigation className="size-4 text-primary mt-0.5" /> {ride.dropoff_address}</div>
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border flex-wrap gap-2">
        <div className="text-sm text-muted-foreground">{ride.distance_km} km · ~{ride.duration_min} min</div>
        <div className="font-bold text-primary">{Number(ride.final_price).toLocaleString("fr-FR")} FCFA</div>
      </div>
      <div className="flex gap-2 mt-3 flex-wrap">{actions}</div>
    </div>
  );
}
