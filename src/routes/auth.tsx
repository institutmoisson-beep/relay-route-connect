import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { z } from "zod";
import { Package } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { MathCaptcha } from "@/components/math-captcha";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

const signupSchema = z.object({
  full_name: z.string().min(2, "Nom requis").max(80),
  phone: z.string().min(8, "Téléphone invalide").max(20),
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Au moins 6 caractères").max(72),
});
const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

// Anti-bruteforce: gel local du formulaire après 5 essais ratés.
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 60_000;
const STORAGE_KEY = "msn_auth_attempts";

type AttemptsState = { count: number; lockedUntil: number };

function readAttempts(): AttemptsState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { count: 0, lockedUntil: 0 };
    return JSON.parse(raw) as AttemptsState;
  } catch { return { count: 0, lockedUntil: 0 }; }
}
function writeAttempts(s: AttemptsState) {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* noop */ }
}

function AuthPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [captchaOk, setCaptchaOk] = useState(false);
  const [lockRemaining, setLockRemaining] = useState(0);
  const onCaptchaChange = useCallback((ok: boolean) => setCaptchaOk(ok), []);

  useEffect(() => {
    if (user) navigate({ to: "/dashboard", replace: true });
  }, [user, navigate]);

  // Tick lockout timer
  useEffect(() => {
    const tick = () => {
      const { lockedUntil } = readAttempts();
      const remaining = Math.max(0, lockedUntil - Date.now());
      setLockRemaining(Math.ceil(remaining / 1000));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const state = readAttempts();
    if (state.lockedUntil > Date.now()) {
      toast.error("Trop de tentatives. Réessayez dans quelques instants.");
      return;
    }
    if (!captchaOk) { toast.error("Résolvez le défi anti-robot"); return; }
    const form = new FormData(e.currentTarget);
    const parsed = loginSchema.safeParse({ email: form.get("email"), password: form.get("password") });
    // Generic error: never reveal which field is wrong, never reveal account existence.
    if (!parsed.success) { toast.error("Identifiants invalides"); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setLoading(false);
    if (error) {
      const next: AttemptsState = { count: state.count + 1, lockedUntil: 0 };
      if (next.count >= MAX_ATTEMPTS) { next.lockedUntil = Date.now() + LOCKOUT_MS; next.count = 0; }
      writeAttempts(next);
      toast.error("Identifiants invalides");
      return;
    }
    writeAttempts({ count: 0, lockedUntil: 0 });
    toast.success("Bienvenue !");
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!captchaOk) { toast.error("Résolvez le défi anti-robot"); return; }
    const form = new FormData(e.currentTarget);
    const parsed = signupSchema.safeParse({
      full_name: form.get("full_name"),
      phone: form.get("phone"),
      email: form.get("email"),
      password: form.get("password"),
    });
    if (!parsed.success) { toast.error("Informations invalides"); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: parsed.data.full_name, phone: parsed.data.phone },
      },
    });
    setLoading(false);
    // Generic message — do not reveal whether the email is already taken.
    if (error) { toast.error("Impossible de créer le compte"); return; }
    toast.success("Compte créé !");
  };

  return (
    <div className="min-h-screen bg-hero text-white grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden">
        <div className="glow-orb size-[500px] -top-40 -left-20" />
        <div className="flex items-center gap-2 relative">
          <div className="size-10 rounded-xl bg-gradient-primary grid place-items-center shadow-glow">
            <Package className="size-5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-display font-bold text-xl">MSN Delivery</div>
            <div className="text-xs opacity-70 uppercase tracking-widest">Côte d'Ivoire</div>
          </div>
        </div>
        <div className="space-y-4 relative">
          <h2 className="text-4xl font-display font-bold leading-tight">La livraison <span className="text-gradient">collaborative</span> à portée de clic.</h2>
          <p className="opacity-80">Rejoignez des milliers d'utilisateurs et de points relais à travers la Côte d'Ivoire.</p>
        </div>
        <div className="text-sm opacity-60 relative">© {new Date().getFullYear()} MSN Delivery</div>
      </div>

      <div className="flex items-center justify-center p-6 bg-background text-foreground">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-display font-bold mb-2">Bienvenue</h1>
          <p className="text-muted-foreground mb-8">Connectez-vous ou créez votre compte.</p>

          <Tabs defaultValue="login">
            <TabsList className="grid grid-cols-2 mb-6 w-full">
              <TabsTrigger value="login">Connexion</TabsTrigger>
              <TabsTrigger value="signup">Inscription</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" required autoComplete="email" /></div>
                <div><Label htmlFor="password">Mot de passe</Label><Input id="password" name="password" type="password" required autoComplete="current-password" /></div>
                <MathCaptcha onValidChange={onCaptchaChange} />
                {lockRemaining > 0 && (
                  <p className="text-sm text-destructive text-center">Formulaire gelé — réessayez dans {lockRemaining}s.</p>
                )}
                <Button disabled={loading || lockRemaining > 0} className="w-full bg-gradient-primary h-11">{loading ? "..." : lockRemaining > 0 ? `Verrouillé (${lockRemaining}s)` : "Se connecter"}</Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div><Label htmlFor="su_name">Nom complet</Label><Input id="su_name" name="full_name" required /></div>
                <div><Label htmlFor="su_phone">Téléphone</Label><Input id="su_phone" name="phone" type="tel" placeholder="+225 ..." required /></div>
                <div><Label htmlFor="su_email">Email</Label><Input id="su_email" name="email" type="email" required /></div>
                <div><Label htmlFor="su_pwd">Mot de passe</Label><Input id="su_pwd" name="password" type="password" required minLength={6} /></div>
                <MathCaptcha onValidChange={onCaptchaChange} />
                <Button disabled={loading} className="w-full bg-gradient-primary h-11">{loading ? "..." : "Créer mon compte"}</Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
