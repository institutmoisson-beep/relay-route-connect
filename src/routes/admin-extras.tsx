import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Shield, UserPlus, Check, X, Banknote, Briefcase, Plus, Trash2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/admin-extras")({ component: AdminExtras });

const sb = supabase as any;

function AdminExtras() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => { if (!loading && (!user || !isAdmin)) navigate({ to: "/", replace: true }); }, [user, isAdmin, loading, navigate]);

  // Driver applications
  const { data: driverApps } = useQuery<any[]>({
    queryKey: ["admin-driver-apps"],
    enabled: !!isAdmin,
    queryFn: async () => (await sb.from("vtc_driver_applications").select("*").order("created_at",{ascending:false})).data ?? [],
  });

  // Withdrawals
  const { data: withdrawals } = useQuery<any[]>({
    queryKey: ["admin-withdrawals"],
    enabled: !!isAdmin,
    queryFn: async () => (await sb.from("vtc_withdrawal_requests").select("*").order("created_at",{ascending:false})).data ?? [],
  });

  // Crowd projects
  const { data: projects } = useQuery<any[]>({
    queryKey: ["admin-crowd-projects"],
    enabled: !!isAdmin,
    queryFn: async () => (await sb.from("crowd_projects").select("*").order("created_at",{ascending:false})).data ?? [],
  });

  // Users for direct driver creation
  const { data: users } = useQuery<any[]>({
    queryKey: ["admin-users-list"],
    enabled: !!isAdmin,
    queryFn: async () => (await supabase.from("profiles").select("id, full_name, phone").order("created_at",{ascending:false}).limit(200)).data ?? [],
  });

  const [reviewing, setReviewing] = useState<any | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [createDriverOpen, setCreateDriverOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);

  const decideApp = async (status: "approved" | "rejected") => {
    if (!reviewing) return;
    const { error } = await sb.from("vtc_driver_applications").update({ status, admin_notes: reviewNote || null }).eq("id", reviewing.id);
    if (error) { toast.error(error.message); return; }
    toast.success(status === "approved" ? "Candidature approuvée" : "Candidature refusée");
    setReviewing(null); setReviewNote("");
    qc.invalidateQueries({ queryKey: ["admin-driver-apps"] });
  };

  const decideWithdrawal = async (id: string, status: "approved" | "rejected" | "paid") => {
    const { error } = await sb.from("vtc_withdrawal_requests").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Statut mis à jour");
    qc.invalidateQueries({ queryKey: ["admin-withdrawals"] });
  };

  const createDriverDirect = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const user_id = String(fd.get("user_id") || "");
    if (!user_id) { toast.error("Sélectionnez un utilisateur"); return; }
    const { error } = await sb.from("vtc_drivers").insert({
      user_id,
      full_name: String(fd.get("full_name") || ""),
      phone: String(fd.get("phone") || ""),
      vehicle_type: String(fd.get("vehicle_type") || "moto"),
      vehicle_plate: String(fd.get("vehicle_plate") || ""),
      vehicle_model: String(fd.get("vehicle_model") || ""),
      is_approved: true,
      status: "hors_ligne",
    });
    if (error) { toast.error(error.message); return; }
    await sb.from("user_roles").insert({ user_id, role: "driver" });
    toast.success("Conducteur créé");
    setCreateDriverOpen(false);
  };

  const createProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { error } = await sb.from("crowd_projects").insert({
      title: String(fd.get("title") || ""),
      category: String(fd.get("category") || "cinema"),
      description: String(fd.get("description") || ""),
      target_amount: Number(fd.get("target_amount") || 0),
      roi_estimated: Number(fd.get("roi_estimated") || 0),
      min_investment: Number(fd.get("min_investment") || 5000),
      duration_months: Number(fd.get("duration_months") || 12),
      image_url: String(fd.get("image_url") || "") || null,
      pitch_video_url: String(fd.get("pitch_video_url") || "") || null,
      created_by: user!.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Projet créé");
    setNewProjectOpen(false);
    qc.invalidateQueries({ queryKey: ["admin-crowd-projects"] });
  };

  const deleteProject = async (id: string) => {
    if (!confirm("Supprimer ce projet ?")) return;
    const { error } = await sb.from("crowd_projects").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["admin-crowd-projects"] });
  };

  const setProjectStatus = async (id: string, status: string) => {
    await sb.from("crowd_projects").update({ status }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-crowd-projects"] });
  };

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-muted/30">
      <SiteHeader />
      <main className="container mx-auto px-4 py-10 max-w-6xl">
        <Button asChild variant="ghost" size="sm" className="mb-4"><Link to="/admin"><ArrowLeft className="size-4 mr-1" />Admin principal</Link></Button>
        <div className="flex items-center gap-3 mb-8">
          <div className="size-12 rounded-2xl bg-gradient-bronze grid place-items-center"><Shield className="size-6 text-bronze-foreground" /></div>
          <div>
            <h1 className="text-3xl font-display font-bold">Administration étendue</h1>
            <p className="text-muted-foreground text-sm">Conducteurs, retraits & plateforme d'investissement.</p>
          </div>
        </div>

        <Tabs defaultValue="drivers">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="drivers">Candidatures conducteur</TabsTrigger>
            <TabsTrigger value="withdrawals">Retraits</TabsTrigger>
            <TabsTrigger value="projects">Projets Crowdequity</TabsTrigger>
          </TabsList>

          {/* Driver applications */}
          <TabsContent value="drivers" className="space-y-3">
            <div className="flex justify-end">
              <Button onClick={() => setCreateDriverOpen(true)} className="bg-gradient-primary"><UserPlus className="size-4 mr-1" />Créer un conducteur</Button>
            </div>
            {!driverApps?.length ? <Empty>Aucune candidature.</Empty> : driverApps.map((a: any) => (
              <div key={a.id} className="bg-card border border-border rounded-xl p-4 flex flex-wrap gap-4 items-center shadow-soft">
                <div className="flex-1 min-w-[200px]">
                  <div className="font-semibold">{a.full_name}</div>
                  <div className="text-xs text-muted-foreground">{a.phone} · {a.email} · {a.vehicle_type}</div>
                </div>
                <div className="flex gap-1">
                  {[a.vehicle_photo_url, a.id_recto_url, a.id_verso_url, a.license_url].filter(Boolean).map((u: string, i: number) => (
                    <a key={i} href={u} target="_blank" rel="noopener noreferrer" className="size-12 rounded bg-muted overflow-hidden"><img src={u} alt="" className="size-full object-cover" /></a>
                  ))}
                </div>
                <Badge className={a.status === "approved" ? "bg-green-500/15 text-green-700 border-green-500/40 border" : a.status === "rejected" ? "bg-destructive/15 text-destructive border-destructive/40 border" : "bg-amber-500/15 text-amber-700 border-amber-500/40 border"}>{a.status}</Badge>
                {a.status === "pending" && (
                  <Button size="sm" variant="outline" onClick={() => setReviewing(a)}>Examiner</Button>
                )}
              </div>
            ))}
          </TabsContent>

          {/* Withdrawals */}
          <TabsContent value="withdrawals" className="space-y-3">
            {!withdrawals?.length ? <Empty>Aucun retrait demandé.</Empty> : withdrawals.map((w: any) => (
              <div key={w.id} className="bg-card border border-border rounded-xl p-4 flex flex-wrap gap-4 items-center shadow-soft">
                <Banknote className="size-5 text-primary" />
                <div className="flex-1 min-w-[200px]">
                  <div className="font-semibold">{Number(w.amount).toLocaleString("fr-FR")} FCFA · {w.operator.toUpperCase()}</div>
                  <div className="text-xs text-muted-foreground">{w.recipient_name || "—"} · {w.recipient_number} · {new Date(w.created_at).toLocaleString("fr-FR")}</div>
                </div>
                <Badge>{w.status}</Badge>
                {w.status === "pending" && (
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => decideWithdrawal(w.id, "paid")}><Check className="size-4 mr-1" />Payer</Button>
                    <Button size="sm" variant="outline" onClick={() => decideWithdrawal(w.id, "rejected")}><X className="size-4 mr-1" />Refuser</Button>
                  </div>
                )}
              </div>
            ))}
          </TabsContent>

          {/* Projects */}
          <TabsContent value="projects" className="space-y-3">
            <div className="flex justify-end">
              <Button onClick={() => setNewProjectOpen(true)} className="bg-gradient-primary"><Plus className="size-4 mr-1" />Nouveau projet</Button>
            </div>
            {!projects?.length ? <Empty>Aucun projet.</Empty> : projects.map((p: any) => (
              <div key={p.id} className="bg-card border border-border rounded-xl p-4 flex flex-wrap gap-4 items-center shadow-soft">
                <Briefcase className="size-5 text-primary" />
                <div className="flex-1 min-w-[200px]">
                  <div className="font-semibold">{p.title}</div>
                  <div className="text-xs text-muted-foreground capitalize">{p.category} · {Number(p.raised_amount).toLocaleString("fr-FR")} / {Number(p.target_amount).toLocaleString("fr-FR")} F · ROI +{p.roi_estimated}%</div>
                </div>
                <Select value={p.status} onValueChange={(v) => setProjectStatus(p.id, v)}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["draft","open","funded","closed","cancelled"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="icon" variant="outline" onClick={() => deleteProject(p.id)}><Trash2 className="size-4" /></Button>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </main>

      {/* Review driver app */}
      <Dialog open={!!reviewing} onOpenChange={(o) => !o && setReviewing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Candidature de {reviewing?.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-2 text-sm">
            <div>Téléphone : {reviewing?.phone}</div>
            <div>Email : {reviewing?.email}</div>
            <div>Véhicule : {reviewing?.vehicle_type} · {reviewing?.vehicle_model} · {reviewing?.vehicle_plate}</div>
            <Textarea placeholder="Note admin (optionnel)" value={reviewNote} onChange={e => setReviewNote(e.target.value)} maxLength={500} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => decideApp("rejected")}><X className="size-4 mr-1" />Refuser</Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={() => decideApp("approved")}><Check className="size-4 mr-1" />Approuver</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create driver directly */}
      <Dialog open={createDriverOpen} onOpenChange={setCreateDriverOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Créer un conducteur</DialogTitle></DialogHeader>
          <form onSubmit={createDriverDirect} className="space-y-3">
            <div>
              <Label>Utilisateur existant</Label>
              <select name="user_id" required className="w-full mt-1 rounded-md border border-input bg-background h-9 px-3 text-sm">
                <option value="">— Sélectionner —</option>
                {users?.map((u: any) => <option key={u.id} value={u.id}>{u.full_name || u.id} · {u.phone || "—"}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Nom complet</Label><Input name="full_name" required maxLength={120} /></div>
              <div><Label>Téléphone</Label><Input name="phone" required maxLength={20} /></div>
              <div>
                <Label>Véhicule</Label>
                <Select name="vehicle_type" defaultValue="moto">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="moto">Moto</SelectItem>
                    <SelectItem value="voiture">Voiture</SelectItem>
                    <SelectItem value="tricycle">Tricycle</SelectItem>
                    <SelectItem value="camion">Camion</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Plaque</Label><Input name="vehicle_plate" maxLength={20} /></div>
              <div className="col-span-2"><Label>Modèle</Label><Input name="vehicle_model" maxLength={80} /></div>
            </div>
            <Button type="submit" className="w-full bg-gradient-primary">Créer</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* New project */}
      <Dialog open={newProjectOpen} onOpenChange={setNewProjectOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouveau projet d'investissement</DialogTitle></DialogHeader>
          <form onSubmit={createProject} className="space-y-3">
            <div><Label>Titre *</Label><Input name="title" required maxLength={160} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Catégorie</Label>
                <Select name="category" defaultValue="cinema">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cinema">Cinéma</SelectItem>
                    <SelectItem value="agro">Agrobusiness</SelectItem>
                    <SelectItem value="tech">Tech</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Durée (mois)</Label><Input type="number" name="duration_months" defaultValue={12} min={1} /></div>
              <div><Label>Objectif (FCFA) *</Label><Input type="number" name="target_amount" required min={1000} /></div>
              <div><Label>Min. invest. (FCFA)</Label><Input type="number" name="min_investment" defaultValue={5000} min={500} /></div>
              <div className="col-span-2"><Label>ROI estimé (%)</Label><Input type="number" name="roi_estimated" defaultValue={15} step="0.1" /></div>
            </div>
            <div><Label>URL image de couverture</Label><Input name="image_url" placeholder="https://…" /></div>
            <div><Label>URL vidéo pitch</Label><Input name="pitch_video_url" placeholder="https://…" /></div>
            <div><Label>Description / Pitch</Label><Textarea name="description" rows={5} maxLength={3000} /></div>
            <Button type="submit" className="w-full bg-gradient-primary">Créer le projet</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Empty({ children }: any) {
  return <div className="text-center text-muted-foreground py-12 bg-card border border-dashed border-border rounded-2xl">{children}</div>;
}
