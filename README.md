# Économat Pro — Villers

Appli centrée sur **les recettes, la production du jour / de demain et le catalogue d'ingrédients**.

- **Recettes** (Économat Pro, repris du dépôt `eco-2`) avec une partie **Pièces produites** :
  pièce (ex. baguette 350 g) ou bac divisé (ex. bac de 6 kg en 30 pièces).
- **Production du jour / de demain** : quantités par pièce ou par bac → pâte, pesées,
  préparations à faire avant, coût matière, feuille PDF. Code : `source/uni/prodj.js`.
  Les quantités sont enregistrées dans `v4_prodj` et suivent le compte en ligne.
- **Planning** : écran repris de Fabrication & Bio (`fabrication.html`, base Supabase « Manu »).
- **Catalogue** d'ingrédients, **Messages**, **Réglages & sauvegarde**.

Retirés du menu : bons d'économat, livre, partage, fournisseurs, et les écrans Fabrication
autres que le Planning (calculette, gérer, suivi bio, recettes de fabrication).

## Mettre à jour l'appli
`python3 source/publier.py` reconstruit `index.html`, `sw.js`, `manifest.json` et `icons/`
depuis `source/uni/`. Ne touche pas à `fabrication.html`.

## Bases de données (Supabase)
- Compte, recettes, catalogue : projet `eco-2Economat` (`fbwuhejcphsjhhkfkjku`).
- Planning : projet `Manu` (`gftfvplixdysvuearvif`).
