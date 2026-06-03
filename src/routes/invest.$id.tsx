import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, TrendingUp, Calendar, Target, FileText, Play, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { MockPayment } from "@/components/mock-payment";

export const Route = createFileRoute("/invest/$id")({ component: InvestDetail });

function InvestDetail() {
  const { id } = Route.useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [investOpen, setInvestOpen] = useState(false);
  const [amount, setAmount] = useState<number>(10000);

  const { data: project } = useQuery({
    queryKey: ["crowd-project", id],
    queryFn: async () => (await supabase.from("crowd_projects").select("*").eq("id", id).maybeSingle()).data,
  });

  if (!project) {
    return (
      <div className="min-h-screen bg-muted/30">
        <SiteHeader />
        <div className="container mx-auto px-4 py-20 text-center">
          <p className="text-muted-foreground">Chargement…</p>
        </div>
      </div>
    );
  }

  const pct = Math.min(100, Math.round((Number(project.raised_amount) / Number(project.target_amount)) * 100));
  const estimatedReturn = Math.round(amount * (1 + Number(project.roi_estimated) / 100));
  const shares = Number(project.target_amount) > 0 ? amount / Number(project.target_amount) : 0;

  const confirmInvest = async (method: any, ref: string) => {
    if (!user) { navigate({ to: "/auth" }); return; }
    const { error } = await supabase.from("crowd_investments").insert({
      user_id: user.id,
      project_id: project.id,
      amount,
      shares_owned: shares,
      payment_method: method,
      payment_ref: ref,
    });
    if (error) { toast.error(error.message); return; }
    if (method === "wallet") {
      await supabase.from("profiles").update({ wallet_balance: Number(profile?.wallet_balance ?? 0) - amount }).eq("id", user.id);
    }
    toast.success("Investissement enregistré !");
    qc.invalidateQueries({ queryKey: ["crowd-project", id] });
    setTimeout(() => { setInvestOpen(false); navigate({ to: "/invest-dashboard" }); }, 1500);
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <SiteHeader />
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <Button asChild variant="ghost" size="sm" className="mb-4"><Link to="/invest"><ArrowLeft className="size-4 mr-1" />Retour aux projets</Link></Button>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="aspect-video rounded-2xl overflow-hidden bg-muted border border-border">
              {project.image_url ? <img src={project.image_url} alt={project.title} className="size-full object-cover" /> : <div className="size-full grid place-items-center text-muted-foreground">Aucune image</div>}
            </div>
            <div>
              <Badge className="mb-2 capitalize">{project.category}</Badge>
              <h1 className="text-3xl md:text-4xl font-display font-bold">{project.title}</h1>
            </div>

            <Tabs defaultValue="pitch">
              <TabsList>
                <TabsTrigger value="pitch"><Play className="size-4 mr-1" />Pitch & Vidéo</TabsTrigger>
                <TabsTrigger value="financial"><FileText className="size-4 mr-1" />Données financières</TabsTrigger>
              </TabsList>
              <TabsContent value="pitch" className="bg-card border border-border rounded-2xl p-6 space-y-4">
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{project.description || "Description à venir."}</p>
                {project.pitch_video_url && (
                  <video controls src={project.pitch_video_url} className="w-full rounded-xl" />
                )}
              </TabsContent>
              <TabsContent value="financial" className="bg-card border border-border rounded-2xl p-6 space-y-4">
                <div className="grid sm:grid-cols-3 gap-4">
                  <Stat icon={Target} label="Objectif" value={`${Number(project.target_amount).toLocaleString("fr-FR")} F`} />
                  <Stat icon={TrendingUp} label="ROI estimé" value={`+${Number(project.roi_estimated)}%`} />
                  <Stat icon={Calendar} label="Durée" value={`${project.duration_months} mois`} />
                </div>
                {project.business_plan_url && (
                  <Button asChild variant="outline"><a href={project.business_plan_url} target="_blank" rel="noopener noreferrer"><FileText className="size-4 mr-1" />Télécharger le Business Plan</a></Button>
                )}
                <div className="p-4 rounded-xl bg-muted/40 border border-border">
                  <div className="flex items-center gap-2 mb-3"><Calculator className="size-5 text-primary" /><h3 className="font-bold">Simulateur de ROI</h3></div>
                  <Input type="number" min={Number(project.min_investment)} step={1000} value={amount} onChange={e => setAmount(Math.max(0, Number(e.target.value)))} />
                  <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                    <div className="p-3 rounded bg-card border"><div className="text-muted-foreground text-xs">Vos parts</div><div className="font-bold">{(shares * 100).toFixed(3)}%</div></div>
                    <div className="p-3 rounded bg-card border"><div className="text-muted-foreground text-xs">Retour estimé</div><div className="font-bold text-green-600">{estimatedReturn.toLocaleString("fr-FR")} F</div></div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <aside className="lg:sticky lg:top-20 h-fit space-y-4">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-soft">
              <Progress value={pct} className="h-3 mb-3" />
              <div className="text-2xl font-bold">{Number(project.raised_amount).toLocaleString("fr-FR")} <span className="text-sm text-muted-foreground font-normal">/ {Number(project.target_amount).toLocaleString("fr-FR")} F</span></div>
              <div className="text-sm text-primary font-semibold">{pct}% financé</div>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Min. investissement</span><b>{Number(project.min_investment).toLocaleString("fr-FR")} F</b></div>
                <div className="flex justify-between"><span className="text-muted-foreground">ROI estimé</span><b className="text-green-600">+{Number(project.roi_estimated)}%</b></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Durée</span><b>{project.duration_months} mois</b></div>
              </div>
              <Button onClick={() => { if (!user) navigate({ to: "/auth" }); else setInvestOpen(true); }} disabled={project.status !== "open"} className="w-full mt-5 h-12 bg-gradient-primary shadow-glow">
                {project.status === "open" ? "Investir dans ce projet" : "Projet clôturé"}
              </Button>
            </div>
          </aside>
        </div>
      </main>

      <Dialog open={investOpen} onOpenChange={setInvestOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Investir dans « {project.title} »</DialogTitle></DialogHeader>
          <div>
            <label className="text-sm font-medium">Montant (FCFA)</label>
            <Input type="number" min={Number(project.min_investment)} step={1000} value={amount} onChange={e => setAmount(Math.max(0, Number(e.target.value)))} />
            <p className="text-xs text-muted-foreground mt-1">Minimum {Number(project.min_investment).toLocaleString("fr-FR")} F</p>
          </div>
          <MockPayment amount={amount} walletBalance={Number(profile?.wallet_balance ?? 0)} onConfirm={confirmInvest} disabled={amount < Number(project.min_investment)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: any) {
  return (
    <div className="p-3 rounded-xl bg-muted/40 border border-border">
      <Icon className="size-4 text-primary mb-1" />
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-bold">{value}</div>
    </div>
  );
}
