# Fabrication & Bio (copie de « Les Blés de Demain », avec l'accord de Phil)

- Appli : `fabrication.html` (Fabrication & Bio), ouverte automatiquement par `index.html`
- Guide : `aide.html`
- Base de données : Supabase, projet « Manu » (`gftfvplixdysvuearvif`), **vide au départ**
- Mise en ligne : GitHub Pages (Settings → Pages → branche `main`, dossier `/`)

## À régler
- Code d'accès par défaut : 2412 → le changer (bouton de changement de code dans l'appli).
- Sites prévus par l'appli d'origine : Le Local, Veigné, Tours.
- Lecture par photo (bons de livraison, planning, recettes) : fonction Supabase `rapid-worker`
  (code dans `supabase/functions/scan-bon-livraison`), à déployer avec une clé `ANTHROPIC_API_KEY`.
