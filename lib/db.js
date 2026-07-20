"use strict";
/**
 * Historique local des analyses (stockage JSON pur, sans dépendance native).
 * On ne garde qu'un extrait du message, pas l'intégralité : ce sont des SMS et
 * des mails privés. Assez pour se souvenir d'une campagne, pas assez pour
 * constituer un fichier de données personnelles.
 */
const { ouvrirStock } = require("./stockage");

const EXTRAIT_MAX = 280;
const PLAFOND = 500; // on ne conserve pas indéfiniment

function ouvrirBase(chemin) {
  const stock = ouvrirStock(chemin.replace(/\.db$/, ".json"), { seq: 0, analyses: [] });

  return {
    enregistrer(texte, resultat) {
      stock.data.analyses.push({
        id: stock.prochainId(),
        date: resultat.analyseLe,
        extrait: texte.slice(0, EXTRAIT_MAX),
        niveau: resultat.niveau,
        score: resultat.score,
        marque: resultat.marqueImitee,
        domaines: resultat.liens.map((l) => l.domaine).filter(Boolean),
        codes: resultat.signaux.map((s) => s.code),
      });
      if (stock.data.analyses.length > PLAFOND) {
        stock.data.analyses = stock.data.analyses.slice(-PLAFOND);
      }
      stock.sauver();
    },
    recents(n = 30) {
      return stock.data.analyses.slice(-n).reverse();
    },
    vider() {
      stock.data.analyses = [];
      stock.sauver();
    },
  };
}

module.exports = { ouvrirBase };
