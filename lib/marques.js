"use strict";
/**
 * Marques les plus usurpees dans les arnaques francaises, avec leur domaine
 * officiel. Sert a deux controles :
 *  - le nom de la marque apparait dans l'adresse mais le domaine n'est pas le
 *    sien (ameli.fr.connexion-secure.top) ;
 *  - le domaine ressemble a s'y meprendre a l'officiel (arneli.fr, impot-gouv.fr).
 */

// mot-cle -> domaines officiels legitimes
const MARQUES = {
  ameli: ["ameli.fr"],
  impots: ["impots.gouv.fr", "dgfip.finances.gouv.fr"],
  impot: ["impots.gouv.fr"],
  urssaf: ["urssaf.fr", "autoentrepreneur.urssaf.fr"],
  caf: ["caf.fr"],
  antai: ["antai.gouv.fr"],
  amendes: ["antai.gouv.fr", "amendes.gouv.fr"],
  cpf: ["moncompteformation.gouv.fr"],
  moncompteformation: ["moncompteformation.gouv.fr"],
  laposte: ["laposte.fr", "laposte.net"],
  colissimo: ["laposte.fr"],
  chronopost: ["chronopost.fr"],
  mondialrelay: ["mondialrelay.fr"],
  dhl: ["dhl.com", "dhl.fr"],
  ups: ["ups.com"],
  fedex: ["fedex.com"],
  edf: ["edf.fr"],
  engie: ["engie.fr"],
  orange: ["orange.fr"],
  sfr: ["sfr.fr"],
  free: ["free.fr"],
  bouygues: ["bouyguestelecom.fr"],
  netflix: ["netflix.com"],
  amazon: ["amazon.fr", "amazon.com"],
  paypal: ["paypal.com", "paypal.fr"],
  leboncoin: ["leboncoin.fr"],
  vinted: ["vinted.fr"],
  apple: ["apple.com"],
  microsoft: ["microsoft.com", "live.com"],
  google: ["google.com", "google.fr"],
  ovh: ["ovh.com", "ovhcloud.com"],
  // banques
  creditagricole: ["credit-agricole.fr", "ca-guadeloupe.fr"],
  bnpparibas: ["bnpparibas.net", "mabanque.bnpparibas"],
  societegenerale: ["societegenerale.fr", "particuliers.societegenerale.fr"],
  banquepostale: ["labanquepostale.fr"],
  caisseepargne: ["caisse-epargne.fr"],
  creditmutuel: ["creditmutuel.fr"],
  lcl: ["lcl.fr"],
  boursorama: ["boursorama.com", "boursobank.com"],
  revolut: ["revolut.com"],
  n26: ["n26.com"],
};

// Domaines officiels a plat, pour la detection de sosies.
const DOMAINES_OFFICIELS = [...new Set(Object.values(MARQUES).flat())];

// Extensions surrepresentees dans les campagnes d'hameconnage jetables.
const TLD_RISQUE = new Set([
  "top", "xyz", "icu", "club", "buzz", "cfd", "rest", "click", "link", "gq",
  "cf", "ml", "tk", "ga", "work", "fit", "sbs", "cyou", "quest", "lol", "bond",
]);

const RACCOURCISSEURS = new Set([
  "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly",
  "cutt.ly", "rb.gy", "shorturl.at", "s.id", "rebrand.ly", "urlz.fr", "lc.cx",
  "t.ly", "shre.ink", "urlr.me",
]);

module.exports = { MARQUES, DOMAINES_OFFICIELS, TLD_RISQUE, RACCOURCISSEURS };
