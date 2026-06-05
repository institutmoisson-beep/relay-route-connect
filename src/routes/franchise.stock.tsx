import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Package, Plus, Search, ScanLine, AlertTriangle, Edit2, Trash2, Upload,
  TrendingUp, Loader2, ArrowLeft, Box,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { safeUpload } from "@/lib/storage-upload";
import { materializeFile } from "@/lib/image-compress";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { getMyFranchise, fcfa } from "@/lib/franchise-helpers";

const sb = supabase as any;

export const Route = createFileRoute("/franchise/stock")({ component: StockPage });

type Item = {
  id: string; franchise_id: string; name: string; barcode: string | null; sku: string | null;
  category: string | null; unit: string | null; cost_price: number; sell_price: number;
  stock_qty: number; low_stock_threshold: number; image_url: string | null; is_active: boolean;
};

function StockPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [franchise, setFranchise] = useState<{ id: string; shop_name: string } | null>(null);
  const [search, setSearch] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth", replace: true }); }, [user, loading, navigate]);
  useEffect(() => { if (user) getMyFranchise(user.id).then((f) => setFranchise(f as any)); }, [user]);

  const { data: items = [], refetch, isLoading } = useQuery<Item[]>({
    queryKey: ["stock-items", franchise?.id],
    enabled: !!franchise,
    queryFn: async () => (await sb.from("graine_stock_items").select("*").eq("franchise_id", franchise!.id).order("name")).data ?? [],
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) =>
      i.name.toLowerCase().includes(q) ||
      (i.barcode || "").toLowerCase().includes(q) ||
      (i.sku || "").toLowerCase().includes(q) ||
      (i.category || "").toLowerCase().includes(q)
    );
  }, [items, search]);

  const lowStock = items.filter((i) => i.stock_qty <= i.low_stock_threshold);

  if (!user) return null;
  if (!franchise) {
    return (
      <div className="min-h-screen bg-muted/30">
        <SiteHeader />
        <main className="container mx-auto px-4 py-20 text-center">
          <p className="text-muted-foreground">Vous n'avez pas encore de franchise approuvée.</p>
          <Button asChild className="mt-4"><Link to="/franchise">Postuler</Link></Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <SiteHeader />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
          <div>
            <Link to="/franchise" className="text-xs text-muted-foreground inline-flex items-center gap-1 mb-2"><ArrowLeft className="size-3" /> Retour franchise</Link>
            <h1 className="text-3xl font-display font-bold flex items-center gap-2"><Package className="size-7 text-primary" /> Stock — {franchise.shop_name}</h1>
            <p className="text-sm text-muted-foreground">{items.length} produits · {lowStock.length} en alerte</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button asChild variant="outline"><Link to="/franchise/pos">Caisse</Link></Button>
            <Button asChild variant="outline"><Link to="/franchise/sales">Ventes</Link></Button>
            <Button onClick={() => { setEditing(null); setDialogOpen(true); }} className="bg-gradient-primary"><Plus className="size-4 mr-1" /> Produit</Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          <Kpi icon={Box} label="Produits actifs" value={items.filter(i => i.is_active).length.toString()} />
          <Kpi icon={AlertTriangle} label="En rupture / alerte" value={lowStock.length.toString()} tone={lowStock.length ? "danger" : "ok"} />
          <Kpi icon={TrendingUp} label="Valeur stock (PA)" value={fcfa(items.reduce((s, i) => s + i.stock_qty * i.cost_price, 0))} />
        </div>

        {/* Barre recherche */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Rechercher (nom, code-barres, SKU, catégorie)" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" onClick={() => setScanOpen(true)}><ScanLine className="size-4 mr-1" /> Scanner</Button>
        </div>

        {/* Table */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-soft">
          {isLoading && <div className="p-8 text-center"><Loader2 className="animate-spin inline" /></div>}
          {!isLoading && filtered.length === 0 && (
            <div className="p-12 text-center text-muted-foreground">
              <Package className="size-12 mx-auto mb-3 opacity-30" />
              Aucun produit. Cliquez sur « Produit » pour commencer.
            </div>
          )}
          {filtered.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="p-3">Produit</th>
                    <th className="p-3">Code-barres</th>
                    <th className="p-3 text-right">Stock</th>
                    <th className="p-3 text-right">PV</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((i) => {
                    const low = i.stock_qty <= i.low_stock_threshold;
                    return (
                      <tr key={i.id} className="border-t border-border hover:bg-muted/20">
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            {i.image_url
                              ? <img src={i.image_url} alt={i.name} className="size-10 rounded-lg object-cover" loading="lazy" />
                              : <div className="size-10 rounded-lg bg-muted grid place-items-center"><Package className="size-4 text-muted-foreground" /></div>}
                            <div>
                              <div className="font-medium">{i.name}</div>
                              <div className="text-xs text-muted-foreground">{i.category || "—"} · {i.sku || "sans SKU"}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 font-mono text-xs">{i.barcode || "—"}</td>
                        <td className="p-3 text-right">
                          <span className={low ? "text-destructive font-semibold" : ""}>{i.stock_qty} {i.unit}</span>
                          {low && <Badge variant="destructive" className="ml-1">!</Badge>}
                        </td>
                        <td className="p-3 text-right font-medium">{fcfa(i.sell_price)}</td>
                        <td className="p-3 text-right">
                          <Button size="sm" variant="ghost" onClick={() => { setEditing(i); setDialogOpen(true); }}><Edit2 className="size-4" /></Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <BarcodeScanner open={scanOpen} onClose={() => setScanOpen(false)} onCode={(code) => setSearch(code)} />

      <ItemDialog
        open={dialogOpen}
        onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditing(null); }}
        franchiseId={franchise.id}
        item={editing}
        onSaved={() => { setDialogOpen(false); setEditing(null); refetch(); }}
      />
    </div>
  );
}

function Kpi({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone?: "ok" | "danger" }) {
  return (
    <div className={`bg-card border border-border rounded-2xl p-4 shadow-soft flex items-center gap-3 ${tone === "danger" ? "border-destructive/40" : ""}`}>
      <div className={`size-10 rounded-xl grid place-items-center ${tone === "danger" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
        <Icon className="size-5" />
      </div>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-bold text-lg">{value}</div>
      </div>
    </div>
  );
}

function ItemDialog({ open, onOpenChange, franchiseId, item, onSaved }: {
  open: boolean; onOpenChange: (v: boolean) => void; franchiseId: string; item: Item | null; onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [barcode, setBarcode] = useState(item?.barcode || "");

  useEffect(() => { setBarcode(item?.barcode || ""); setImageFile(null); }, [item, open]);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    try {
      let image_url = item?.image_url || null;
      if (imageFile) {
        image_url = await safeUpload("graine-stock", franchiseId, imageFile, { compress: false });
      }
      const payload = {
        franchise_id: franchiseId,
        name: String(fd.get("name") || "").trim(),
        barcode: barcode.trim() || null,
        sku: String(fd.get("sku") || "").trim() || null,
        category: String(fd.get("category") || "").trim() || null,
        unit: String(fd.get("unit") || "pcs").trim(),
        cost_price: Number(fd.get("cost_price") || 0),
        sell_price: Number(fd.get("sell_price") || 0),
        stock_qty: Number(fd.get("stock_qty") || 0),
        low_stock_threshold: Number(fd.get("low_stock_threshold") || 5),
        image_url,
        is_active: true,
      };
      if (item) {
        const { error } = await sb.from("graine_stock_items").update(payload).eq("id", item.id);
        if (error) throw error;
        toast.success("Produit mis à jour");
      } else {
        const { error } = await sb.from("graine_stock_items").insert(payload);
        if (error) throw error;
        toast.success("Produit ajouté");
      }
      onSaved();
    } catch (e: any) {
      toast.error(e?.message || "Erreur");
    }
    setSaving(false);
  };

  const remove = async () => {
    if (!item) return;
    if (!confirm(`Supprimer ${item.name} ?`)) return;
    const { error } = await sb.from("graine_stock_items").delete().eq("id", item.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Produit supprimé");
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{item ? "Modifier le produit" : "Nouveau produit"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>Nom *</Label><Input name="name" required maxLength={120} defaultValue={item?.name} /></div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Code-barres</Label>
              <div className="flex gap-2">
                <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} maxLength={64} className="font-mono" />
                <Button type="button" variant="outline" onClick={() => setScanOpen(true)}><ScanLine className="size-4" /></Button>
              </div>
            </div>
            <div><Label>SKU</Label><Input name="sku" maxLength={60} defaultValue={item?.sku || ""} /></div>
            <div><Label>Catégorie</Label><Input name="category" maxLength={60} defaultValue={item?.category || ""} /></div>
            <div><Label>Unité</Label><Input name="unit" maxLength={16} defaultValue={item?.unit || "pcs"} /></div>
            <div><Label>Prix d'achat</Label><Input name="cost_price" type="number" step="0.01" defaultValue={item?.cost_price || 0} /></div>
            <div><Label>Prix de vente *</Label><Input name="sell_price" type="number" step="0.01" required defaultValue={item?.sell_price || 0} /></div>
            <div><Label>Stock actuel</Label><Input name="stock_qty" type="number" step="0.001" defaultValue={item?.stock_qty || 0} /></div>
            <div><Label>Seuil d'alerte</Label><Input name="low_stock_threshold" type="number" step="0.001" defaultValue={item?.low_stock_threshold || 5} /></div>
          </div>

          <div>
            <Label>Photo produit</Label>
            <label className="mt-1 border-2 border-dashed border-border rounded-xl p-4 hover:border-primary/50 transition cursor-pointer text-center block">
              <Upload className="size-5 mx-auto text-muted-foreground mb-1" />
              <span className="text-xs text-muted-foreground">{imageFile ? imageFile.name : (item?.image_url ? "Remplacer la photo" : "Choisir une image (auto-convertie en WebP)")}</span>
              <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                const raw = e.target.files?.[0] || null;
                if (!raw) { setImageFile(null); return; }
                try { setImageFile(await materializeFile(raw)); }
                catch { toast.error("Lecture du fichier impossible"); }
              }} />
            </label>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            {item && <Button type="button" variant="ghost" onClick={remove} className="text-destructive"><Trash2 className="size-4 mr-1" /> Supprimer</Button>}
            <Button type="submit" disabled={saving} className="bg-gradient-primary">
              {saving ? <Loader2 className="size-4 animate-spin" /> : item ? "Enregistrer" : "Ajouter"}
            </Button>
          </div>
        </form>
      </DialogContent>

      <BarcodeScanner open={scanOpen} onClose={() => setScanOpen(false)} onCode={(c) => setBarcode(c)} />
    </Dialog>
  );
}
