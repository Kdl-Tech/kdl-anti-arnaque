"use strict";
/**
 * Moteur d'analyse anti-arnaque : 100 % local, aucune requete reseau, aucune cle.
 *
 * On ne cherche pas a « deviner » avec un modele : on releve des signaux
 * verifiables (adresse qui imite une marque, extension jetable, demande de code
 * bancaire, moyen de paiement intracable...) et on les explique en francais
 * clair. Chaque signal porte son propre poids ; le total donne un niveau.
 *
 * Principe directeur : mieux vaut expliquer POURQUOI c'est suspect que rendre
 * un verdict opaque. La personne doit ressortir en sachant reconnaitre la
 * prochaine tentative toute seule.
 */
const { MARQUES, DOMAINES_OFFICIELS, TLD_RISQUE, RACCOURCISSEURS } = require("./marques");

const SUFFIXES_COMPOSES = [
  "gouv.fr", "co.uk", "org.uk", "com.au", "com.br", "asso.fr", "net.fr", "co.jp",
];

// ---------------------------------------------------------------------------
// Outils
// ---------------------------------------------------------------------------

function sansAccent(s) {
  return String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/** Distance de Levenshtein, pour reperer les sosies (arneli.fr vs ameli.fr). */
function distance(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m || !n) return m || n;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    prev = cur;
  }
  return prev[n];
}

// Mots que les escrocs accolent au nom de la marque : ameli-connexion, impots-remboursement...
const SUITES_SUSPECTES = /^(connexion|compte|comptes|secure|securise|securite|verif|verification|paiement|payer|client|clients|espace|acces|login|maj|update|assurance|remboursement|facture|suivi|colis|livraison|support|service|officiel|france|fr)/;

/**
 * Le jeton d'une adresse cite-t-il la marque ?
 * Egalite stricte d'abord : « caf » ne doit pas se declencher sur « cafetiere »,
 * ni « free » sur « freelance ». On tolere ensuite le nom colle a un mot
 * typique d'hameconnage (amelicompte, impotsremboursement), sans quoi il
 * suffirait de retirer le tiret pour passer au travers.
 */
function jetonCiteLaMarque(jeton, mot) {
  if (jeton === mot) return true;
  if (mot.length < 5 || !jeton.startsWith(mot)) return false;
  return SUITES_SUSPECTES.test(jeton.slice(mot.length));
}

/** Domaine enregistrable : sous.ameli.fr.truc.top -> truc.top */
function domaineRacine(hote) {
  const parts = hote.split(".").filter(Boolean);
  if (parts.length <= 2) return parts.join(".");
  const deuxDerniers = parts.slice(-2).join(".");
  const troisDerniers = parts.slice(-3).join(".");
  if (SUFFIXES_COMPOSES.includes(deuxDerniers)) return troisDerniers;
  return deuxDerniers;
}

// ---------------------------------------------------------------------------
// Extraction des liens
// ---------------------------------------------------------------------------

// Deux formes : avec schema (on avale tout, y compris un eventuel « @ » qui
// masque la vraie destination) ou simple nom de domaine ecrit a la volee.
const MOTIF_URL = /(https?:\/\/[^\s<>"'()]+|(?:[\w-]+\.)+[a-z]{2,}(?:\/[^\s<>"'()]*)?)/gi;
// Un mot avec un point n'est pas forcement un lien ("Bonjour.Merci").
const EXT_FICHIER = /\.(png|jpe?g|pdf|docx?|xlsx?|zip|mp4|txt)$/i;

function extraireLiens(texte) {
  const vus = new Set();
  const liens = [];
  for (const m of String(texte).matchAll(MOTIF_URL)) {
    const brut = m[1].replace(/[.,;:!?)\]]+$/, "");
    const schemaExplicite = /^https?:\/\//i.test(brut);
    if (EXT_FICHIER.test(brut) && !schemaExplicite) continue;
    let u;
    try {
      // C'est l'analyseur d'URL du moteur qui tranche ou l'on va vraiment :
      // sur « https://ameli.fr@1.2.3.4/x », hostname vaut 1.2.3.4, pas ameli.fr.
      u = new URL(schemaExplicite ? brut : "http://" + brut);
    } catch {
      continue;
    }
    const hote = u.hostname.toLowerCase();
    if (!hote.includes(".")) continue;
    const cle = hote + u.pathname;
    if (vus.has(cle)) continue;
    vus.add(cle);
    liens.push({
      brut,
      chiffre: u.protocol === "https:",
      schemaExplicite,
      hote,
      chemin: u.pathname + u.search,
      identifiantsCaches: u.username !== "" || u.password !== "",
      façade: u.username || null,
    });
  }
  return liens;
}

// ---------------------------------------------------------------------------
// Signaux portes par une adresse
// ---------------------------------------------------------------------------

function analyserLien(lien) {
  const signaux = [];
  const hote = lien.hote;
  const racine = domaineRacine(hote);
  const tld = racine.split(".").pop();
  const officiel = DOMAINES_OFFICIELS.includes(racine);

  if (officiel) {
    signaux.push({
      code: "domaine_officiel", poids: 0, gravite: "info",
      titre: `${racine} est bien le site officiel`,
      explication: "Cette adresse correspond au vrai domaine de la marque. Attention : cela ne garantit pas que le message, lui, soit authentique.",
    });
    return { signaux, racine, marqueImitee: null };
  }

  // 1. Marque citee dans l'adresse alors que le domaine appartient a un autre.
  let marqueImitee = null;
  const jetons = sansAccent(hote).split(/[.\-_]/).filter(Boolean);
  for (const [mot, domaines] of Object.entries(MARQUES)) {
    if (!jetons.some((j) => jetonCiteLaMarque(j, mot))) continue;
    if (domaines.includes(racine)) continue;
    marqueImitee = mot;
    signaux.push({
      code: "marque_usurpee", poids: 55, gravite: "critique",
      titre: `« ${mot} » apparait dans l'adresse, mais le site n'est pas le sien`,
      explication: `Le vrai site est ${domaines[0]}. Ici, le domaine reellement visite est ${racine}. Placer un nom connu a gauche dans l'adresse est le procede d'hameconnage le plus courant : seule la partie juste avant la premiere barre oblique compte.`,
    });
    break;
  }

  // 2. Sosie typographique d'un domaine officiel.
  if (!marqueImitee) {
    for (const off of DOMAINES_OFFICIELS) {
      const d = distance(racine, off);
      if (d > 0 && d <= 2 && Math.abs(racine.length - off.length) <= 2) {
        signaux.push({
          code: "domaine_sosie", poids: 50, gravite: "critique",
          titre: `${racine} imite ${off} a quelques lettres pres`,
          explication: `Une seule lettre change par rapport au vrai site (${off}). C'est fait pour que l'oeil ne remarque rien.`,
        });
        marqueImitee = off;
        break;
      }
    }
  }

  if (lien.identifiantsCaches) {
    signaux.push({
      code: "arobase_url", poids: 40, gravite: "critique",
      titre: "L'adresse cache sa vraie destination avec un @",
      explication: `Tout ce qui precede le @ est ignore par le navigateur.${
        lien.façade ? ` Ici « ${lien.façade} » sert de vitrine, mais le site reellement ouvert est ${hote}.` : ""
      } C'est un des pieges les plus efficaces, car l'adresse commence par un nom parfaitement legitime.`,
    });
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hote)) {
    signaux.push({
      code: "ip_brute", poids: 35, gravite: "eleve",
      titre: "Le lien pointe vers une adresse IP, pas vers un nom de site",
      explication: "Une entreprise serieuse utilise son nom de domaine. Une suite de chiffres designe souvent une machine louee a la journee.",
    });
  }
  if (hote.includes("xn--")) {
    signaux.push({
      code: "punycode", poids: 40, gravite: "critique",
      titre: "L'adresse utilise des caracteres deguises",
      explication: "Des lettres d'un autre alphabet imitent nos lettres latines a l'ecran (un « a » cyrillique par exemple). Le nom parait normal mais mene ailleurs.",
    });
  }
  if (RACCOURCISSEURS.has(racine)) {
    signaux.push({
      code: "raccourcisseur", poids: 25, gravite: "moyen",
      titre: "Lien raccourci : la destination reelle est masquee",
      explication: "Le raccourcisseur n'est pas malveillant en soi, mais il empeche de voir ou l'on va avant de cliquer. Une administration n'en utilise jamais.",
    });
  }
  if (TLD_RISQUE.has(tld)) {
    signaux.push({
      code: "tld_risque", poids: 20, gravite: "moyen",
      titre: `L'extension « .${tld} » est tres utilisee par les arnaqueurs`,
      explication: "Ces extensions coutent quelques centimes et sont jetees apres la campagne. Les organismes francais utilisent .fr ou .gouv.fr.",
    });
  }
  const nbSousDomaines = hote.split(".").length - racine.split(".").length;
  if (nbSousDomaines >= 3) {
    signaux.push({
      code: "sous_domaines", poids: 15, gravite: "moyen",
      titre: "Adresse a rallonge",
      explication: "Empiler les mots avant le vrai domaine sert a noyer le poisson et a faire deborder l'adresse sur l'ecran d'un telephone.",
    });
  }
  if (lien.schemaExplicite && !lien.chiffre) {
    signaux.push({
      code: "http_clair", poids: 15, gravite: "moyen",
      titre: "Connexion non chiffree (http)",
      explication: "Tout ce que vous saisiriez sur cette page circulerait en clair. Plus aucun site serieux ne fonctionne ainsi.",
    });
  }
  return { signaux, racine, marqueImitee };
}

// ---------------------------------------------------------------------------
// Signaux portes par le texte du message
// ---------------------------------------------------------------------------

const REGLES_TEXTE = [
  {
    code: "donnees_bancaires", poids: 35, gravite: "critique",
    motifs: [/carte bancaire/, /numero de carte/, /cryptogramme/, /code (?:a )?(?:3|trois) chiffres/,
             /code (?:a )?(?:6|six) chiffres/, /code de confirmation/, /votre rib\b/, /votre iban/,
             /identifiants? bancaires?/, /code (?:secret|d'acces)/, /mot de passe/],
    titre: "On vous demande des donnees confidentielles",
    explication: "Aucune banque, aucune administration ne demande jamais un code, un mot de passe ou un numero de carte, ni par SMS, ni par mail, ni au telephone. Cette demande suffit a elle seule a qualifier l'arnaque.",
  },
  {
    code: "paiement_atypique", poids: 35, gravite: "critique",
    motifs: [/carte cadeau/, /pcs\b/, /transcash/, /neosurf/, /western union/, /bitcoin/, /crypto/,
             /coupon/, /recharge/, /paysafe/],
    titre: "Moyen de paiement intracable exige",
    explication: "Carte cadeau, coupon, crypto ou mandat : ces paiements sont irreversibles et anonymes. Aucun organisme officiel n'en accepte. C'est la signature d'une escroquerie.",
  },
  {
    code: "urgence", poids: 18, gravite: "eleve",
    motifs: [/sous 24 ?h/, /sous 48 ?h/, /immediatement/, /des aujourd'hui/, /dernier (?:avertissement|rappel)/,
             /derniere chance/, /expire (?:aujourd'hui|demain|sous)/, /avant ce soir/, /delai depasse/,
             /sera (?:suspendu|bloque|desactive|supprime|resilie)/],
    titre: "On vous met la pression sur le temps",
    explication: "L'urgence est la premiere arme de l'escroc : elle empeche de reflechir et de verifier. Un organisme officiel laisse toujours un delai raisonnable et vous ecrit aussi par courrier.",
  },
  {
    code: "appat_gain", poids: 22, gravite: "eleve",
    motifs: [/vous avez gagne/, /vous etes (?:le )?gagnant/, /remboursement/, /trop.per[cç]u/,
             /cadeau/, /tirage au sort/, /heritage/, /gain de/, /somme de \d/, /offre exceptionnelle/],
    titre: "Promesse d'argent ou de cadeau",
    explication: "Un remboursement ou un gain inattendu sert d'appat pour vous faire saisir vos coordonnees bancaires. Un vrai remboursement arrive tout seul sur le compte deja connu.",
  },
  {
    code: "menace", poids: 22, gravite: "eleve",
    motifs: [/amende/, /poursuites?/, /gendarmerie/, /police nationale/, /plainte/, /tribunal/,
             /mandat d'arret/, /cybercrim/, /pedopornograph/, /contenu pornographique/, /huissier/],
    titre: "Menace judiciaire ou policiere",
    explication: "La police et la justice ne notifient jamais par SMS ou par mail avec un lien de paiement. Ces messages jouent sur la peur et la honte pour empecher d'en parler autour de soi.",
  },
  {
    code: "colis", poids: 15, gravite: "moyen",
    motifs: [/colis/, /livraison/, /frais de douane/, /frais de dedouanement/, /votre commande/,
             /adresse incomplete/, /reprogrammer la livraison/],
    titre: "Pretexte du colis en attente",
    explication: "C'est le scenario le plus repandu en France, parce que presque tout le monde attend un colis. Verifiez directement sur le site du transporteur avec votre vrai numero de suivi.",
  },
  {
    code: "secret", poids: 20, gravite: "eleve",
    motifs: [/n'en parlez a personne/, /gardez (?:cela|ca) (?:secret|confidentiel)/, /entre nous/,
             /ne dites rien/, /discretion absolue/],
    titre: "On vous demande de garder le secret",
    explication: "Isoler la victime est une technique deliberee. Un interlocuteur legitime n'a aucune raison de vous empecher d'en parler a un proche ou a votre banque.",
  },
  {
    code: "surtaxe", poids: 20, gravite: "moyen",
    motifs: [/\b08\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}\b/, /numero surtaxe/],
    titre: "Numero surtaxe a rappeler",
    explication: "Les numeros en 08 sont factures a la minute. L'arnaque consiste parfois seulement a vous faire appeler et patienter.",
  },
  {
    code: "changement_rib", poids: 40, gravite: "critique",
    motifs: [/nouveau rib/, /changement de (?:rib|iban|coordonnees bancaires)/,
             /mise a jour de nos coordonnees bancaires/, /nouvelle domiciliation/],
    titre: "Annonce d'un changement de coordonnees bancaires",
    explication: "C'est la fraude au faux fournisseur : on detourne un virement en annoncant un nouveau RIB. Rappelez toujours votre contact au numero que vous connaissez deja, jamais celui du message.",
  },
  {
    code: "conseiller", poids: 30, gravite: "critique",
    motifs: [/conseiller (?:bancaire|securite)/, /service (?:anti)?[- ]?fraude/, /votre banque a detecte/,
             /operation suspecte/, /transferer? (?:vos fonds|votre argent)/, /compte securise/],
    titre: "Faux conseiller bancaire",
    explication: "Personne de votre banque ne vous demandera de deplacer votre argent vers un « compte securise » : ce compte est celui de l'escroc. Raccrochez et rappelez le numero figurant au dos de votre carte.",
  },
];

function analyserTexte(texte) {
  const t = sansAccent(texte);
  const signaux = [];
  for (const regle of REGLES_TEXTE) {
    if (regle.motifs.some((m) => m.test(t))) {
      const { motifs, ...signal } = regle;
      signaux.push(signal);
    }
  }
  return signaux;
}

// ---------------------------------------------------------------------------
// Conseils
// ---------------------------------------------------------------------------

function construireConseils(codes, niveau) {
  const conseils = [];
  if (niveau !== "sur") {
    conseils.push("Ne cliquez sur aucun lien de ce message et ne rappelez pas le numero qu'il indique.");
  }
  if (codes.has("donnees_bancaires") || codes.has("conseiller")) {
    conseils.push("Si vous avez deja saisi vos donnees : appelez immediatement votre banque pour faire opposition, puis changez le mot de passe concerne.");
  }
  if (codes.has("paiement_atypique")) {
    conseils.push("Si vous avez transmis des codes de carte cadeau, conservez les tickets : ils sont necessaires pour la plainte.");
  }
  if (codes.has("colis")) {
    conseils.push("Pour verifier un colis, tapez vous-meme l'adresse du transporteur et entrez votre numero de suivi. N'utilisez jamais le lien recu.");
  }
  if (codes.has("marque_usurpee") || codes.has("domaine_sosie")) {
    conseils.push("Prenez l'habitude de lire l'adresse de droite a gauche : le vrai site est le dernier nom avant la premiere barre oblique.");
  }
  if (codes.has("menace")) {
    conseils.push("Aucune administration ne reclame un paiement par message. En cas de doute, contactez le service concerne par son numero officiel.");
  }
  if (niveau !== "sur") {
    conseils.push("Signalement : transferez les SMS au 33700, et signalez le reste sur cybermalveillance.gouv.fr ou internet-signalement.gouv.fr.");
    conseils.push("Prevenez vos proches : ces campagnes visent en priorite les personnes agees et isolees.");
  }
  return conseils;
}

// ---------------------------------------------------------------------------
// Analyse complete
// ---------------------------------------------------------------------------

const NIVEAUX = {
  sur: { libelle: "Rien de suspect detecte", couleur: "vert" },
  douteux: { libelle: "Douteux, restez prudent", couleur: "ambre" },
  dangereux: { libelle: "Tres probablement une arnaque", couleur: "rouge" },
};

function analyser(texteBrut) {
  const texte = String(texteBrut || "").slice(0, 20000);
  const liens = extraireLiens(texte);
  const signaux = [];
  const detailsLiens = [];
  let marqueImitee = null;

  for (const lien of liens) {
    const res = analyserLien(lien);
    marqueImitee = marqueImitee || res.marqueImitee;
    detailsLiens.push({ adresse: lien.brut, domaine: res.racine, signaux: res.signaux });
    signaux.push(...res.signaux);
  }
  signaux.push(...analyserTexte(texte));

  // Un meme code ne compte qu'une fois, meme s'il apparait sur plusieurs liens.
  const uniques = [];
  const vus = new Set();
  for (const s of signaux) {
    if (vus.has(s.code)) continue;
    vus.add(s.code);
    uniques.push(s);
  }

  let score = Math.min(100, uniques.reduce((t, s) => t + s.poids, 0));
  // Un lien pique + une demande de donnees, c'est le scenario complet.
  if (vus.has("donnees_bancaires") && liens.length && score < 100) score = Math.min(100, score + 10);

  let niveau = score >= 50 ? "dangereux" : score >= 20 ? "douteux" : "sur";
  if (uniques.some((s) => s.gravite === "critique")) niveau = "dangereux";

  const ordre = { critique: 0, eleve: 1, moyen: 2, info: 3 };
  uniques.sort((a, b) => ordre[a.gravite] - ordre[b.gravite] || b.poids - a.poids);

  return {
    niveau,
    libelle: NIVEAUX[niveau].libelle,
    couleur: NIVEAUX[niveau].couleur,
    score,
    marqueImitee,
    liens: detailsLiens,
    signaux: uniques,
    conseils: construireConseils(vus, niveau),
    analyseLe: new Date().toISOString(),
  };
}

module.exports = { analyser, extraireLiens, analyserLien, analyserTexte, domaineRacine, distance };
