# KDL Anti-arnaque

Vous recevez un SMS, un mail ou un QR code douteux ? Collez-le ici : l'app dit
s'il s'agit d'une arnaque, **explique pourquoi**, et indique quoi faire.

Pensée pour être montrée à quelqu'un qui panique devant son téléphone — pas pour
un public technique. Chaque signal relevé est expliqué en français clair, pour
que la personne reconnaisse la prochaine tentative toute seule.

## Ce qu'elle sait faire

- **Analyse d'un message** : liens, prétextes, pression au temps, demandes de
  données bancaires, moyens de paiement intraçables, faux conseiller, faux RIB.
- **Vérité sur les liens** : affiche le domaine réellement visité, détecte les
  marques usurpées (`laposte.fr.suivi-colis.top`), les sosies typographiques
  (`arneli.fr`), le piège du `@`, le punycode, les extensions jetables.
- **Scan de QR code** : décodé dans le navigateur, l'image ne sort pas de
  l'appareil.
- **Historique local** des analyses, avec effacement en un clic.

## Confidentialité

Tout est calculé **sur la machine** : aucune requête réseau, aucune clé d'API,
aucun service tiers. Les messages analysés sont des SMS et des mails privés :
l'historique n'en conserve qu'un extrait de 280 caractères, dans une base SQLite
en `chmod 600`. Le serveur écoute sur `127.0.0.1` uniquement.

Lancer sans historique du tout : `HISTORIQUE=0 npm start`.

## Utilisation

```bash
npm install
npm start          # http://127.0.0.1:4210
npm test           # 17 tests du moteur d'analyse
```

Variables : `PORT` (4210), `HOTE` (127.0.0.1), `HISTORIQUE` (0 pour désactiver).

## Comment marche l'analyse

Aucun modèle d'IA n'intervient. Le moteur (`lib/analyse.js`) relève des signaux
**vérifiables**, chacun avec un poids ; leur somme donne un score sur 100 et un
niveau (sûr / douteux / dangereux). Un seul signal critique — une marque usurpée,
une demande de code bancaire — suffit à classer le message comme dangereux.

Ce choix est délibéré : un verdict doit être explicable et reproductible. On peut
lire `lib/analyse.js` et comprendre exactement pourquoi un message a été signalé.

`lib/marques.js` liste les marques les plus usurpées en France et leurs domaines
officiels. C'est le fichier à enrichir en priorité quand une nouvelle campagne
apparaît.

### Le piège des faux positifs

Chercher le nom d'une marque en simple sous-chaîne ferait sonner `cafetiere.com`
(« caf ») ou `freelance-design.com` (« free »). La comparaison se fait donc sur
les **segments** de l'adresse, avec une tolérance uniquement pour les noms collés
à un mot typique d'hameçonnage (`amelicompte.top`). Les tests couvrent ces cas.

## Limites honnêtes

- L'app juge la **forme** du message, pas le fond : un vrai message peut être
  signalé, une arnaque bien écrite sans lien peut passer. Le score n'est pas une
  garantie, c'est une aide à la décision.
- Aucune vérification en ligne du domaine (âge, réputation) : c'est le prix du
  100 % local et gratuit.
- La liste des marques est franco-française et demande à être entretenue.

---

KDL TECH — outil local et gratuit.
