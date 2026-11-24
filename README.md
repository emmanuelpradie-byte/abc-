# Économat Pro — Villers

Une seule appli : **Économat Pro** (repris du dépôt `eco-2`) avec **Fabrication & Bio**
intégrée dedans (copie de l'appli de Phil, avec son accord).

- Économat Pro : bons d'économat, recettes, catalogue, fournisseurs, partage, espace en ligne.
- Fabrication & Bio : groupe « Fabrication & Bio » dans le menu (Production du jour, Planning,
  Calculette, Recettes de fabrication, Livraisons, Pertes, Inventaire, Bilan bio, Gérer).
  Un seul magasin : **Villers**, sans code d'accès. Les écrans reprennent automatiquement
  les couleurs, la police et le mode sombre de l'appli.

## Fichiers
- `index.html`, `sw.js`, `manifest.json`, `icons/` : l'appli (construite depuis `source/uni/`).
- `source/uni/fab.js` : le branchement de Fabrication dans le menu de l'appli.
- `fabrication.html` (+ `aide.html`) : les écrans de Fabrication (mode intégré : `?embed=1`).

## Bases de données (Supabase)
- Économat Pro : projet `eco-2Economat` (`fbwuhejcphsjhhkfkjku`).
- Fabrication & Bio : projet `Manu` (`gftfvplixdysvuearvif`). Tables : `supabase/schema/`.

## Mettre à jour l'appli
`python3 source/publier.py` reconstruit `index.html`, `sw.js`, `manifest.json` et `icons/`.
Ne touche pas à `fabrication.html`.

## Mise en ligne
GitHub Pages : Settings → Pages → branche `main`, dossier `/ (root)`.
