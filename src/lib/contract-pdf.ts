import { jsPDF } from "jspdf";

export type ContractData = {
  contract_number: string;
  partner_name: string;
  space_name: string;
  city: string;
  neighborhood: string;
  address: string;
  signed_by_admin: string;
  partner_signature?: string | null;
  partner_signed_at?: string | null;
  created_at: string;
};

export function generateContractPDF(c: ContractData): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 56;
  let y = 60;

  // Header
  doc.setFillColor(217, 116, 49);
  doc.rect(0, 0, W, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(20, 20, 20);
  doc.text("MSN DELIVERY", M, (y += 10));
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text("Système de livraison collaborative — Côte d'Ivoire", M, (y += 14));

  y += 20;
  doc.setDrawColor(220);
  doc.line(M, y, W - M, y);
  y += 24;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(20);
  doc.text("CONTRAT DE PARTENARIAT POINT RELAIS", M, y);
  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`Référence : ${c.contract_number}`, M, y);
  doc.text(`Date : ${new Date(c.created_at).toLocaleDateString("fr-FR")}`, W - M - 160, y);
  y += 26;

  const para = (label: string, value: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(40);
    doc.text(label, M, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, M + 130, y);
    y += 14;
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(20);
  doc.text("ENTRE LES PARTIES", M, y); y += 16;
  para("L'Entreprise :", "MSN Delivery, représentée par Celvus Parfait, Administrateur Général.");
  para("Le Partenaire :", c.partner_name);
  para("Espace :", `${c.space_name} (${c.city}, ${c.neighborhood})`);
  para("Adresse :", c.address);

  y += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("ARTICLE 1 — OBJET", M, y); y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const txt = (s: string) => {
    const lines = doc.splitTextToSize(s, W - 2 * M);
    doc.text(lines, M, y);
    y += lines.length * 12 + 8;
  };
  txt("Le présent contrat a pour objet de définir les conditions dans lesquelles le Partenaire met à disposition de MSN Delivery son espace en tant que point relais pour la réception, la conservation et la remise des colis aux destinataires finaux.");

  doc.setFont("helvetica", "bold"); doc.setFontSize(12);
  doc.text("ARTICLE 2 — RESPONSABILITÉS DU PARTENAIRE", M, y); y += 14;
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  txt("Le Partenaire s'engage à : (a) réceptionner les colis aux horaires convenus ; (b) stocker les colis dans un lieu sec, sécurisé et inaccessible aux tiers ; (c) vérifier l'identité du destinataire avant remise ; (d) signaler immédiatement tout colis endommagé, perdu ou volé ; (e) respecter la confidentialité des informations clients.");

  doc.setFont("helvetica", "bold"); doc.setFontSize(12);
  doc.text("ARTICLE 3 — RESPONSABILITÉS DE MSN DELIVERY", M, y); y += 14;
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  txt("MSN Delivery s'engage à : (a) verser au Partenaire la commission due sur chaque colis remis ; (b) fournir un support technique et logistique ; (c) couvrir les pertes au-delà de la responsabilité raisonnable du Partenaire selon les conditions de l'article 5.");

  doc.setFont("helvetica", "bold"); doc.setFontSize(12);
  doc.text("ARTICLE 4 — GARANTIES", M, y); y += 14;
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  txt("Chaque partie garantit qu'elle dispose de tous les droits et autorisations nécessaires à l'exécution du présent contrat. Le Partenaire garantit la conformité légale de son espace d'accueil.");

  doc.setFont("helvetica", "bold"); doc.setFontSize(12);
  doc.text("ARTICLE 5 — RISQUES, PERTES ET DOMMAGES", M, y); y += 14;
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  txt("En cas de perte, vol ou dommage subi par un colis pendant qu'il se trouve sous la garde du Partenaire, ce dernier est tenu d'indemniser MSN Delivery à hauteur de la valeur déclarée du colis, dans la limite plafond fixée à 100 000 FCFA par colis. Au-delà, MSN Delivery couvre le surplus via son assurance. Les dommages causés par cas de force majeure (incendie, inondation, émeute) sont exclus.");

  if (y > 720) { doc.addPage(); y = 60; }

  doc.setFont("helvetica", "bold"); doc.setFontSize(12);
  doc.text("ARTICLE 6 — DURÉE & RÉSILIATION", M, y); y += 14;
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  txt("Le contrat est conclu pour une durée indéterminée et peut être résilié par chacune des parties avec un préavis écrit de 30 jours.");

  doc.setFont("helvetica", "bold"); doc.setFontSize(12);
  doc.text("ARTICLE 7 — LOI APPLICABLE", M, y); y += 14;
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  txt("Le présent contrat est régi par le droit ivoirien. Tout différend non résolu à l'amiable sera porté devant les tribunaux compétents d'Abidjan.");

  // Signatures
  if (y > 640) { doc.addPage(); y = 60; }
  y += 20;
  doc.setDrawColor(180);
  doc.line(M, y, W - M, y);
  y += 30;

  const colW = (W - 2 * M) / 2;
  const adminX = M, partnerX = M + colW + 10;

  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(20);
  doc.text("Pour MSN Delivery", adminX, y);
  doc.text("Le Partenaire", partnerX, y);
  y += 10;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(100);
  doc.text("Celvus Parfait — Administrateur Général", adminX, y + 12);
  doc.text(c.partner_name, partnerX, y + 12);

  // Admin handwritten signature (cursive style)
  doc.setFont("times", "italic");
  doc.setFontSize(28);
  doc.setTextColor(20, 60, 140);
  doc.text(c.signed_by_admin, adminX, y + 60);

  // Partner signature
  if (c.partner_signature) {
    doc.setFont("times", "italic");
    doc.setFontSize(28);
    doc.setTextColor(20, 60, 140);
    doc.text(c.partner_signature, partnerX, y + 60);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`Signé le ${new Date(c.partner_signed_at!).toLocaleDateString("fr-FR")}`, partnerX, y + 76);
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(180);
    doc.text("[Signature en attente]", partnerX, y + 60);
  }

  // Footer
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text("Document généré électroniquement — MSN Delivery © " + new Date().getFullYear(), M, 820);

  return doc;
}
