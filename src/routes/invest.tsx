import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Film, Wheat, Cpu, ArrowRight, ShieldCheck, BarChart3, HandCoins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/invest")({ component: InvestHome });

const CAT_LABEL: Record<string, { label: string; icon: any; color: string }> = {
  cinema: { label: "Cinéma", icon: Film, color: "bg-fuchsia-500/15 text-fuchsia-700 border-fuchsia-500/40" },
  agro: { label: "Agro", icon: Wheat, color: "bg-green-500/15 text-green-700 border-green-500/40" },
  tech: { label: "Tech", icon: Cpu, color: "bg-blue-500/15 text-blue-700 border-blue-500/40" },
  autre: { label: "Autre", icon: TrendingUp, color: "bg-muted text-foreground border-border" },
};

const sb = supabase as any;

function InvestHome() {
  const { user } = useAuth();
  const { data: projects } = useQuery<any[]>({
    queryKey: ["crowd-projects"],
    queryFn: async () => (await sb.from("crowd_projects").select("*").in("status", ["open","funded"]).order("created_at",{ascending:false})).data ?? [],
  });

  return (
    <div className="min-h-screen bg-muted/30">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden bg-hero text-white">
        <div className="glow-orb size-[420px] -left-20 -top-20" />
        <div className="glow-orb size-[300px] right-0 bottom-0 opacity-50" />
        <div className="container mx-auto px-4 py-20 md:py-28 relative">
          <Badge className="mb-4 bg-white/10 text-white border-white/20">Crowdequity · Revenue Share</Badge>
          <h1 className="text-4xl md:text-6xl font-display font-bold leading-tight max-w-3xl">
            Investissez dans la culture et l'économie africaine, <span className="text-gradient bg-gradient-primary bg-clip-text text-transparent">partagez les profits</span>.
          </h1>
          <p className="text-lg opacity-80 mt-4 max-w-2xl">
            Cinéma, agrobusiness, tech — soutenez des projets à fort impact dès 5 000 FCFA et percevez des revenus partagés.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            <Button asChild size="lg" className="bg-gradient-primary shadow-glow">
              <a href="#projects">Voir les projets <ArrowRight className="ml-1 size-4" /></a>
            </Button>
            {user && (
              <Button asChild size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">
                <Link to="/invest-dashboard">Mon tableau de bord</Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* PROJECTS */}
      <section id="projects" className="container mx-auto px-4 py-16">
        <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
          <div>
            <h2 className="text-3xl font-display font-bold">Projets en cours</h2>
            <p className="text-muted-foreground">Sélection vérifiée par notre comité.</p>
          </div>
          {user && <Button asChild variant="outline"><Link to="/invest-dashboard"><BarChart3 className="size-4 mr-1" />Mon portefeuille</Link></Button>}
        </div>

        {!projects?.length ? (
          <div className="text-center py-16 bg-card border border-dashed border-border rounded-2xl">
            <HandCoins className="size-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Aucun projet ouvert pour le moment. Revenez bientôt !</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((p: any) => {
              const pct = Math.min(100, Math.round((Number(p.raised_amount) / Number(p.target_amount)) * 100));
              const cat = CAT_LABEL[p.category] || CAT_LABEL.autre;
              return (
                <Link key={p.id} to="/invest/$id" params={{ id: p.id }} className="group rounded-2xl overflow-hidden bg-card border border-border shadow-soft hover:shadow-elegant transition">
                  <div className="aspect-video relative overflow-hidden bg-muted">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.title} className="size-full object-cover group-hover:scale-105 transition" loading="lazy" />
                    ) : (
                      <div className="size-full grid place-items-center text-muted-foreground"><cat.icon className="size-12" /></div>
                    )}
                    <Badge className={`absolute top-3 left-3 border ${cat.color}`}><cat.icon className="size-3 mr-1" />{cat.label}</Badge>
                    {p.status === "funded" && <Badge className="absolute top-3 right-3 bg-green-600 text-white">Financé</Badge>}
                  </div>
                  <div className="p-5 space-y-3">
                    <h3 className="font-bold text-lg leading-tight">{p.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>
                    <Progress value={pct} className="h-2" />
                    <div className="flex items-center justify-between text-sm">
                      <span><b>{Number(p.raised_amount).toLocaleString("fr-FR")}</b> / {Number(p.target_amount).toLocaleString("fr-FR")} F</span>
                      <span className="font-bold text-primary">{pct}%</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <span className="text-xs text-muted-foreground">ROI estimé</span>
                      <span className="text-lg font-bold text-green-600">+{Number(p.roi_estimated)}%</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* HOW IT WORKS */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-display font-bold text-center mb-12">Comment ça marche</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: ShieldCheck, title: "1. Vérification d'identité", desc: "KYC simplifié pour sécuriser les transactions et respecter la réglementation." },
            { icon: HandCoins, title: "2. Investissez", desc: "Choisissez un projet, le montant, payez via Wave, OM, MTN, Moov ou carte bancaire." },
            { icon: TrendingUp, title: "3. Partagez les profits", desc: "Recevez vos revenus partagés selon vos parts dans le projet, dès la rentabilité atteinte." },
          ].map((s, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-6 shadow-soft">
              <div className="size-12 rounded-xl bg-gradient-primary grid place-items-center mb-4 shadow-glow"><s.icon className="size-6 text-primary-foreground" /></div>
              <h3 className="font-bold text-lg mb-1">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
