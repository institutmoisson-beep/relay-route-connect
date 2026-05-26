import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Star, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/relay-points")({ component: RelayPoints });

const TYPE_LABEL: Record<string, string> = {
  shop: "Boutique", restaurant: "Restaurant", maquis: "Maquis",
  establishment: "Établissement", individual: "Particulier", other: "Autre",
};

function RelayPoints() {
  const { data: relays, isLoading } = useQuery({
    queryKey: ["all-relays"],
    queryFn: async () => (await supabase.from("msn_relay_points").select("*").eq("status","active").order("trust_level", { ascending: false })).data ?? [],
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="bg-hero text-white py-14 relative overflow-hidden">
        <div className="glow-orb size-[400px] -top-20 -left-10" />
        <div className="container mx-auto px-4 relative">
          <h1 className="text-4xl md:text-5xl font-display font-bold">Nos points relais</h1>
          <p className="opacity-85 mt-3">Trouvez le relais le plus proche de chez vous.</p>
        </div>
      </section>

      <main className="container mx-auto px-4 py-12">
        {isLoading ? (
          <p className="text-muted-foreground">Chargement…</p>
        ) : !relays?.length ? (
          <div className="text-center py-20">
            <MapPin className="size-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Aucun point relais pour l'instant.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {relays.map(r => (
              <div key={r.id} className="bg-card border border-border rounded-2xl p-5 shadow-soft hover:shadow-elegant transition hover:-translate-y-1">
                <div className="flex items-start justify-between mb-3">
                  <Badge className="bg-accent text-bronze border-0">{TYPE_LABEL[r.space_type] ?? r.space_type}</Badge>
                  {r.trust_level !== "standard" && (
                    <Badge className={r.trust_level === "premium" ? "bg-gradient-primary text-primary-foreground border-0" : "bg-bronze text-bronze-foreground border-0"}>
                      <Shield className="size-3 mr-1" />{r.trust_level === "premium" ? "Premium" : "Vérifié"}
                    </Badge>
                  )}
                </div>
                <h3 className="font-display font-bold text-lg">{r.name}</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="size-3.5" />{r.city}, {r.neighborhood}</p>
                {r.address && <p className="text-xs text-muted-foreground mt-2">{r.address}</p>}
                <div className="flex items-center gap-1 mt-3 text-sm">
                  <Star className="size-4 text-primary fill-primary" />
                  <span className="font-semibold">{Number(r.rating || 0).toFixed(1)}</span>
                  <span className="text-muted-foreground">({r.total_reviews} avis)</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
