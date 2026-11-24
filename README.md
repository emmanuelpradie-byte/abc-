# Économat Pro — Villers

Une seule appli qui réunit :

- **Économat Pro** (repris du dépôt `eco-2`) : bons d'économat, recettes, catalogue,
  fournisseurs, partage, espace en ligne. Page : `index.html`.
- **Production du jour · Résultats · Prix & marges** (repris de `economat-production`) :
  produits faits avec chaque pâte, quantités du jour, pâte et ingrédients à peser,
  coût de revient, prix conseillé, bénéfice, feuille de production en PDF.
  Code : `source/uni/prod.js`.
- **Fabrication & Bio** (copie de l'appli de Phil, avec son accord) : un seul magasin,
  **Villers**, sans code d'accès. Page : `fabrication.html`, ouverte dans l'appli par le
  menu « Fabrication & Bio ».

## Bases de données (Supabase)
- Économat Pro : projet `eco-2Economat` (`fbwuhejcphsjhhkfkjku`) — comptes, recettes en ligne, partage.
- Fabrication & Bio : projet `Manu` (`gftfvplixdysvuearvif`). Tables recréées : `supabase/schema/`.

## Mettre à jour l'appli Économat
```
python3 source/publier.py
```
reconstruit `index.html`, `sw.js`, `manifest.json` et `icons/` depuis `source/uni/`.
Ne touche pas à `fabrication.html`.

## Mise en ligne
GitHub Pages : Settings → Pages → branche `main`, dossier `/ (root)`.
