import { Link } from "@tanstack/react-router";
import { Package, Menu, X, Shield, Inbox, Sprout } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

export function SiteHeader() {
  const { user, signOut, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="size-9 rounded-xl bg-gradient-primary grid place-items-center shadow-glow group-hover:scale-105 transition-transform">
            <Package className="size-5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div className="leading-none">
            <div className="font-display font-bold text-lg tracking-tight">MSN <span className="text-primary">Delivery</span></div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Côte d'Ivoire</div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
          <Link to="/" className="hover:text-primary transition-colors">Accueil</Link>
          <Link to="/become-relay" className="hover:text-primary transition-colors">Devenir relais</Link>
          <Link to="/relay-points" className="hover:text-primary transition-colors">Points relais</Link>
          <Link to="/franchise" className="hover:text-primary transition-colors flex items-center gap-1"><Sprout className="size-4" />La Graine</Link>
          {user && <Link to="/dashboard" className="hover:text-primary transition-colors">Tableau de bord</Link>}
          {user && <Link to="/inbox" className="hover:text-primary transition-colors flex items-center gap-1"><Inbox className="size-4" />Canal</Link>}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              {isAdmin && (
                <Button asChild variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                  <Link to="/admin"><Shield className="size-4" />Admin</Link>
                </Button>
              )}
              <Button asChild variant="ghost"><Link to="/dashboard">Mon espace</Link></Button>
              <Button onClick={signOut} variant="outline">Déconnexion</Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost"><Link to="/auth">Connexion</Link></Button>
              <Button asChild className="bg-gradient-primary shadow-glow hover:opacity-90"><Link to="/auth">Commencer</Link></Button>
            </>
          )}
        </div>

        <button className="md:hidden p-2" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? <X /> : <Menu />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl">
          <div className="container mx-auto px-4 py-4 flex flex-col gap-3">
            <Link to="/" onClick={() => setOpen(false)} className="py-2">Accueil</Link>
            <Link to="/become-relay" onClick={() => setOpen(false)} className="py-2">Devenir relais</Link>
            <Link to="/relay-points" onClick={() => setOpen(false)} className="py-2">Points relais</Link>
            <Link to="/franchise" onClick={() => setOpen(false)} className="py-2 flex items-center gap-1"><Sprout className="size-4" />La Graine</Link>
            {user ? (
              <>
                <Link to="/dashboard" onClick={() => setOpen(false)} className="py-2">Tableau de bord</Link>
                <Link to="/inbox" onClick={() => setOpen(false)} className="py-2 flex items-center gap-1"><Inbox className="size-4" />Boîte canal</Link>
                {isAdmin && <Link to="/admin" onClick={() => setOpen(false)} className="py-2 flex items-center gap-1 text-primary font-semibold"><Shield className="size-4" />Administration</Link>}
                <Button onClick={() => { signOut(); setOpen(false); }} variant="outline">Déconnexion</Button>
              </>
            ) : (
              <Button asChild className="bg-gradient-primary"><Link to="/auth" onClick={() => setOpen(false)}>Commencer</Link></Button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
