import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Package, MapPin, Wallet, Shield, Truck, Star, Sparkles, Store, Clock, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import heroImg from "@/assets/hero-delivery.jpg";
import relayImg from "@/assets/relay-owner.jpg";
import appImg from "@/assets/app-mockup.jpg";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden bg-hero text-white">
        <div className="glow-orb size-[600px] -top-40 -right-20" />
        <div className="container mx-auto px-4 py-20 md:py-32 grid lg:grid-cols-2 gap-12 items-center relative">
          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/20 text-sm">
              <Sparkles className="size-4 text-primary" /> Livraison nouvelle génération
            </div>
            <h1 className="text-5xl md:text-7xl font-display font-bold leading-[1.05]">
              La <span className="text-gradient">révolution</span> de la livraison commence ici.
            </h1>
            <p className="text-lg md:text-xl opacity-85 max-w-xl">
              MSN Delivery transforme chaque boutique, maquis, restaurant ou domicile en point relais. Commandez, recevez, gagnez — partout en Côte d'Ivoire.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button asChild size="lg" className="bg-gradient-primary shadow-glow hover:opacity-95 text-base h-14 px-7">
                <Link to="/auth">Commander maintenant <ArrowRight className="ml-1" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="bg-white/5 backdrop-blur border-white/30 text-white hover:bg-white/15 h-14 px-7">
                <Link to="/become-relay">Devenir relais & gagner</Link>
              </Button>
            </div>
            <div className="flex items-center gap-6 pt-4 text-sm opacity-80">
              <div><span className="block text-2xl font-bold text-primary">500+</span> Points relais</div>
              <div className="h-10 w-px bg-white/20" />
              <div><span className="block text-2xl font-bold text-primary">12k+</span> Livraisons</div>
              <div className="h-10 w-px bg-white/20" />
              <div><span className="block text-2xl font-bold text-primary">4.8★</span> Satisfaction</div>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-primary opacity-30 blur-3xl rounded-3xl" />
            <img
              src={heroImg}
              alt="Livreur MSN Delivery à Abidjan"
              width={1920}
              height={1080}
              className="relative rounded-3xl shadow-elegant ring-1 ring-white/10"
            />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="container mx-auto px-4 py-24">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-primary font-semibold uppercase tracking-widest text-sm">Simple & rapide</p>
          <h2 className="text-4xl md:text-5xl font-display font-bold mt-3">Comment ça marche</h2>
          <p className="text-muted-foreground mt-4">Trois étapes pour vous faire livrer ou pour ouvrir votre relais.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Package, title: "1. Passez votre commande", desc: "Photo ou code de commande, infos du fournisseur, paiement direct ou via MSN." },
            { icon: MapPin, title: "2. Choisissez votre relais", desc: "Une boutique, un maquis, un restaurant près de chez vous." },
            { icon: Truck, title: "3. Récupérez votre colis", desc: "Notification dès l'arrivée. Tarif calculé automatiquement selon distance & conditions." },
          ].map((s, i) => (
            <div key={i} className="group p-8 rounded-3xl bg-card border border-border shadow-soft hover:shadow-elegant transition-all hover:-translate-y-1">
              <div className="size-14 rounded-2xl bg-gradient-primary grid place-items-center text-primary-foreground mb-5 group-hover:scale-110 transition-transform">
                <s.icon className="size-7" />
              </div>
              <h3 className="text-xl font-bold mb-2">{s.title}</h3>
              <p className="text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* BECOME RELAY — money story */}
      <section className="bg-secondary text-secondary-foreground py-24 relative overflow-hidden">
        <div className="glow-orb size-[500px] -left-40 top-20" />
        <div className="container mx-auto px-4 grid lg:grid-cols-2 gap-14 items-center relative">
          <div>
            <img src={relayImg} alt="Propriétaire d'un point relais" loading="lazy" width={1024} height={1024} className="rounded-3xl shadow-elegant ring-1 ring-white/10" />
          </div>
          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/20 text-primary text-sm font-medium">
              <TrendingUp className="size-4" /> Opportunité business
            </div>
            <h2 className="text-4xl md:text-5xl font-display font-bold">
              Transformez votre espace en <span className="text-gradient">source de revenus</span>.
            </h2>
            <p className="text-lg opacity-85">
              Boutique, restaurant, maquis, établissement, ou simplement votre domicile — tout espace de confiance peut devenir un point relais MSN. Chaque colis remis = des revenus garantis.
            </p>
            <ul className="space-y-3">
              {[
                "Commission sur chaque colis livré",
                "Tableau de bord moderne en temps réel",
                "Niveau de confiance valorisé (Standard, Vérifié, Premium)",
                "Visibilité auprès de milliers d'utilisateurs",
              ].map((b, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="size-6 rounded-full bg-primary grid place-items-center shrink-0 mt-0.5">
                    <Star className="size-3.5 text-primary-foreground" />
                  </div>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <Button asChild size="lg" className="bg-gradient-primary shadow-glow h-14 px-7">
              <Link to="/become-relay">Postuler maintenant <ArrowRight className="ml-1" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="container mx-auto px-4 py-24">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-primary font-semibold uppercase tracking-widest text-sm">Pensé pour l'Afrique moderne</p>
          <h2 className="text-4xl md:text-5xl font-display font-bold mt-3">Une plateforme complète</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { icon: Wallet, title: "Portefeuille rechargeable", desc: "Orange Money, Moov, MTN, Wave. Rechargement validé sous 24h." },
            { icon: Clock, title: "Tarif dynamique", desc: "Calcul automatique : distance, jour férié, pluie, grève, week-end." },
            { icon: Shield, title: "Niveaux de confiance", desc: "Chaque relais est noté et certifié. Sécurité maximale pour vos colis." },
            { icon: Store, title: "Multi-fournisseurs", desc: "E-commerce, restaurant, boutique, marché — un seul point de retrait." },
            { icon: Star, title: "Notation transparente", desc: "Notez vos relais. La communauté garde la qualité au sommet." },
            { icon: Truck, title: "Suivi en temps réel", desc: "En attente → Ramassé → Au relais → Livré. Vous savez tout." },
          ].map((f, i) => (
            <div key={i} className="p-6 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all">
              <div className="size-11 rounded-xl bg-accent grid place-items-center text-bronze mb-4">
                <f.icon className="size-5" />
              </div>
              <h3 className="font-bold text-lg mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 pb-24">
        <div className="relative overflow-hidden rounded-3xl bg-hero text-white p-12 md:p-20 shadow-elegant">
          <div className="glow-orb size-[400px] -right-20 -top-20" />
          <div className="grid lg:grid-cols-2 gap-10 items-center relative">
            <div>
              <h2 className="text-4xl md:text-5xl font-display font-bold leading-tight">
                Prêt à rejoindre la <span className="text-gradient">révolution</span> ?
              </h2>
              <p className="mt-4 opacity-85 text-lg">Créez votre compte gratuit et commandez votre première livraison en moins de 2 minutes.</p>
              <div className="mt-7 flex flex-wrap gap-4">
                <Button asChild size="lg" className="bg-gradient-primary shadow-glow h-14 px-7"><Link to="/auth">Créer mon compte</Link></Button>
                <Button asChild size="lg" variant="outline" className="bg-white/5 border-white/30 text-white hover:bg-white/15 h-14 px-7"><Link to="/relay-points">Voir les relais</Link></Button>
              </div>
            </div>
            <img src={appImg} alt="Application MSN Delivery" loading="lazy" width={1024} height={1024} className="rounded-2xl ring-1 ring-white/10 max-h-[400px] object-cover" />
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
