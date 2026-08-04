<div align="center">

# 🛡️ KDL Anti-arnaque

**Paste a suspicious SMS, email or QR code — get a verdict, and the reason behind it. 100% offline, no API key, no account.**

[![License: MIT](https://img.shields.io/badge/License-MIT-1F5278.svg)](LICENSE)
[![Runs offline](https://img.shields.io/badge/Network-zero%20requests-22c55e.svg)](#privacy)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933.svg)]()
[![Tests](https://img.shields.io/badge/tests-17%20passing-brightgreen.svg)](#tests)

*🇫🇷 [Documentation française complète plus bas](#-documentation-française)*

</div>

---

## What it does

Scam texts work because the victim cannot tell a real link from a fake one in the
three seconds they spend looking at it. This tool is built to be **shown to
someone panicking in front of their phone** — not to a security audience.

Paste the message. It returns a verdict, and more importantly **explains every
signal it found in plain language**, so the person recognizes the next attempt on
their own.

### Detection

- **Message analysis** — links, pretexts, time pressure, banking-data requests,
  untraceable payment methods, fake advisors, fake bank details
- **Link truth** — shows the domain actually visited, catches impersonated brands
  (`laposte.fr.suivi-colis.top`), typographic lookalikes (`arneli.fr`), the `@`
  trick, punycode, and disposable TLDs
- **QR code scanning** — decoded in the browser; the image never leaves the device
- **Local history** with one-click wipe

## Privacy

Everything runs **on the machine**: no network requests, no API key, no third
party. Analyzed messages are private texts and emails, so history keeps only a
280-character excerpt in a SQLite database with `chmod 600`, and the server binds
to `127.0.0.1` only.

Run with no history at all: `HISTORIQUE=0 npm start`

## Quick start

```bash
npm install
npm start          # http://127.0.0.1:4210
npm test           # 17 engine tests
```

Environment: `PORT` (4210), `HOTE` (127.0.0.1), `HISTORIQUE` (0 to disable).

## Why rule-based, not AI

The engine is a **deterministic rule set** — no model, no inference, no data
leaving the machine. It means the verdict is auditable (you can read exactly why
a message was flagged), it runs on a ten-year-old laptop, and it costs nothing to
operate. For scam detection, explainability matters more than sophistication.

## Contributing

New scam patterns are the most useful contribution — open an issue with the
redacted message and the reason it fooled a human. ⭐ helps others find it.

---

<a id="-documentation-française"></a>

## 🇫🇷 Documentation française

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

## Exécutable autonome (Windows & Linux)

Le code ne dépend d'aucun module natif : il s'empaquette en un seul fichier
exécutable, sans Node à installer sur la machine cible.

```bash
npm run build      # génère dist/<app>-linux et dist/<app>-win.exe
```

Les données sont écrites dans un dossier `data/` **à côté de l'exécutable**.

---

<div align="center">

**Other tools by [KDL TECH](https://kdl-tech.fr)** — an independent computer repair
and software workshop in Guadeloupe 🇬🇵

[Anti-arnaque](https://github.com/Kdl-Tech/kdl-anti-arnaque) ·
[Privacy Dev Browser](https://github.com/Kdl-Tech/kdl-privacy-dev-browser) ·
[Prompt Studio](https://github.com/Kdl-Tech/kdl-prompt-studio) ·
[DNS Shield](https://github.com/Kdl-Tech/kdl-dns-shield) ·
[Security Free](https://github.com/Kdl-Tech/kdl-security-free) ·
[MAIA Conky](https://github.com/Kdl-Tech/maia-conky)

</div>
