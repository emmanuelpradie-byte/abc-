# Mon Fournil — Maison Viennet

Appli de la boulangerie centrée sur **les recettes, la production et le catalogue d'ingrédients**.
En ligne : https://emmanuelpradie-byte.github.io/abc-/

- **Recettes** avec deux onglets : *Recettes* et *Produits*. Un produit est soit une pièce
  (ex. baguette 350 g), soit un bac divisé (ex. bac de 6 kg en 30 pièces).
- **Production du jour / de demain** : semaine, on coche les recettes du jour puis on saisit
  les quantités → pâte, pesées, préparations à faire avant, coût matière, feuille PDF.
- **Production semaine** : la même saisie sur 7 jours, rangée par catégorie de recette.
  Ce qui est saisi dans un jour apparaît dans la semaine, et inversement.
- **Catalogue** d'ingrédients, **Réglages & sauvegarde**.

Code de la production : `source/uni/prodj.js` (données `v4_prodj`, suivent le compte en ligne).

## Mettre à jour l'appli
`python3 source/publier.py` reconstruit `index.html`, `sw.js`, `manifest.json` et `icons/`
depuis `source/uni/`.

## Base de données (Supabase)
Projet `Manu` (`gftfvplixdysvuearvif`) : comptes et données de Mon Fournil.
L'appli Économat Pro (dépôt `eco-2`) garde sa propre base, séparée.
Les deux applis sont sur le même domaine GitHub Pages : Mon Fournil range ses données
locales à part (préfixe `mf:` et base IndexedDB `mon-fournil`).
