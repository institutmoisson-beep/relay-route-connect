import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScanLine, Keyboard, X } from "lucide-react";

/**
 * Scanner code-barres réutilisable : caméra (@zxing/browser) + saisie manuelle
 * compatible douchette USB/Bluetooth (enter envoie le code).
 */
export function BarcodeScanner({
  open,
  onClose,
  onCode,
}: {
  open: boolean;
  onClose: () => void;
  onCode: (code: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [mode, setMode] = useState<"camera" | "manual">("camera");
  const [manual, setManual] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open || mode !== "camera") return;
    let cancelled = false;
    const reader = new BrowserMultiFormatReader();
    (async () => {
      try {
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        const back = devices.find((d) => /back|rear|environment/i.test(d.label)) || devices[0];
        if (!back) { setErr("Aucune caméra détectée"); return; }
        if (!videoRef.current) return;
        const controls = await reader.decodeFromVideoDevice(back.deviceId, videoRef.current, (result) => {
          if (cancelled) return;
          if (result) {
            onCode(result.getText());
            controls.stop();
            onClose();
          }
        });
        controlsRef.current = controls;
      } catch (e: any) {
        setErr(e?.message || "Caméra inaccessible");
      }
    })();
    return () => {
      cancelled = true;
      try { controlsRef.current?.stop(); } catch { /* */ }
    };
  }, [open, mode, onCode, onClose]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ScanLine className="size-5" /> Scanner un code</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <Button size="sm" variant={mode === "camera" ? "default" : "outline"} onClick={() => setMode("camera")}>
            <ScanLine className="size-4 mr-1" /> Caméra
          </Button>
          <Button size="sm" variant={mode === "manual" ? "default" : "outline"} onClick={() => setMode("manual")}>
            <Keyboard className="size-4 mr-1" /> Saisie / Douchette
          </Button>
        </div>

        {mode === "camera" && (
          <div className="space-y-2">
            <div className="rounded-xl overflow-hidden bg-black aspect-video relative">
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
              <div className="absolute inset-x-6 inset-y-12 border-2 border-primary/70 rounded-lg pointer-events-none" />
            </div>
            {err && <p className="text-xs text-destructive">{err}</p>}
            <p className="text-xs text-muted-foreground">Placez le code-barres dans le cadre.</p>
          </div>
        )}

        {mode === "manual" && (
          <form onSubmit={(e) => { e.preventDefault(); const c = manual.trim(); if (c) { onCode(c); setManual(""); onClose(); } }} className="space-y-2">
            <Input autoFocus value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Code-barres ou SKU" />
            <Button type="submit" className="w-full">Valider</Button>
            <p className="text-xs text-muted-foreground">Compatible douchette : laissez le champ actif et scannez, l'envoi est automatique.</p>
          </form>
        )}

        <Button variant="ghost" size="sm" onClick={onClose}><X className="size-4 mr-1" /> Fermer</Button>
      </DialogContent>
    </Dialog>
  );
}
