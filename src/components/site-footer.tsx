import { Link } from "@tanstack/react-router";
import { Package } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="bg-secondary text-secondary-foreground mt-24">
      <div className="container mx-auto px-4 py-14 grid gap-10 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="size-9 rounded-xl bg-gradient-primary grid place-items-center">
              <Package className="size-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-lg">MSN Delivery</span>
          </div>
          <p className="text-sm opacity-75">La livraison collaborative qui transforme chaque espace en point relais.</p>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider opacity-80">Plateforme</h4>
          <ul className="space-y-2 text-sm opacity-75">
            <li><Link to="/">Comment ça marche</Link></li>
            <li><Link to="/relay-points">Trouver un relais</Link></li>
            <li><Link to="/become-relay">Devenir partenaire</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider opacity-80">Compte</h4>
          <ul className="space-y-2 text-sm opacity-75">
            <li><Link to="/auth">Connexion</Link></li>
            <li><Link to="/dashboard">Mon espace</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider opacity-80">Contact</h4>
          <ul className="space-y-2 text-sm opacity-75">
            <li>Abidjan, Côte d'Ivoire</li>
            <li>contact@msn-delivery.ci</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-6 text-center text-xs opacity-60">
        © {new Date().getFullYear()} MSN Delivery — Tous droits réservés.
      </div>
    </footer>
  );
}
