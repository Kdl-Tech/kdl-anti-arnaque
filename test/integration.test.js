"use strict";
// Contrat d'intégration v1 + contrôle de l'hôte (serveur réel sur un port libre).
const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");
const { spawn } = require("node:child_process");

function portLibre() {
  return new Promise((ok) => { const s = net.createServer().listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => ok(p)); }); });
}
function requete(port, { methode = "GET", chemin, entetes = {}, corps } = {}) {
  return new Promise((ok, ko) => {
    const donnees = corps === undefined ? null : Buffer.from(typeof corps === "string" ? corps : JSON.stringify(corps));
    const r = http.request({ host: "127.0.0.1", port, method: methode, path: chemin,
      headers: Object.assign({ Host: `127.0.0.1:${port}` }, donnees ? { "Content-Type": "application/json", "Content-Length": donnees.length } : {}, entetes) }, (res) => {
      let t = ""; res.setEncoding("utf8"); res.on("data", (c) => (t += c));
      res.on("end", () => { let j = null; try { j = JSON.parse(t); } catch (_) { /* pas du JSON */ } ok({ statut: res.statusCode, json: j }); });
    });
    r.on("error", ko); if (donnees) r.write(donnees); r.end();
  });
}

let port, serveur;
test.before(async () => {
  port = await portLibre();
  serveur = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], { env: Object.assign({}, process.env, { PORT: String(port), KDL_NO_BROWSER: "1", HISTORIQUE: "0" }), stdio: "pipe" });
  for (let i = 0; i < 50; i++) {
    try { await requete(port, { chemin: "/api/sante" }); return; } catch (_) { await new Promise((r) => setTimeout(r, 100)); }
  }
  throw new Error("serveur non démarré");
});
test.after(() => serveur && serveur.kill());

test("état : application, version, contrat 1", async () => {
  const r = await requete(port, { chemin: "/api/integration/v1/etat" });
  assert.equal(r.statut, 200);
  assert.equal(r.json.application, "kdl-anti-arnaque");
  assert.equal(r.json.contrat, 1);
  assert.equal(r.json.version, require("../package.json").version);
});

test("analyse : synthèse sans le message, sans explication longue, avertissement présent", async () => {
  const message = "LA POSTE : payez 1,99 EUR ici http://laposte.fr.suivi-colis.top/pay";
  const r = await requete(port, { methode: "POST", chemin: "/api/integration/v1/analyse", corps: { texte: message } });
  assert.equal(r.statut, 200);
  assert.equal(r.json.niveau, "dangereux");
  assert.ok(r.json.signaux.length > 0 && r.json.signaux.every((s) => s.code && s.gravite && s.titre && !("explication" in s)));
  assert.ok(/pas une certitude/.test(r.json.avertissement));
  assert.ok(!JSON.stringify(r.json).includes("payez 1,99"), "le message ne doit pas être renvoyé");
});

test("analyse : message vide 400, trop long 413, JSON invalide 400", async () => {
  assert.equal((await requete(port, { methode: "POST", chemin: "/api/integration/v1/analyse", corps: { texte: "  " } })).statut, 400);
  assert.equal((await requete(port, { methode: "POST", chemin: "/api/integration/v1/analyse", corps: { texte: 12 } })).statut, 400);
  assert.equal((await requete(port, { methode: "POST", chemin: "/api/integration/v1/analyse", corps: { texte: "a".repeat(20001) } })).statut, 413);
  assert.equal((await requete(port, { methode: "POST", chemin: "/api/integration/v1/analyse", corps: "{pas du json" })).statut, 400);
});

test("requête venant d'une page web (Origin) : 403", async () => {
  for (const origine of ["https://site-pirate.example", "http://127.0.0.1:" + port]) {
    assert.equal((await requete(port, { chemin: "/api/integration/v1/etat", entetes: { Origin: origine } })).statut, 403);
    assert.equal((await requete(port, { methode: "POST", chemin: "/api/integration/v1/analyse", entetes: { Origin: origine }, corps: { texte: "x" } })).statut, 403);
  }
});

test("Host étranger (DNS rebinding) : 421 partout, y compris l'historique", async () => {
  for (const chemin of ["/api/historique", "/api/sante", "/api/integration/v1/etat", "/"]) {
    assert.equal((await requete(port, { chemin, entetes: { Host: "piege.example:" + port } })).statut, 421);
  }
  assert.equal((await requete(port, { methode: "DELETE", chemin: "/api/historique", entetes: { Host: "piege.example" } })).statut, 421);
  assert.equal((await requete(port, { chemin: "/api/sante", entetes: { Host: "localhost:" + port } })).statut, 200);
});
