"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { analyser, extraireLiens, domaineRacine, jetonsDebug } = require("../lib/analyse");

const codes = (r) => r.signaux.map((s) => s.code);

// ---------------------------------------------------------------------------
// Vraies arnaques : elles doivent toutes ressortir « dangereux »
// ---------------------------------------------------------------------------

test("SMS colis : marque du transporteur usurpee", () => {
  const r = analyser(
    "LA POSTE : votre colis est en attente de livraison. Merci de regler les frais de douane de 1,99 EUR sous 48h : http://laposte.fr.suivi-colis.top/pay"
  );
  assert.equal(r.niveau, "dangereux");
  assert.ok(codes(r).includes("marque_usurpee"));
  assert.ok(codes(r).includes("colis"));
  assert.equal(r.liens[0].domaine, "suivi-colis.top");
});

test("faux remboursement Ameli", () => {
  const r = analyser(
    "Assurance Maladie : vous beneficiez d'un remboursement de 148,32 EUR. Renseignez votre carte bancaire pour le recevoir : https://amelicompte-verification.xyz"
  );
  assert.equal(r.niveau, "dangereux");
  assert.ok(codes(r).includes("marque_usurpee"));
  assert.ok(codes(r).includes("donnees_bancaires"));
});

test("faux conseiller bancaire, sans aucun lien", () => {
  const r = analyser(
    "Bonjour, je suis votre conseiller du service anti-fraude. Votre banque a detecte une operation suspecte. Pour securiser vos avoirs, veuillez transferer vos fonds vers le compte securise que je vous communique. N'en parlez a personne."
  );
  assert.equal(r.niveau, "dangereux");
  assert.ok(codes(r).includes("conseiller"));
  assert.ok(codes(r).includes("secret"));
  assert.equal(r.liens.length, 0, "aucun lien dans ce message");
});

test("chantage a la webcam avec paiement en crypto", () => {
  const r = analyser(
    "J'ai acces a votre webcam et j'ai enregistre du contenu pornographique. Vous avez 24h pour payer 900 EUR en bitcoin, sinon j'envoie tout a vos contacts."
  );
  assert.equal(r.niveau, "dangereux");
  assert.ok(codes(r).includes("paiement_atypique"));
  assert.ok(codes(r).includes("menace"));
});

test("fraude au faux RIB fournisseur", () => {
  const r = analyser(
    "Suite a un changement de banque, merci de noter notre nouveau RIB pour le reglement de la facture 2026-0412."
  );
  assert.equal(r.niveau, "dangereux");
  assert.ok(codes(r).includes("changement_rib"));
});

test("domaine sosie a une lettre pres", () => {
  const r = analyser("Connectez-vous vite sur https://arneli.fr/compte");
  assert.equal(r.niveau, "dangereux");
  assert.ok(codes(r).includes("domaine_sosie"));
});

test("adresse qui cache sa destination avec un @", () => {
  const r = analyser("https://www.impots.gouv.fr@194.36.190.12/connexion");
  assert.equal(r.niveau, "dangereux");
  assert.ok(codes(r).includes("arobase_url"));
});

test("caracteres deguises (punycode)", () => {
  const r = analyser("https://xn--pypal-4ve.com/securite");
  assert.equal(r.niveau, "dangereux");
  assert.ok(codes(r).includes("punycode"));
});

// ---------------------------------------------------------------------------
// Messages legitimes : aucun faux positif tolere
// ---------------------------------------------------------------------------

test("message anodin entre amis", () => {
  const r = analyser("Salut Karim, on se voit demain a 15h pour le devis ? A tout.");
  assert.equal(r.niveau, "sur");
  assert.equal(r.signaux.length, 0);
});

test("lien vers un vrai site officiel", () => {
  const r = analyser("Ton attestation est dispo sur https://www.ameli.fr/assure/mon-compte");
  assert.equal(r.niveau, "sur");
  assert.ok(codes(r).includes("domaine_officiel"));
});

test("site professionnel quelconque", () => {
  const r = analyser("Le devis est en ligne sur https://kdl-tech.fr/services");
  assert.equal(r.niveau, "sur");
});

test("un mot ne doit pas etre pris pour une marque", () => {
  // « caf » dans cafetiere, « free » dans freelance : pieges classiques.
  for (const url of ["https://cafetiere-passion.fr", "https://freelance-design.com", "https://orangerie-versailles.fr"]) {
    const r = analyser("Regarde ce site : " + url);
    assert.equal(r.niveau, "sur", `${url} ne doit pas etre signale`);
    assert.equal(r.marqueImitee, null);
  }
});

test("le nom colle a un mot d'hameconnage est bien attrape", () => {
  const r = analyser("https://amelicompte.top/connexion");
  assert.ok(codes(r).includes("marque_usurpee"));
});

// ---------------------------------------------------------------------------
// Briques
// ---------------------------------------------------------------------------

test("extraction des liens sans faux positif sur la ponctuation", () => {
  const liens = extraireLiens("Bonjour.Merci de voir kdl-tech.fr, puis https://exemple.com/page.");
  const hotes = liens.map((l) => l.hote);
  assert.ok(hotes.includes("kdl-tech.fr"));
  assert.ok(hotes.includes("exemple.com"));
  assert.equal(liens.find((l) => l.hote === "exemple.com").brut.endsWith("."), false);
});

test("domaine racine avec suffixe compose", () => {
  assert.equal(domaineRacine("www.impots.gouv.fr"), "impots.gouv.fr");
  assert.equal(domaineRacine("a.b.c.arnaque.top"), "arnaque.top");
  assert.equal(domaineRacine("ameli.fr"), "ameli.fr");
});

test("le niveau douteux existe bien entre les deux", () => {
  const r = analyser("Regarde ca : https://bit.ly/3xKq9p");
  assert.equal(r.niveau, "douteux");
  assert.ok(codes(r).includes("raccourcisseur"));
});

test("chaque signal est explique en francais", () => {
  const r = analyser("http://laposte.fr.suivi.top/pay carte bancaire sous 24h");
  for (const s of r.signaux) {
    assert.ok(s.titre && s.titre.length > 5, `titre manquant pour ${s.code}`);
    assert.ok(s.explication && s.explication.length > 30, `explication trop courte pour ${s.code}`);
  }
  assert.ok(r.conseils.length >= 3);
});
