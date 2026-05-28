import { jsPDF } from "jspdf";

export type FranchiseContractData = {
  contract_number: string;
  franchisee_name: string;
  shop_name: string;
  city: string;
  neighborhood: string;
  address: string;
  resupply_quota_pct: number;
  signed_by_admin: string;
  franchisee_signature?: string | null;
  franchisee_signed_at?: string | null;
  created_at: string;
};

export function generateFranchiseContractPDF(c: FranchiseContractData): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 56;
  let y = 60;

  doc.setFillColor(139, 69, 19);
  doc.rect(0, 0, W, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(20);
  doc.text("LA GRAINE", M, (y += 10));
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text("Réseau de franchise — Institut Moisson", M, (y += 14));

  y += 20;
  doc.setDrawColor(220);
  doc.line(M, y, W - M, y);
  y += 24;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(20);
  doc.text("CONTRAT DE FRANCHISE COMMERCIALE", M, y);
  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`Référence : ${c.contract_number}`, M, y);
  doc.text(`Date : ${new Date(c.created_at).toLocaleDateString("fr-FR")}`, W - M - 160, y);
  y += 26;

  const para = (label: string, value: string) => {
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(40);
    doc.text(label, M, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, M + 140, y);
    y += 14;
  };

  doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(20);
  doc.text("ENTRE LES PARTIES", M, y); y += 16;
  para("Le Franchiseur :", "Institut Moisson, marque « La Graine », représentée par Celvus Parfait.");
  para("Le Franchisé :", c.franchisee_name);
  para("Boutique :", `${c.shop_name} (${c.city}, ${c.neighborhood})`);
  para("Adresse :", c.address);

  const txt = (s: string) => {
    const lines = doc.splitTextToSize(s, W - 2 * M);
    doc.text(lines, M, y);
    y += lines.length * 12 + 8;
  };

  y += 10;
  doc.setFont("helvetica", "bold"); doc.setFontSize(12);
  doc.text("ARTICLE 1 — OBJET DE LA FRANCHISE", M, y); y += 14;
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  txt("Le Franchiseur concède au Franchisé le droit d'exploiter sa boutique sous la marque « La Graine », d'utiliser son enseigne, ses méthodes commerciales, son merchandising et son savoir-faire, en contrepartie des engagements ci-après.");

  doc.setFont("helvetica", "bold"); doc.setFontSize(12);
  doc.text("ARTICLE 2 — APPORTS DU FRANCHISEUR", M, y); y += 14;
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  txt("Le Franchiseur s'engage à : (a) relooker l'enseigne et le merchandising de la boutique aux normes « La Graine » ; (b) fournir des matériels de vente de dernière génération (caisse, mobilier, étagères) ; (c) former le Franchisé et son personnel ; (d) assurer la communication nationale de la marque ; (e) garantir l'approvisionnement régulier des produits référencés.");

  doc.setFont("helvetica", "bold"); doc.setFontSize(12);
  doc.text("ARTICLE 3 — ENGAGEMENTS DU FRANCHISÉ", M, y); y += 14;
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  txt(`Le Franchisé s'engage à : (a) respecter scrupuleusement la charte visuelle et opérationnelle de « La Graine » ; (b) se ravitailler à hauteur de ${c.resupply_quota_pct}% minimum auprès du Franchiseur ; (c) tenir une comptabilité claire et accessible au Franchiseur ; (d) garantir la qualité d'accueil et la propreté du point de vente ; (e) ne pas exploiter une enseigne concurrente.`);

  doc.setFont("helvetica", "bold"); doc.setFontSize(12);
  doc.text("ARTICLE 4 — PROPRIÉTÉ DU MATÉRIEL", M, y); y += 14;
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  txt("Les matériels, enseignes et équipements fournis par le Franchiseur restent sa propriété exclusive et doivent lui être restitués en bon état en fin de contrat.");

  if (y > 700) { doc.addPage(); y = 60; }

  doc.setFont("helvetica", "bold"); doc.setFontSize(12);
  doc.text("ARTICLE 5 — GARANTIES ET RISQUES", M, y); y += 14;
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  txt("Le Franchisé est responsable de la garde des stocks et matériels dans son point de vente. En cas de pertes, dommages ou vols, il en supporte la charge dans la limite raisonnable de sa diligence. Les cas de force majeure (incendie, inondation, émeute) sont exclus.");

  doc.setFont("helvetica", "bold"); doc.setFontSize(12);
  doc.text("ARTICLE 6 — DURÉE & RÉSILIATION", M, y); y += 14;
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  txt("Le présent contrat est conclu pour 3 ans renouvelable. Il peut être résilié par chaque partie avec un préavis de 60 jours, sans préjudice du droit pour le Franchiseur de rompre immédiatement en cas de manquement grave (non-respect du quota d'approvisionnement, atteinte à l'image de la marque).");

  doc.setFont("helvetica", "bold"); doc.setFontSize(12);
  doc.text("ARTICLE 7 — LOI APPLICABLE", M, y); y += 14;
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  txt("Le présent contrat est régi par le droit ivoirien. Tout litige relèvera des tribunaux compétents d'Abidjan.");

  if (y > 640) { doc.addPage(); y = 60; }
  y += 20;
  doc.setDrawColor(180);
  doc.line(M, y, W - M, y);
  y += 30;

  const colW = (W - 2 * M) / 2;
  const adminX = M, partnerX = M + colW + 10;

  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(20);
  doc.text("Pour Institut Moisson — La Graine", adminX, y);
  doc.text("Le Franchisé", partnerX, y);
  y += 10;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(100);
  doc.text("Celvus Parfait — Administrateur Général", adminX, y + 12);
  doc.text(c.franchisee_name, partnerX, y + 12);

  doc.setFont("times", "italic"); doc.setFontSize(28); doc.setTextColor(20, 60, 140);
  doc.text(c.signed_by_admin, adminX, y + 60);

  if (c.franchisee_signature) {
    doc.setFont("times", "italic"); doc.setFontSize(28); doc.setTextColor(20, 60, 140);
    doc.text(c.franchisee_signature, partnerX, y + 60);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(120);
    doc.text(`Signé le ${new Date(c.franchisee_signed_at!).toLocaleDateString("fr-FR")}`, partnerX, y + 76);
  } else {
    doc.setFont("helvetica", "italic"); doc.setFontSize(9); doc.setTextColor(180);
    doc.text("[Signature en attente]", partnerX, y + 60);
  }

  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(150);
  doc.text("Document généré électroniquement — Institut Moisson © " + new Date().getFullYear(), M, 820);
  return doc;
}
