# Appli boulangerie (copie de « Les Blés de Demain », avec l'accord de Phil)

- Appli principale : `index-cloud-test.html` (ouverte automatiquement par `index.html`)
- Fabrication : `fabrication.html` · Page de commande des pros : `pro.html`
- Base de données : Supabase, projet « Manu » (`gftfvplixdysvuearvif`), **vide au départ**
- Mise en ligne : GitHub Pages (Settings → Pages → branche `main`, dossier `/`)

## À régler dans l'appli
- Coordonnées des boutiques (tickets) : constantes `SHOP_TELS_FIXES`, `SHOP_ADRESSES`, `SHOP_TELS`
  dans `index-cloud-test.html` et `pro.html` (laissées vides).
- PIN BackOffice par défaut : 2412 → le changer dans BackOffice.
- Les noms de sites (Le Local, Veigné, Tours, St-Avertin, marchés) viennent de l'appli d'origine.

## Base
La structure de la base a été recréée sur le projet Supabase (tables, règles d'accès, fonctions,
tâches automatiques). `supabase/schema/00_base.sql` contient les tables de départ reconstituées.
La fonction `scan-bon-livraison` (lecture des bons par photo) demande une clé `ANTHROPIC_API_KEY`
dans les secrets Supabase avant d'être déployée.
