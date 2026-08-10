# NukuStock V1

Application web responsive de gestion des stocks et approvisionnements pour Nukutepipi.

## Ce qui fonctionne dans cette V1

- Dashboard responsive téléphone / tablette / PC.
- Mercuriel produits avec produits achetés, fabriqués ou modifiés sur place.
- Multi-lots et multi-DLUO/DLC par référence.
- Stock par lieu, lot et date limite.
- Demandes internes multi-produits avec bouton « Ajouter un produit ».
- Écrans commandes fournisseurs, transferts, inventaires, fournisseurs, rapports et réglages.
- PWA installable (manifest de base).
- Données de démonstration persistées en localStorage pour tester immédiatement sans Supabase.
- Schéma PostgreSQL/Supabase complet dans `supabase/schema.sql`.

## Installation locale

```bash
npm install
npm run dev
```

Puis ouvrir `http://localhost:3000`.

## Connexion Supabase

1. Créer un projet Supabase.
2. Exécuter `supabase/schema.sql` dans le SQL Editor.
3. Copier `.env.example` vers `.env.local` et renseigner l'URL et la clé anon.
4. Remplacer progressivement le store local (`lib/store.ts`) par des services Supabase.
5. Ajouter Supabase Auth et les politiques RLS selon les rôles.

## Architecture recommandée pour la suite

La V1 garde volontairement le front simple. En production, les mouvements de stock doivent être gérés côté PostgreSQL via fonctions RPC/transactions afin d'éviter les écarts en cas d'utilisation simultanée. Les réceptions, transferts, livraisons internes et ajustements d'inventaire doivent tous créer une ligne dans `stock_movements` et mettre à jour `stock_balances` atomiquement.

## Prochaines priorités

1. Authentification et rôles.
2. CRUD Supabase réel produits/fournisseurs/lieux/lots.
3. Réception fournisseur avec création de lot + DLUO/DLC + emplacement.
4. Validation partielle et préparation des demandes internes.
5. Transaction de transfert réel.
6. Inventaire par emplacement avec clôture et ajustements.
7. Exports Excel/PDF.
8. Scan code-barres/QR.
9. Mode offline/PWA avec file de synchronisation.
