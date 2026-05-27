import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = { onValidChange: (ok: boolean) => void };

function genChallenge() {
  const a = Math.floor(Math.random() * 10) + 1;
  const b = Math.floor(Math.random() * 10) + 1;
  const op = Math.random() < 0.5 ? "+" : "×";
  const answer = op === "+" ? a + b : a * b;
  return { text: `${a} ${op} ${b}`, answer };
}

export function MathCaptcha({ onValidChange }: Props) {
  const [c, setC] = useState(genChallenge);
  const [v, setV] = useState("");

  useEffect(() => {
    onValidChange(Number(v) === c.answer);
  }, [v, c.answer, onValidChange]);

  const refresh = () => { setC(genChallenge()); setV(""); };

  return (
    <div>
      <Label>Vérification anti-robot</Label>
      <div className="flex items-center gap-2 mt-1">
        <div className="px-4 h-9 rounded-md bg-accent border border-border flex items-center font-mono font-bold text-lg select-none tracking-wider">
          {c.text} = ?
        </div>
        <Input
          type="number"
          value={v}
          onChange={(e) => setV(e.target.value)}
          placeholder="Résultat"
          className="max-w-[120px]"
          required
        />
        <button type="button" onClick={refresh} className="p-2 rounded-md hover:bg-accent" aria-label="Nouveau">
          <RefreshCw className="size-4" />
        </button>
      </div>
    </div>
  );
}
