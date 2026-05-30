import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sprout, ArrowRight, TrendingUp, Shield, Package, Store, CheckCircle2, Upload } from "lucide-react";
import { z } from "zod";
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
import { compressImage } from "@/lib/image-compress";
import graineLogo from "@/assets/graine-logo.png";

export const Route = createFileRoute("/franchise")({ component: FranchisePage });

const schema = z.object({
  shop_name: z.string().min(2).max(120),
  shop_type: z.string().min(2).max(60),
  city: z.string().min(2).max(80),
  neighborhood: z.string().min(2).max(80),
  address: z.string().min(5).max(300),
  phone: z.string().min(6).max(20),
  monthly_revenue: z.number().min(0).max(1000000000).optional(),
  description: z.string().max(800).optional(),
});

function FranchisePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [idPhoto, setIdPhoto] = useState<File | null>(null);
  const [shopPhoto, setShopPhoto] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const { data: products } = useQuery({
    queryKey: ["graine-products"],
    queryFn: async () => (await supabase.from("graine_products").select("*").eq("is_active", true).order("created_at",{ascending:false})).data ?? [],
  });

  const toggle = (id: string) => setSelectedIds(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) { navigate({ to: "/auth" }); return; }
    if (selectedIds.length === 0) { toast.error("Sélectionnez au moins un produit à vendre"); return; }
    const f = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      shop_name: f.get("shop_name"),
      shop_type: f.get("shop_type"),
      city: f.get("city"),
      neighborhood: f.get("neighborhood"),
      address: f.get("address"),
      phone: f.get("phone"),
      monthly_revenue: f.get("monthly_revenue") ? Number(f.get("monthly_revenue")) : undefined,
      description: f.get("description") || undefined,
    });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setSubmitting(true);

    let owner_id_url: string | null = null;
    let shop_photo_url: string | null = null;
    try {
      if (idPhoto) owner_id_url = await safeUpload("graine-applications", `${user.id}/id`, idPhoto);
      if (shopPhoto) shop_photo_url = await safeUpload("graine-applications", `${user.id}/shop`, shopPhoto);
    } catch (e: any) {
      toast.error("Upload échoué : " + (e?.message || e)); setSubmitting(false); return;
    }

    const { error } = await supabase.from("graine_franchise_applications").insert({
      user_id: user.id,
      ...parsed.data,
      owner_id_url,
      shop_photo_url,
      selected_product_ids: selectedIds,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Candidature envoyée ! L'administrateur vous répondra rapidement.");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden bg-hero text-white py-20">
        <div className="glow-orb size-[500px] -top-20 -right-10" />
        <div className="container mx-auto px-4 relative grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/20 text-sm">
              <Sprout className="size-4 text-primary" /> Institut Moisson
            </div>
            <h1 className="text-5xl md:text-7xl font-display font-bold leading-[1.05]">
              Devenez <span className="text-gradient">franchisé</span> La Graine.
            </h1>
            <p className="text-lg opacity-85 max-w-xl">
              Transformez votre boutique, cave, supérette ou espace de quartier en franchise « La Graine ». Nous relookons votre enseigne, fournissons du matériel de dernière génération — vous vous engagez à 80% d'approvisionnement chez nous.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button size="lg" onClick={() => { setShowForm(true); document.getElementById("apply")?.scrollIntoView({ behavior: "smooth" }); }} className="bg-gradient-primary shadow-glow h-14 px-7">
                Postuler maintenant <ArrowRight className="ml-1" />
              </Button>
              <Button asChild size="lg" variant="outline" className="bg-white/5 border-white/30 text-white hover:bg-white/15 h-14 px-7">
                <a href="#catalog">Voir le catalogue</a>
              </Button>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-primary opacity-30 blur-3xl rounded-full" />
            <img src={graineLogo} alt="La Graine — logo cacao" width={512} height={512} className="relative w-72 mx-auto drop-shadow-2xl" />
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-primary font-semibold uppercase tracking-widest text-sm">Un partenariat gagnant</p>
          <h2 className="text-4xl md:text-5xl font-display font-bold mt-3">Ce que vous gagnez</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Store, title: "Enseigne relookée", desc: "Nous habillons votre boutique aux normes La Graine : visuels, mobilier, signalétique." },
            { icon: Package, title: "Matériel dernière génération", desc: "Caisses, étagères, vitrines fournies par Institut Moisson." },
            { icon: TrendingUp, title: "Marges optimisées", desc: "Approvisionnement direct à prix préférentiels grâce à notre centrale d'achat." },
            { icon: Shield, title: "Contrat sécurisé", desc: "Contrat de franchise officiel signé numériquement par l'administrateur général." },
            { icon: Sprout, title: "Marque reconnue", desc: "Bénéficiez de la notoriété nationale et de la confiance de la marque La Graine." },
            { icon: CheckCircle2, title: "Formation incluse", desc: "Nous formons votre équipe à la gestion La Graine et aux outils modernes." },
          ].map((b, i) => (
            <div key={i} className="p-6 rounded-2xl bg-card border border-border hover:border-primary/40 transition">
              <div className="size-11 rounded-xl bg-gradient-bronze text-bronze-foreground grid place-items-center mb-4"><b.icon className="size-5" /></div>
              <h3 className="font-bold mb-1">{b.title}</h3>
              <p className="text-sm text-muted-foreground">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CATALOG */}
      <section id="catalog" className="bg-muted/40 py-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-primary font-semibold uppercase tracking-widest text-sm">Catalogue</p>
              <h2 className="text-4xl font-display font-bold mt-2">Produits La Graine</h2>
              <p className="text-muted-foreground mt-2">Sélectionnez ceux que vous souhaitez vendre dans votre franchise.</p>
            </div>
            {selectedIds.length > 0 && (
              <div className="bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-bold">{selectedIds.length} produit(s) sélectionné(s)</div>
            )}
          </div>
          {!products?.length ? (
            <div className="p-12 bg-card border rounded-2xl text-center">
              <Sprout className="size-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Le catalogue sera bientôt enrichi par l'administrateur.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {products.map(p => {
                const sel = selectedIds.includes(p.id);
                return (
                  <div key={p.id} className={`bg-card rounded-2xl border-2 overflow-hidden transition ${sel ? "border-primary shadow-glow" : "border-border"}`}>
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} loading="lazy" width={400} height={300} className="aspect-[4/3] w-full object-cover" />
                    ) : (
                      <div className="aspect-[4/3] w-full bg-accent grid place-items-center text-bronze"><Sprout className="size-12" /></div>
                    )}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-bold text-sm leading-tight">{p.name}</h3>
                        <div className="font-bold text-primary text-sm whitespace-nowrap">{Number(p.price).toLocaleString("fr-FR")} F</div>
                      </div>
                      {p.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{p.description}</p>}
                      <Button size="sm" variant={sel ? "default" : "outline"} className={`w-full ${sel ? "bg-gradient-primary" : ""}`} onClick={() => { toggle(p.id); if (!showForm) setShowForm(true); }}>
                        {sel ? <><CheckCircle2 className="size-3 mr-1" />Sélectionné</> : "Ajouter"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* APPLY FORM */}
      <section id="apply" className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto bg-card border border-border rounded-2xl p-8 shadow-soft">
          <h2 className="text-3xl font-display font-bold mb-2">Candidature franchise</h2>
          <p className="text-muted-foreground mb-6">Tous les utilisateurs peuvent postuler. L'administrateur examine et valide.</p>

          {!user ? (
            <div className="p-6 bg-accent rounded-xl text-center">
              <p className="text-sm mb-3">Connectez-vous pour postuler.</p>
              <Button asChild className="bg-gradient-primary"><Link to="/auth">Se connecter</Link></Button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div><Label>Nom de la boutique *</Label><Input name="shop_name" required maxLength={120} /></div>
                <div>
                  <Label>Type *</Label>
                  <Select name="shop_type" defaultValue="Boutique">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Boutique","Cave","Supérette","Espace commercial","Restaurant","Autre"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Ville *</Label><Input name="city" required maxLength={80} /></div>
                <div><Label>Quartier *</Label><Input name="neighborhood" required maxLength={80} /></div>
              </div>
              <div><Label>Adresse complète *</Label><Input name="address" required maxLength={300} /></div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div><Label>Téléphone *</Label><Input name="phone" type="tel" required maxLength={20} /></div>
                <div><Label>Chiffre d'affaires mensuel (FCFA)</Label><Input name="monthly_revenue" type="number" min={0} /></div>
              </div>
              <div><Label>Présentation</Label><Textarea name="description" maxLength={800} placeholder="Présentez votre activité actuelle, votre clientèle, vos motivations..." rows={4} /></div>

              <div className="space-y-3 pt-2">
                <Label>Documents</Label>
                <label className="flex items-center gap-3 p-4 border border-dashed rounded-xl cursor-pointer hover:border-primary">
                  <Upload className="size-4 text-muted-foreground" />
                  <div className="flex-1"><div className="text-sm font-medium">Pièce d'identité</div><div className="text-xs text-muted-foreground truncate">{idPhoto?.name || "Optionnel"}</div></div>
                  <input type="file" accept="image/*" className="hidden" onChange={e => setIdPhoto(e.target.files?.[0] ?? null)} />
                </label>
                <label className="flex items-center gap-3 p-4 border border-dashed rounded-xl cursor-pointer hover:border-primary">
                  <Upload className="size-4 text-muted-foreground" />
                  <div className="flex-1"><div className="text-sm font-medium">Photo de la boutique</div><div className="text-xs text-muted-foreground truncate">{shopPhoto?.name || "Recommandé"}</div></div>
                  <input type="file" accept="image/*" className="hidden" onChange={e => setShopPhoto(e.target.files?.[0] ?? null)} />
                </label>
              </div>

              <div className="rounded-xl bg-accent/50 p-3 text-sm">
                <strong>{selectedIds.length}</strong> produit(s) sélectionné(s) dans le catalogue.
              </div>

              <Button disabled={submitting} className="w-full bg-gradient-primary h-12">{submitting ? "Envoi..." : "Envoyer ma candidature"}</Button>
            </form>
          )}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
