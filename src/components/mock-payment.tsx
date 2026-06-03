import { useState } from "react";
import { CreditCard, Smartphone, Wallet, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type PaymentMethod = "wave" | "orange" | "mtn" | "moov" | "card" | "wallet";

const METHODS: { id: PaymentMethod; label: string; color: string; icon: any }[] = [
  { id: "wallet", label: "Mon portefeuille", color: "from-primary to-primary/70", icon: Wallet },
  { id: "wave", label: "Wave", color: "from-cyan-400 to-blue-600", icon: Smartphone },
  { id: "orange", label: "Orange Money", color: "from-orange-500 to-orange-700", icon: Smartphone },
  { id: "mtn", label: "MTN Mobile Money", color: "from-yellow-400 to-yellow-600", icon: Smartphone },
  { id: "moov", label: "Moov Money", color: "from-blue-500 to-blue-700", icon: Smartphone },
  { id: "card", label: "Carte bancaire", color: "from-zinc-700 to-zinc-900", icon: CreditCard },
];

export function MockPayment({
  amount,
  onConfirm,
  walletBalance = 0,
  disabled,
}: {
  amount: number;
  onConfirm: (method: PaymentMethod, ref: string) => Promise<void> | void;
  walletBalance?: number;
  disabled?: boolean;
}) {
  const [method, setMethod] = useState<PaymentMethod>("wallet");
  const [phone, setPhone] = useState("");
  const [card, setCard] = useState("");
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (method === "wallet" && walletBalance < amount) return;
    if ((method === "wave" || method === "orange" || method === "mtn" || method === "moov") && phone.length < 8) return;
    if (method === "card" && card.replace(/\s/g, "").length < 12) return;
    setProcessing(true);
    // Simulate payment provider latency
    await new Promise(r => setTimeout(r, 1200));
    const ref = method.toUpperCase() + "-" + Date.now().toString(36).toUpperCase();
    await onConfirm(method, ref);
    setProcessing(false);
    setDone(true);
  };

  if (done) {
    return (
      <div className="rounded-2xl p-8 text-center bg-green-500/10 border border-green-500/40">
        <div className="size-16 mx-auto rounded-full bg-green-500 grid place-items-center mb-3"><Check className="size-8 text-white" /></div>
        <h3 className="font-bold text-lg">Paiement confirmé !</h3>
        <p className="text-sm text-muted-foreground mt-1">{amount.toLocaleString("fr-FR")} FCFA traités avec succès.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="mb-2 block">Mode de paiement</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {METHODS.map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMethod(m.id)}
              className={`relative p-3 rounded-xl border-2 transition text-left overflow-hidden ${method === m.id ? "border-primary shadow-glow" : "border-border hover:border-primary/40"}`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${m.color} opacity-10`} />
              <m.icon className="size-5 mb-1 text-primary relative" />
              <div className="text-xs font-semibold relative">{m.label}</div>
              {m.id === "wallet" && (
                <div className="text-[10px] text-muted-foreground relative">Solde: {walletBalance.toLocaleString("fr-FR")} F</div>
              )}
            </button>
          ))}
        </div>
      </div>

      {method === "wallet" && walletBalance < amount && (
        <div className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded p-2">
          Solde insuffisant. Rechargez votre portefeuille ou choisissez un autre mode.
        </div>
      )}

      {(method === "wave" || method === "orange" || method === "mtn" || method === "moov") && (
        <div>
          <Label>Numéro de téléphone</Label>
          <Input value={phone} onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, ""))} placeholder="07 00 00 00 00" maxLength={12} />
        </div>
      )}

      {method === "card" && (
        <div>
          <Label>Numéro de carte</Label>
          <Input value={card} onChange={e => setCard(e.target.value)} placeholder="4242 4242 4242 4242" maxLength={19} />
        </div>
      )}

      <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border">
        <span className="text-sm text-muted-foreground">Montant à payer</span>
        <span className="text-2xl font-bold text-gradient">{amount.toLocaleString("fr-FR")} FCFA</span>
      </div>

      <Button onClick={submit} disabled={disabled || processing} className="w-full h-12 bg-gradient-primary shadow-glow">
        {processing ? <><Loader2 className="size-4 animate-spin mr-1" /> Traitement…</> : `Payer ${amount.toLocaleString("fr-FR")} FCFA`}
      </Button>
      <p className="text-[10px] text-center text-muted-foreground">Simulation passerelle de paiement — Aucune transaction réelle.</p>
    </div>
  );
}
