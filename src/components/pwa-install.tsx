import { useEffect, useState } from "react";
import { Download, X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function PWAInstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissedAt = Number(localStorage.getItem("msn-pwa-dismissed") || 0);
    if (Date.now() - dismissedAt < 1000 * 60 * 60 * 24 * 7) return;
    const installed = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone;
    if (installed) return;

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onBIP);

    // iOS Safari has no beforeinstallprompt — show manual hint after 4s
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (isIOS && isSafari) {
      const t = setTimeout(() => { setIosHint(true); setVisible(true); }, 4000);
      return () => { clearTimeout(t); window.removeEventListener("beforeinstallprompt", onBIP); };
    }
    return () => window.removeEventListener("beforeinstallprompt", onBIP);
  }, []);

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null); setVisible(false);
    localStorage.setItem("msn-pwa-dismissed", String(Date.now()));
  };

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem("msn-pwa-dismissed", String(Date.now()));
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-[100] bg-card border border-border rounded-2xl shadow-elegant p-4 animate-in slide-in-from-bottom-5">
      <button onClick={dismiss} className="absolute top-2 right-2 p-1 hover:bg-accent rounded-full" aria-label="Fermer"><X className="size-4" /></button>
      <div className="flex items-start gap-3">
        <div className="size-11 rounded-xl bg-gradient-primary grid place-items-center text-primary-foreground shrink-0">
          {iosHint ? <Smartphone className="size-5" /> : <Download className="size-5" />}
        </div>
        <div className="flex-1">
          <p className="font-bold text-sm">Installer MSN Delivery</p>
          {iosHint ? (
            <p className="text-xs text-muted-foreground mt-1">Tapez sur <strong>Partager</strong> puis <strong>« Sur l'écran d'accueil »</strong> pour installer.</p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mt-1 mb-3">Accédez à l'app en 1 clic depuis votre écran d'accueil.</p>
              <Button size="sm" onClick={install} className="bg-gradient-primary h-8 text-xs">Installer maintenant</Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
