import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bike, Upload, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { uploadFile } from "@/lib/storage-upload";

export const Route = createFileRoute("/become-driver")({ component: BecomeDriverPage });

function BecomeDriverPage() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth", replace: true }); }, [user, loading, navigate]);

  const { data: existing, refetch } = useQuery({
    queryKey: ["my-driver-app", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("vtc_driver_applications").select("*").eq("user_id", user!.id).order("created_at",{ascending:false}).limit(1).maybeSingle()).data,
  });

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    try {
      const upload = async (key: string): Promise<string | null> => {
        const f = fd.get(key) as File | null;
        if (!f || !f.size) return null;
        return await uploadFile("vtc-applications", `${user.id}/${key}-${Date.now()}-${f.name}`, f);
      };
      const [vehicle_photo_url, id_recto_url, id_verso_url, license_url] = await Promise.all([
        upload("vehicle_photo"), upload("id_recto"), upload("id_verso"), upload("license"),
      ]);
      const { error } = await supabase.from("vtc_driver_applications").insert({
        user_id: user.id,
        full_name: String(fd.get("full_name") || ""),
        phone: String(fd.get("phone") || ""),
        email: String(fd.get("email") || ""),
        vehicle_type: String(fd.get("vehicle_type") || "moto"),
        vehicle_plate: String(fd.get("vehicle_plate") || ""),
        vehicle_model: String(fd.get("vehicle_model") || ""),
        vehicle_photo_url, id_recto_url, id_verso_url, license_url,
      });
      if (error) throw error;
      toast.success("Candidature envoyée !");
      refetch();
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de l'envoi");
    }
    setSubmitting(false);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-muted/30">
      <SiteHeader />
      <main className="container mx-auto px-4 py-10 max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="size-12 rounded-2xl bg-gradient-primary grid place-items-center shadow-glow"><Bike className="size-6 text-primary-foreground" /></div>
          <div>
            <h1 className="text-3xl font-display font-bold">Devenir conducteur MSN VTC</h1>
            <p className="text-muted-foreground text-sm">Soumettez votre candidature, l'administrateur validera votre dossier.</p>
          </div>
        </div>

        {existing && existing.status === "pending" && (
          <div className="bg-amber-500/10 border border-amber-500/40 rounded-2xl p-6 mb-6">
            <h2 className="font-bold mb-1">Candidature en cours d'examen</h2>
            <p className="text-sm">Soumise le {new Date(existing.created_at).toLocaleDateString("fr-FR")}. Un administrateur vous répondra sous peu.</p>
          </div>
        )}

        {existing && existing.status === "approved" && (
          <div className="bg-green-500/10 border border-green-500/40 rounded-2xl p-6 mb-6 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="font-bold flex items-center gap-2"><CheckCircle2 className="size-5 text-green-600" /> Candidature approuvée !</h2>
              <p className="text-sm">Accédez à votre espace conducteur pour commencer à recevoir des courses.</p>
            </div>
            <Button asChild className="bg-gradient-primary"><Link to="/vtc-driver">Mon espace chauffeur</Link></Button>
          </div>
        )}

        {existing && existing.status === "rejected" && (
          <div className="bg-destructive/10 border border-destructive/40 rounded-2xl p-6 mb-6">
            <h2 className="font-bold">Candidature refusée</h2>
            {existing.admin_notes && <p className="text-sm mt-1">Motif : {existing.admin_notes}</p>}
            <p className="text-sm mt-2">Vous pouvez soumettre une nouvelle demande ci-dessous.</p>
          </div>
        )}

        {(!existing || existing.status === "rejected") && (
          <form onSubmit={submit} className="bg-card border border-border rounded-2xl p-6 shadow-soft space-y-5">
            <h2 className="font-bold text-lg">Informations personnelles</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label>Nom et prénom *</Label><Input name="full_name" defaultValue={profile?.full_name || ""} required maxLength={120} /></div>
              <div><Label>Téléphone *</Label><Input name="phone" defaultValue={profile?.phone || ""} required maxLength={20} /></div>
              <div className="sm:col-span-2"><Label>Email *</Label><Input name="email" type="email" defaultValue={user.email || ""} required maxLength={160} /></div>
            </div>

            <h2 className="font-bold text-lg pt-2">Véhicule</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Type *</Label>
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
              <div className="sm:col-span-2"><Label>Marque / modèle</Label><Input name="vehicle_model" maxLength={80} /></div>
            </div>

            <h2 className="font-bold text-lg pt-2">Documents (images)</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <FileField name="vehicle_photo" label="Photo du véhicule" />
              <FileField name="license" label="Permis de conduire" />
              <FileField name="id_recto" label="Pièce d'identité — recto" />
              <FileField name="id_verso" label="Pièce d'identité — verso" />
            </div>

            <Button disabled={submitting} type="submit" className="w-full h-12 bg-gradient-primary shadow-glow">
              {submitting ? <><Loader2 className="size-4 animate-spin mr-1" /> Envoi…</> : "Soumettre ma candidature"}
            </Button>
          </form>
        )}
      </main>
    </div>
  );
}

function FileField({ name, label }: { name: string; label: string }) {
  const [file, setFile] = useState<File | null>(null);
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <div className="mt-1 border-2 border-dashed border-border rounded-xl p-4 hover:border-primary/50 transition cursor-pointer text-center">
        <Upload className="size-5 mx-auto text-muted-foreground mb-1" />
        <span className="text-xs text-muted-foreground">{file ? file.name : "Choisir une image"}</span>
        <input type="file" accept="image/*" name={name} className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
      </div>
    </label>
  );
}
