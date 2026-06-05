import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Receipt, ArrowLeft, Search, Calendar, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { getMyFranchise, fcfa } from "@/lib/franchise-helpers";

const sb = supabase as any;

export const Route = createFileRoute("/franchise/sales")({ component: SalesPage });

type Sale = { id: string; receipt_code: string; total_amount: number; payment_method: string; customer_phone: string | null; created_at: string };

function SalesPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [franchise, setFranchise] = useState<{ id: string; shop_name: string } | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth", replace: true }); }, [user, loading, navigate]);
  useEffect(() => { if (user) getMyFranchise(user.id).then((f) => setFranchise(f as any)); }, [user]);

  const { data: sales = [] } = useQuery<Sale[]>({
    queryKey: ["sales", franchise?.id, from, to],
    enabled: !!franchise,
    queryFn: async () => {
      let q = sb.from("graine_sales").select("id, receipt_code, total_amount, payment_method, customer_phone, created_at")
        .eq("franchise_id", franchise!.id).order("created_at", { ascending: false }).limit(500);
      if (from) q = q.gte("created_at", from);
      if (to) q = q.lte("created_at", to + "T23:59:59");
      return (await q).data ?? [];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sales;
    return sales.filter((s) =>
      s.receipt_code.toLowerCase().includes(q) ||
      (s.customer_phone || "").includes(q) ||
      s.payment_method.includes(q)
    );
  }, [sales, search]);

  const totalShown = filtered.reduce((s, x) => s + x.total_amount, 0);

  const exportCsv = () => {
    const rows = [["Reçu", "Date", "Montant", "Paiement", "Téléphone client"]];
    filtered.forEach((s) => rows.push([s.receipt_code, new Date(s.created_at).toISOString(), String(s.total_amount), s.payment_method, s.customer_phone || ""]));
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `ventes-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (!user || !franchise) return <div className="min-h-screen bg-muted/30"><SiteHeader /></div>;

  return (
    <div className="min-h-screen bg-muted/30">
      <SiteHeader />
      <main className="container mx-auto px-4 py-6 max-w-6xl">
        <Link to="/franchise/stock" className="text-xs text-muted-foreground inline-flex items-center gap-1"><ArrowLeft className="size-3" /> Stock</Link>
        <div className="flex items-end justify-between flex-wrap gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2"><Receipt className="size-6 text-primary" /> Historique des ventes</h1>
            <p className="text-sm text-muted-foreground">{filtered.length} ventes · Total : <span className="font-bold text-primary">{fcfa(totalShown)}</span></p>
          </div>
          <Button variant="outline" onClick={exportCsv}><Download className="size-4 mr-1" /> Exporter CSV</Button>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-soft mb-4 grid sm:grid-cols-4 gap-3">
          <div><Label className="text-xs flex items-center gap-1"><Calendar className="size-3" /> Du</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><Label className="text-xs flex items-center gap-1"><Calendar className="size-3" /> Au</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div className="sm:col-span-2"><Label className="text-xs flex items-center gap-1"><Search className="size-3" /> Recherche</Label><Input placeholder="N° reçu, téléphone, mode de paiement" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        </div>

        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-soft">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr><th className="p-3">Reçu</th><th className="p-3">Date</th><th className="p-3">Paiement</th><th className="p-3">Client</th><th className="p-3 text-right">Montant</th></tr>
              </thead>
              <tbody>
                {filtered.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Aucune vente</td></tr>}
                {filtered.map((s) => (
                  <tr key={s.id} className="border-t border-border hover:bg-muted/20">
                    <td className="p-3 font-mono text-xs">{s.receipt_code}</td>
                    <td className="p-3">{new Date(s.created_at).toLocaleString("fr-FR")}</td>
                    <td className="p-3 capitalize">{s.payment_method}</td>
                    <td className="p-3">{s.customer_phone || "—"}</td>
                    <td className="p-3 text-right font-bold text-primary">{fcfa(s.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
