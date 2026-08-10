# NukuStock V1.1 — Tests opérationnels

Cette version fonctionne sans Supabase pour permettre les premiers tests métier.
Les données sont conservées dans le localStorage du navigateur.

## Flux testables
- Produits : ajout et modification.
- Stocks : entrée de stock avec lot, DLUO/DLC, lieu et quantité.
- Transferts : contrôle du disponible, décrémentation origine et incrémentation destination en FEFO.
- Demandes internes : création multi-produits, validation, préparation, livraison avec mouvement réel de stock.
- Fournisseurs : ajout et modification.
- Commandes fournisseurs : création multi-produits puis réception par lot/DLUO/lieu avec intégration au stock.
- Inventaires : comptage et clôture avec historique des écarts.
- Rapports : synthèse stock par lieu, transferts et demandes.
- Réglages : remise à zéro des données de test.

## Installation sur le projet déjà lancé
1. Arrêter le serveur avec Ctrl+C.
2. Copier les dossiers `app`, `components` et `lib` de cette version dans le dossier NukuStock actuel et accepter le remplacement.
3. Relancer `npm run dev`.
4. Ouvrir http://localhost:3000 (ou le port indiqué par Next.js).

Aucune nouvelle dépendance npm n'est nécessaire par rapport à la V1.
