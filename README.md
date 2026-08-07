**Français** · [English](README.en.md)

# KDL Anti-arnaque

Collez un SMS, un mail ou un lien suspect. L'outil vous dit ce qui cloche —
**et pourquoi**. Tout se passe sur votre ordinateur : aucun message ne part sur
Internet.

```bash
npm install && npm start        # puis http://127.0.0.1:4210
```

![Interface de KDL Anti-arnaque : une zone pour coller le message reçu, les boutons Analyser et Analyser un QR code, et l'historique des analyses précédentes](docs/interface.png)

---

## Ce qu'il répond vraiment

Voici la sortie réelle pour un SMS d'hameçonnage classique :

> **Très probablement une arnaque** — score 100/100
>
> **« laposte » apparaît dans l'adresse, mais le site n'est pas le sien.**
> Le vrai site est `laposte.fr`. Ici, le domaine réellement visité est
> `laposte-colis.tk`. Placer un nom connu à gauche dans l'adresse est le procédé
> d'hameçonnage le plus courant : seule la partie juste avant la première barre
> oblique compte.

C'est le point de tout l'outil : **il ne se contente pas d'un verdict, il
enseigne la règle**. La personne qui lit cette explication saura reconnaître la
prochaine arnaque toute seule, sans l'outil.

## Ce qu'il regarde

| | |
|---|---|
| **Marques usurpées** | un nom connu placé à gauche du vrai domaine |
| **Domaines suspects** | extensions à risque, sous-domaines trompeurs, adresses IP nues |
| **Procédés de pression** | urgence, menace de frais, délai court |
| **Codes QR** | décodés localement, puis l'adresse est analysée comme un lien |
| **Historique** | vos analyses précédentes restent sur la machine |

Chaque signal a un poids et une gravité, et le verdict explique lesquels ont
pesé. Rien n'est une boîte noire.

## Pourquoi c'est hors ligne

Un outil qui analyse vos SMS et vos mails **ne doit pas les envoyer ailleurs**.
Ce serait le comble : vous confieriez à un tiers exactement ce que vous cherchez
à protéger.

Aucune requête réseau, aucune clé d'API, aucun compte. Vous pouvez couper le
Wi-Fi et l'outil fonctionne à l'identique.

## Ce qu'il ne fait pas

Il ne remplace pas votre jugement. Un message peut être frauduleux sans porter
aucun des signaux connus, et un message légitime peut en déclencher un.

Il ne vérifie pas si un site est en ligne, ne visite aucun lien, et ne signale
rien aux autorités. **En cas de doute persistant : 33700 pour les SMS,
cybermalveillance.gouv.fr pour le reste.**

## Prérequis

Node.js 18 ou plus. Aucune dépendance réseau.

## Licence

MIT.

---

Par [**KDL TECH**](https://kdl-tech.fr) — maintenance informatique,
développement, sécurité. Guadeloupe et à distance.
