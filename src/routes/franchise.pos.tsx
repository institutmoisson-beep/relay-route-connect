import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ScanLine, Trash2, ShoppingCart, CreditCard, Loader2, ArrowLeft, Search, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { getMyFranchise, fcfa } from "@/lib/franchise-helpers";

const sb = supabase as any;

export const Route = createFileRoute("/franchise/pos")({ component: PosPage });

type Item = { id: string; name: string; barcode: string | null; sku: string | null; sell_price: number; stock_qty: number; unit: string | null; image_url: string | null };
type CartLine = { item: Item; qty: number };

function PosPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [franchise, setFranchise] = useState<{ id: string; shop_name: string } | null>(null);
  const [search, setSearch] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [payment, setPayment] = useState("cash");
  const [phone, setPhone] = useState("");
  const [paying, setPaying] = useState(false);
  const [receipt, setReceipt] = useState<{ code: string; total: number } | null>(null);

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth", replace: true }); }, [user, loading, navigate]);
  useEffect(() => { if (user) getMyFranchise(user.id).then((f) => setFranchise(f as any)); }, [user]);

  const { data: items = [] } = useQuery<Item[]>({
    queryKey: ["pos-items", franchise?.id],
    enabled: !!franchise,
    queryFn: async () => (await sb.from("graine_stock_items").select("id,name,barcode,sku,sell_price,stock_qty,unit,image_url").eq("franchise_id", franchise!.id).eq("is_active", true).order("name")).data ?? [],
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items.slice(0, 30);
    return items.filter((i) =>
      i.name.toLowerCase().includes(q) ||
      (i.barcode || "").toLowerCase().includes(q) ||
      (i.sku || "").toLowerCase().includes(q)
    ).slice(0, 30);
  }, [items, search]);

  const total = cart.reduce((s, l) => s + l.qty * l.item.sell_price, 0);

  const addToCart = (item: Item) => {
    setCart((c) => {
      const existing = c.find((l) => l.item.id === item.id);
      if (existing) return c.map((l) => l.item.id === item.id ? { ...l, qty: l.qty + 1 } : l);
      return [...c, { item, qty: 1 }];
    });
  };

  const handleCode = (code: string) => {
    const found = items.find((i) => i.barcode === code || i.sku === code);
    if (found) { addToCart(found); toast.success(`Ajouté : ${found.name}`); }
    else { toast.error(`Code introuvable : ${code}`); setSearch(code); }
  };

  const updateQty = (id: string, delta: number) => setCart((c) =>
    c.flatMap((l) => l.item.id === id ? (l.qty + delta <= 0 ? [] : [{ ...l, qty: l.qty + delta }]) : [l])
  );

  const checkout = async () => {
    if (!franchise || !user || cart.length === 0) return;
    setPaying(true);
    try {
      const { data: sale, error } = await sb.from("graine_sales").insert({
        franchise_id: franchise.id,
        cashier_id: user.id,
        total_amount: total,
        payment_method: payment,
        customer_phone: phone || null,
      }).select("id, receipt_code").single();
      if (error) throw error;

      const lines = cart.map((l) => ({
        sale_id: sale.id,
        item_id: l.item.id,
        franchise_id: franchise.id,
        name_snapshot: l.item.name,
        qty: l.qty,
        unit_price: l.item.sell_price,
        subtotal: l.qty * l.item.sell_price,
      }));
      const { error: e2 } = await sb.from("graine_sale_items").insert(lines);
      if (e2) throw e2;

      setReceipt({ code: sale.receipt_code, total });
      setCart([]); setPhone("");
    } catch (e: any) {
      toast.error(e?.message || "Erreur paiement");
    }
    setPaying(false);
  };

  if (!user) return null;
  if (!franchise) {
    return <div className="min-h-screen bg-muted/30"><SiteHeader /><main className="container mx-auto px-4 py-20 text-center"><p>Pas de franchise active.</p></main></div>;
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <SiteHeader />
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="mb-4">
          <Link to="/franchise/stock" className="text-xs text-muted-foreground inline-flex items-center gap-1"><ArrowLeft className="size-3" /> Stock</Link>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2"><ShoppingCart className="size-6 text-primary" /> Caisse — {franchise.shop_name}</h1>
        </div>

        <div className="grid lg:grid-cols-[1fr,360px] gap-4">
          {/* Catalogue */}
          <section className="bg-card border border-border rounded-2xl p-4 shadow-soft">
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Nom / code / SKU (douchette compatible)" value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && search.trim()) { handleCode(search.trim()); setSearch(""); } }} />
              </div>
              <Button variant="outline" onClick={() => setScanOpen(true)}><ScanLine className="size-4 mr-1" /> Scanner</Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {filtered.map((i) => (
                <button key={i.id} onClick={() => addToCart(i)} disabled={i.stock_qty <= 0}
                  className="text-left bg-muted/30 hover:bg-primary/10 border border-border rounded-xl p-2 transition disabled:opacity-40">
                  {i.image_url
                    ? <img src={i.image_url} alt={i.name} className="w-full aspect-square object-cover rounded-lg mb-1" loading="lazy" />
                    : <div className="w-full aspect-square bg-muted rounded-lg mb-1" />}
                  <div className="text-xs font-medium line-clamp-2">{i.name}</div>
                  <div className="text-xs text-primary font-bold">{fcfa(i.sell_price)}</div>
                  <div className="text-[10px] text-muted-foreground">Stock {i.stock_qty}</div>
                </button>
              ))}
            </div>
            {filtered.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">Aucun produit trouvé.</p>}
          </section>

          {/* Panier */}
          <aside className="bg-card border border-border rounded-2xl p-4 shadow-soft flex flex-col">
            <h2 className="font-bold mb-2">Panier ({cart.length})</h2>
            <div className="flex-1 space-y-2 overflow-y-auto max-h-[50vh]">
              {cart.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Panier vide</p>}
              {cart.map((l) => (
                <div key={l.item.id} className="flex items-center gap-2 bg-muted/30 rounded-lg p-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{l.item.name}</div>
                    <div className="text-xs text-muted-foreground">{fcfa(l.item.sell_price)} × {l.qty}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="size-7" onClick={() => updateQty(l.item.id, -1)}><Minus className="size-3" /></Button>
                    <span className="w-6 text-center text-sm">{l.qty}</span>
                    <Button size="icon" variant="ghost" className="size-7" onClick={() => updateQty(l.item.id, +1)}><Plus className="size-3" /></Button>
                    <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => updateQty(l.item.id, -l.qty)}><Trash2 className="size-3" /></Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-border mt-3 pt-3 space-y-2">
              <div className="flex justify-between font-bold text-lg"><span>Total</span><span>{fcfa(total)}</span></div>
              <div>
                <Label className="text-xs">Paiement</Label>
                <Select value={payment} onValueChange={setPayment}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Espèces</SelectItem>
                    <SelectItem value="wave">Wave</SelectItem>
                    <SelectItem value="orange">Orange Money</SelectItem>
                    <SelectItem value="mtn">MTN Money</SelectItem>
                    <SelectItem value="moov">Moov Money</SelectItem>
                    <SelectItem value="card">Carte bancaire</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Input placeholder="Téléphone client (optionnel)" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <Button disabled={paying || cart.length === 0} onClick={checkout} className="w-full h-11 bg-gradient-primary">
                {paying ? <Loader2 className="size-4 animate-spin" /> : <><CreditCard className="size-4 mr-1" /> Encaisser {fcfa(total)}</>}
              </Button>
            </div>
          </aside>
        </div>
      </main>

      <BarcodeScanner open={scanOpen} onClose={() => setScanOpen(false)} onCode={handleCode} />

      <Dialog open={!!receipt} onOpenChange={(v) => !v && setReceipt(null)}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader><DialogTitle>Vente enregistrée</DialogTitle></DialogHeader>
          <div className="py-4">
            <div className="text-3xl font-bold text-primary">{receipt && fcfa(receipt.total)}</div>
            <div className="mt-2 text-sm text-muted-foreground">Reçu</div>
            <div className="font-mono text-lg">{receipt?.code}</div>
          </div>
          <Button onClick={() => setReceipt(null)}>Nouvelle vente</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
