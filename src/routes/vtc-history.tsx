import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { History, MapPin, Navigation } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/vtc-history")({ component: VtcHistoryPage });

const STATUS_COLOR: Record<string, string> = {
  termine: "bg-green-500/15 text-green-700 border-green-500/40",
  annule: "bg-red-500/15 text-red-700 border-red-500/40",
  en_attente: "bg-amber-500/15 text-amber-700 border-amber-500/40",
  accepte: "bg-blue-500/15 text-blue-700 border-blue-500/40",
  en_cours: "bg-primary/15 text-primary border-primary/40",
};

function VtcHistoryPage() {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth", replace: true }); }, [user, loading, navigate]);

  const { data: driver } = useQuery({
    queryKey: ["my-driver-h", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("vtc_drivers").select("id").eq("user_id", user!.id).maybeSingle()).data,
  });

  const { data: rides } = useQuery({
    queryKey: ["vtc-history", user?.id, driver?.id, isAdmin],
    enabled: !!user,
    queryFn: async () => {
      let q = supabase.from("vtc_rides").select("*").order("created_at",{ascending:false}).limit(500);
      if (!isAdmin) {
        if (driver?.id) q = q.or(`client_id.eq.${user!.id},driver_id.eq.${driver.id}`);
        else q = q.eq("client_id", user!.id);
      }
      return (await q).data ?? [];
    },
  });

  const filtered = useMemo(() => {
    if (!rides) return [];
    const s = search.trim().toLowerCase();
    if (!s) return rides;
    return rides.filter((r: any) =>
      r.ride_code?.toLowerCase().includes(s) ||
      r.pickup_address?.toLowerCase().includes(s) ||
      r.dropoff_address?.toLowerCase().includes(s) ||
      r.vehicle_type?.toLowerCase().includes(s)
    );
  }, [rides, search]);

  const total = useMemo(() => filtered.filter((r: any) => r.status === "termine").reduce((s: number, r: any) => s + Number(r.final_price), 0), [filtered]);

  return (
    <div className="min-h-screen bg-muted/30">
      <SiteHeader />
      <main className="container mx-auto px-4 py-10 max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="size-12 rounded-2xl bg-gradient-primary grid place-items-center shadow-glow"><History className="size-6 text-primary-foreground" /></div>
          <div>
            <h1 className="text-3xl font-display font-bold">Historique VTC</h1>
            <p className="text-muted-foreground text-sm">Toutes vos courses {isAdmin && "— vue administrateur"}</p>
          </div>
        </div>

        <div className="flex gap-2 mb-4 flex-wrap">
          <Input placeholder="Rechercher (code, adresse, véhicule)..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-md" />
          <Button asChild variant="outline"><Link to="/vtc">Nouvelle course</Link></Button>
        </div>

        <div className="text-sm mb-4 text-muted-foreground">
          {filtered.length} course(s) · Total gains/dépenses confirmés : <b className="text-primary">{total.toLocaleString("fr-FR")} FCFA</b>
        </div>

        <div className="space-y-3">
          {!filtered.length ? (
            <div className="text-center p-10 bg-card border border-border rounded-2xl text-muted-foreground">Aucune course.</div>
          ) : filtered.map((r: any) => (
            <div key={r.id} className="bg-card border border-border rounded-xl p-4 shadow-soft">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                <div className="font-mono text-xs text-primary">{r.ride_code}</div>
                <div className="flex items-center gap-2">
                  <Badge className="capitalize">{r.vehicle_type}</Badge>
                  <Badge className={`${STATUS_COLOR[r.status] || ""} border capitalize`}>{r.status.replace("_"," ")}</Badge>
                </div>
              </div>
              <div className="text-sm space-y-1">
                <div className="flex items-start gap-2"><MapPin className="size-4 text-primary mt-0.5" /> {r.pickup_address}</div>
                <div className="flex items-start gap-2"><Navigation className="size-4 text-primary mt-0.5" /> {r.dropoff_address}</div>
              </div>
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-border text-sm">
                <span className="text-muted-foreground">{new Date(r.created_at).toLocaleString("fr-FR")} · {r.distance_km} km</span>
                <span className="font-bold text-primary">{Number(r.final_price).toLocaleString("fr-FR")} FCFA</span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
