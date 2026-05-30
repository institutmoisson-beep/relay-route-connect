import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Store, TrendingUp, Shield, Star, Upload, IdCard, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { safeUpload } from "@/lib/storage-upload";

export const Route = createFileRoute("/become-relay")({ component: BecomeRelay });

const schema = z.object({
  space_name: z.string().min(2).max(100),
  space_type: z.enum(["shop","restaurant","maquis","establishment","individual","other"]),
  city: z.string().min(2).max(80),
  neighborhood: z.string().min(2).max(80),
  address: z.string().min(5).max(300),
  phone: z.string().min(8).max(20),
  description: z.string().max(500).optional(),
});

function BecomeRelay() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [idPhoto, setIdPhoto] = useState<File | null>(null);
  const [spacePhoto, setSpacePhoto] = useState<File | null>(null);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) { navigate({ to: "/auth" }); return; }
    if (!idPhoto || !spacePhoto) { toast.error("Téléchargez la photo de la pièce ET de l'espace"); return; }
    const f = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      space_name: f.get("space_name"),
      space_type: f.get("space_type"),
      city: f.get("city"),
      neighborhood: f.get("neighborhood"),
      address: f.get("address"),
      phone: f.get("phone"),
      description: f.get("description") || undefined,
    });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setSubmitting(true);

    const upload = async (file: File, kind: "id" | "space") => {
      const path = `${user.id}/${kind}-${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("relay-applications").upload(path, file);
      if (error) throw error;
      return path;
    };
    let id_photo_url = ""; let space_photo_url = "";
    try {
      [id_photo_url, space_photo_url] = await Promise.all([upload(idPhoto, "id"), upload(spacePhoto, "space")]);
    } catch (e: any) {
      toast.error("Erreur d'upload: " + e.message); setSubmitting(false); return;
    }

    const { error } = await supabase.from("msn_relay_applications").insert({
      user_id: user.id, ...parsed.data, id_photo_url, space_photo_url,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Candidature envoyée ! Réponse sous 48h.");
    navigate({ to: "/dashboard" });
  };

  const FileBox = ({ icon: Icon, label, file, onSet }: any) => (
    <label className="flex items-center gap-3 p-4 border border-dashed border-border rounded-xl cursor-pointer hover:border-primary transition">
      <Icon className="size-5 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground truncate">{file?.name || "Cliquez pour sélectionner"}</div>
      </div>
      <Upload className="size-4 text-muted-foreground" />
      <input type="file" accept="image/*" className="hidden" onChange={e => onSet(e.target.files?.[0] ?? null)} />
    </label>
  );

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="bg-hero text-white py-16 relative overflow-hidden">
        <div className="glow-orb size-[500px] -top-20 -right-10" />
        <div className="container mx-auto px-4 relative">
          <h1 className="text-4xl md:text-5xl font-display font-bold max-w-2xl">Devenez point relais <span className="text-gradient">MSN Delivery</span></h1>
          <p className="opacity-85 mt-4 max-w-xl">Boutique, maquis, restaurant ou particulier — transformez votre espace en source de revenus.</p>
        </div>
      </section>

      <main className="container mx-auto px-4 py-12 grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-soft">
          <h2 className="font-display text-2xl font-bold mb-6">Formulaire de candidature</h2>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label>Nom de l'espace *</Label><Input name="space_name" required maxLength={100} /></div>
              <div>
                <Label>Type d'espace *</Label>
                <Select name="space_type" defaultValue="shop">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="shop">Boutique</SelectItem>
                    <SelectItem value="restaurant">Restaurant</SelectItem>
                    <SelectItem value="maquis">Maquis</SelectItem>
                    <SelectItem value="establishment">Établissement</SelectItem>
                    <SelectItem value="individual">Particulier</SelectItem>
                    <SelectItem value="other">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Ville *</Label><Input name="city" required maxLength={80} placeholder="Abidjan" /></div>
              <div><Label>Quartier *</Label><Input name="neighborhood" required maxLength={80} placeholder="Cocody" /></div>
            </div>
            <div><Label>Adresse complète *</Label><Input name="address" required maxLength={300} /></div>
            <div><Label>Téléphone *</Label><Input name="phone" type="tel" required maxLength={20} /></div>
            <div><Label>Description</Label><Textarea name="description" maxLength={500} placeholder="Présentez votre espace, horaires d'ouverture..." /></div>

            <div className="space-y-3 pt-2">
              <Label>Pièces justificatives *</Label>
              <FileBox icon={IdCard} label="Photo de votre pièce d'identité" file={idPhoto} onSet={setIdPhoto} />
              <FileBox icon={ImageIcon} label="Photo de votre espace" file={spacePhoto} onSet={setSpacePhoto} />
            </div>

            <Button disabled={submitting} className="w-full bg-gradient-primary h-11">{submitting ? "Envoi..." : (user ? "Envoyer ma candidature" : "Se connecter pour postuler")}</Button>
          </form>
        </div>

        <aside className="space-y-4">
          {[
            { icon: TrendingUp, title: "Revenus récurrents", desc: "Commission sur chaque colis remis." },
            { icon: Store, title: "Tous types d'espaces", desc: "Boutique, restaurant, maquis, domicile." },
            { icon: Shield, title: "Validation rapide", desc: "Réponse sous 48h." },
            { icon: Star, title: "Niveau de confiance", desc: "Évoluez de Standard à Premium." },
          ].map((b, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-5 shadow-soft">
              <div className="size-10 rounded-xl bg-gradient-primary grid place-items-center text-primary-foreground mb-3"><b.icon className="size-5" /></div>
              <h3 className="font-bold">{b.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{b.desc}</p>
            </div>
          ))}
        </aside>
      </main>
      <SiteFooter />
    </div>
  );
}
