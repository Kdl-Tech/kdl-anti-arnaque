# Journal des versions — KDL Anti-arnaque

## 1.1.0 — 21/09/2026

- **Sécurité** : toute requête dont l'en-tête `Host` n'est pas `localhost` / `127.0.0.1`
  est refusée (421). Avant, une page web piégée utilisant le « DNS rebinding » pouvait
  lire et effacer l'historique (extraits de SMS privés).
- **Intégration locale v1** pour KDL Toolbox (`docs/INTEGRATION.md`) : état et analyse
  d'un message, synthèse seulement, rien d'enregistré, pages web refusées (403).
- **Installateurs** : paquet `.deb` (Debian/Ubuntu/Mint) et installateur Windows sans droits
  administrateur, avec le runtime Node.js officiel non modifié. Remplacent les exécutables
  `pkg` de la 1.0 (runtime Node 20 figé, binaires modifiés bloqués par Smart App Control).
  Pas de paquet macOS pour la 1.1.
- Données (historique, journal) dans le dossier de l'utilisateur, conservées à la
  désinstallation ; bouton « Fermer KDL Anti-arnaque » dans la version installée.
- Tests compatibles Node 24 (25 tests).

## 1.0.0 — 20/07/2026

Première version : analyse locale d'un SMS, d'un mail, d'un lien ou d'un QR code.
