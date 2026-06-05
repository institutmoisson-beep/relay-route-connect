# Plan — Stock, Relais, Franchise (3 chantiers)

Je vais livrer dans cet ordre, chaque chantier = 1 migration DB + écrans.

---

## Chantier 1 — Gestion de stock supérette (franchise) + scanner

### Base de données (migration 1)
Nouvelles tables (toutes scopées `franchise_id` via `graine_franchise_contracts`) :
- `graine_stock_items` : `franchise_id`, `name`, `barcode` (unique par franchise), `sku`, `category`, `unit`, `cost_price`, `sell_price`, `stock_qty`, `low_stock_threshold`, `image_url`
- `graine_stock_movements` : `item_id`, `franchise_id`, `kind` (`in`/`out`/`adjust`/`sale`), `qty`, `unit_price`, `note`, `created_by`
- `graine_sales` : `franchise_id`, `cashier_id`, `total_amount`, `payment_method`, `customer_phone?`, `receipt_code`
- `graine_sale_items` : `sale_id`, `item_id`, `qty`, `unit_price`, `subtotal`

Triggers :
- Vente → décrémente `stock_qty` + insère mouvement `sale`
- Mouvement `in`/`out`/`adjust` → met à jour `stock_qty`
- Alerte si `stock_qty <= low_stock_threshold` (notification au franchisé)

RLS :
- Franchisé : CRUD sur ses items/ventes uniquement (via `franchise_id` lié à `user_id` dans `graine_franchise_contracts`)
- Admin (`has_role`) : lecture totale sur toutes les franchises
- Helper `public.user_franchise_ids(uid)` SECURITY DEFINER pour éviter récursion RLS

### Écrans
- `/franchise/stock` (franchisé) : liste produits, recherche, filtres catégorie, alertes stock bas, ajout/édition produit avec **upload image** (compressé WebP via `materializeFile`), saisie barcode manuelle ou scanner caméra
- `/franchise/pos` (caisse) : scanner caméra (`@zxing/browser`) + champ saisie/douchette, panier en direct, sélection moyen de paiement, génération reçu code
- `/franchise/sales` : historique ventes, recherche par date/montant/caissier, export
- Vue admin dans `/portal-extras/$slug` : nouvel onglet « Franchises — stock & ventes » avec sélecteur de franchise, KPIs (CA jour/semaine/mois, top produits, stock total, alertes), tableau ventes consolidé

### Dépendance npm
- `@zxing/browser` + `@zxing/library` pour scanner code-barres caméra (web standard, marche sur Android Chrome)

---

## Chantier 2 — Dashboard Point Relais moderne

### Migration 2 (légère)
- Ajouter colonnes manquantes si besoin sur `msn_deliveries` (RAS si déjà présentes)
- Vue/fonction `relay_stats(relay_id)` SECURITY DEFINER : nb colis attendus / remis / refusés / commissions estimées

### Écran `/relay-dashboard`
- KPIs : colis attendus, à remettre aujourd'hui, remis ce mois, revenus estimés
- Liste « En attente de réception » avec scan du code de tracking pour confirmer arrivée
- Liste « Prêt à remettre » avec scan du code client pour finaliser la remise
- Historique avec recherche date/code/statut
- Notifications temps réel (Supabase Realtime sur `msn_notifications`)

---

## Chantier 3 — Dashboard Franchise moderne (vue d'ensemble)

### Pas de migration
Refonte de `/franchise` :
- KPIs ventes/jour, CA mois, commandes en cours, niveau de stock global, alertes
- Graphique ventes 30 jours (Recharts, déjà installé)
- Raccourcis : Stock, Caisse, Ventes, Produits, Contrat
- Section « Top produits » et « Produits en rupture »

---

## Détails transverses (déjà appliqués)

- **Bug upload** corrigé : `materializeFile()` lit les octets dès la sélection (fini l'erreur Android « requested file could not be read »)
- **Optimisation image globale** : toute image passée par `materializeFile` → compressée + convertie en WebP automatiquement. Tous les écrans qui uploadent passent désormais par ce helper.
- **Stockage** : tous les fichiers vont dans des buckets Supabase Storage (`graine-products` existe déjà pour produits, je créerai `graine-stock` pour images de stock). Jamais d'URL externe.

---

## Ce que je vais te demander entre les chantiers

Chaque migration DB doit être approuvée par toi avant exécution. Je te ping à chaque fois.

## Estimation
- Chantier 1 : 1 migration + ~6 fichiers (le plus gros, scanner inclus)
- Chantier 2 : 1 migration légère + 1 écran
- Chantier 3 : 1 écran refondu

Je commence par le Chantier 1 (migration DB stock + scanner). Tu valides ?
