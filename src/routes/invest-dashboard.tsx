import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Wallet, Briefcase, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/invest-dashboard")({ component: InvestDashboard });

function InvestDashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth", replace: true }); }, [user, loading, navigate]);

  const { data: investments } = useQuery({
    queryKey: ["my-investments", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("crowd_investments").select("*, crowd_projects(title, category, image_url, roi_estimated, status)").eq("user_id", user!.id).order("investment_date",{ascending:false})).data ?? [],
  });

  const stats = useMemo(() => {
    const total = (investments ?? []).reduce((s: number, i: any) => s + Number(i.amount), 0);
    const expectedGain = (investments ?? []).reduce((s: number, i: any) => s + Number(i.amount) * (Number(i.crowd_projects?.roi_estimated ?? 0) / 100), 0);
    const distinct = new Set((investments ?? []).map((i: any) => i.project_id)).size;
    return { total, expectedGain, distinct, count: investments?.length ?? 0 };
  }, [investments]);

  // Simple sparkline by month
  const points = useMemo(() => {
    const byMonth = new Map<string, number>();
    (investments ?? []).forEach((i: any) => {
      const key = new Date(i.investment_date).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
      byMonth.set(key, (byMonth.get(key) ?? 0) + Number(i.amount));
    });
    return Array.from(byMonth.entries()).reverse();
  }, [investments]);
  const maxVal = Math.max(1, ...points.map(p => p[1]));

  if (!user) return null;

  return (
    <div className="min-h-screen bg-muted/30">
      <SiteHeader />
      <main className="container mx-auto px-4 py-10 max-w-6xl">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold">Mon portefeuille d'investissement</h1>
            <p className="text-muted-foreground">Vue d'ensemble de vos placements.</p>
          </div>
          <Button asChild className="bg-gradient-primary"><Link to="/invest">Découvrir des projets</Link></Button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Kpi icon={Wallet} label="Total investi" value={`${stats.total.toLocaleString("fr-FR")} F`} />
          <Kpi icon={TrendingUp} label="Gains potentiels" value={`+${Math.round(stats.expectedGain).toLocaleString("fr-FR")} F`} accent />
          <Kpi icon={Briefcase} label="Projets soutenus" value={String(stats.distinct)} />
          <Kpi icon={BarChart3} label="Transactions" value={String(stats.count)} />
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-soft mb-8">
          <h2 className="font-bold mb-4">Performance mensuelle</h2>
          {!points.length ? (
            <p className="text-sm text-muted-foreground">Aucun investissement pour générer le graphique.</p>
          ) : (
            <div className="flex items-end gap-2 h-40">
              {points.map(([month, v]) => (
                <div key={month} className="flex-1 flex flex-col items-center justify-end h-full">
                  <div className="w-full bg-gradient-primary rounded-t-md transition-all hover:opacity-80" style={{ height: `${(v / maxVal) * 100}%` }} title={`${v.toLocaleString("fr-FR")} F`} />
                  <div className="text-[10px] text-muted-foreground mt-1">{month}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-soft overflow-hidden">
          <div className="p-5 border-b border-border font-bold">Mes transactions</div>
          {!investments?.length ? (
            <div className="p-12 text-center text-muted-foreground">Aucun investissement pour l'instant. <Link to="/invest" className="text-primary underline">Découvrir des projets</Link></div>
          ) : (
            <div className="divide-y divide-border">
              {investments.map((i: any) => (
                <div key={i.id} className="p-4 flex items-center gap-4 flex-wrap">
                  <div className="size-12 rounded-lg bg-muted overflow-hidden grid place-items-center">
                    {i.crowd_projects?.image_url ? <img src={i.crowd_projects.image_url} alt="" className="size-full object-cover" /> : <Briefcase className="size-5 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-[180px]">
                    <Link to="/invest/$id" params={{ id: i.project_id }} className="font-semibold hover:text-primary">{i.crowd_projects?.title || "Projet"}</Link>
                    <div className="text-xs text-muted-foreground capitalize">{i.crowd_projects?.category} · {new Date(i.investment_date).toLocaleDateString("fr-FR")}</div>
                  </div>
                  <Badge variant="outline" className="uppercase text-[10px]">{i.payment_method}</Badge>
                  <div className="font-bold text-primary">{Number(i.amount).toLocaleString("fr-FR")} F</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, accent }: any) {
  return (
    <div className={`rounded-2xl p-5 border border-border shadow-soft ${accent ? "bg-gradient-primary text-primary-foreground" : "bg-card"}`}>
      <Icon className={`size-5 mb-2 ${accent ? "text-primary-foreground" : "text-primary"}`} />
      <div className={`text-[10px] uppercase tracking-wider ${accent ? "opacity-80" : "text-muted-foreground"}`}>{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
