# KDL Anti-arnaque — contrat d'intégration locale v1

Pour les applications KDL installées sur le **même poste** (KDL Toolbox).
Adresse : `http://127.0.0.1:4210` (variable `PORT`).

## Règles

- `Host` doit être `localhost`, `127.0.0.1` ou `[::1]` → sinon **421** (protège aussi
  l'interface et l'historique contre le DNS rebinding).
- Toute requête portant un en-tête `Origin` (page web) est refusée → **403**.
  L'intégration est réservée aux programmes locaux, pas aux sites.
- Pas de jeton : l'API ne fait que calculer, elle ne lit ni ne modifie aucune donnée
  enregistrée. `localhost` n'est pas à lui seul une frontière de sécurité : un programme
  local malveillant pourrait l'appeler, mais n'obtiendrait qu'une analyse de son propre texte.
- **Rien n'est enregistré** : le message analysé par l'intégration n'entre pas dans
  l'historique et n'est jamais renvoyé dans la réponse.

## `GET /api/integration/v1/etat`

```json
{ "application": "kdl-anti-arnaque", "version": "1.1.0", "contrat": 1 }
```

## `POST /api/integration/v1/analyse`

Corps : `{ "texte": "<message, 1 à 20 000 caractères>" }` (JSON).

```json
{
  "contrat": 1,
  "niveau": "sur | douteux | dangereux",
  "libelle": "Tres probablement une arnaque",
  "score": 90,
  "marqueImitee": "laposte",
  "signaux": [{ "code": "marque_usurpee", "gravite": "critique|eleve|moyen|info", "titre": "…" }],
  "conseils": ["…"],
  "domaines": ["laposte.fr.suivi-colis.top"],
  "analyseLe": "2026-09-21T18:00:00.000Z",
  "avertissement": "Analyse automatique par signaux : une indication, pas une certitude."
}
```

Erreurs : 400 message vide / JSON invalide, 413 message trop long, 403 Origin, 421 Host.

`niveau: "sur"` signifie **« rien de suspect détecté »**, jamais « message sûr » :
l'appelant doit l'afficher ainsi.

Évolution : champ ajouté = même contrat ; champ retiré ou sens changé = `contrat: 2`.
