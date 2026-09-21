"use strict";
// Version installée : dossier de données séparé du programme, fermeture depuis
// l'interface (protégée), version cohérente partout.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");
const { spawn } = require("node:child_process");

const portLibre = () => new Promise((ok) => { const s = net.createServer().listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => ok(p)); }); });
function requete(port, { methode = "GET", chemin, entetes = {}, corps } = {}) {
  return new Promise((ok, ko) => {
    const d = corps === undefined ? null : Buffer.from(JSON.stringify(corps));
    const r = http.request({ host: "127.0.0.1", port, method: methode, path: chemin, headers: Object.assign({ Host: `127.0.0.1:${port}` }, d ? { "Content-Type": "application/json", "Content-Length": d.length } : {}, entetes) }, (res) => {
      let t = ""; res.on("data", (c) => (t += c)); res.on("end", () => ok({ statut: res.statusCode, t }));
    });
    r.on("error", ko); if (d) r.write(d); r.end();
  });
}
async function demarrer(env) {
  const port = await portLibre();
  const enfant = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], { env: Object.assign({}, process.env, { PORT: String(port), KDL_NO_BROWSER: "1" }, env), stdio: "ignore" });
  for (let i = 0; i < 50; i++) { try { await requete(port, { chemin: "/api/sante" }); return { port, enfant }; } catch (_) { await new Promise((r) => setTimeout(r, 100)); } }
  throw new Error("serveur non démarré");
}

test("version identique dans package.json, package-lock.json et l'interface", () => {
  const v = require("../package.json").version;
  assert.equal(require("../package-lock.json").version, v);
  assert.match(fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8"), new RegExp(`data-ver="${v.replace(/\./g, "\\.")}"`));
});

test("KDL_ANTI_ARNAQUE_DATA : l'historique va dans ce dossier, pas à côté du programme", async () => {
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), "kdl-aa-donnees-"));
  const { port, enfant } = await demarrer({ KDL_ANTI_ARNAQUE_DATA: dossier, HISTORIQUE: "1" });
  try {
    assert.equal((await requete(port, { methode: "POST", chemin: "/api/analyse", corps: { texte: "Test https://colis-laposte.xyz" } })).statut, 200);
    assert.ok(fs.existsSync(path.join(dossier, "analyses.json")));
  } finally { enfant.kill(); fs.rmSync(dossier, { recursive: true, force: true }); }
});

test("fermeture : absente hors version installée ; sinon Origin locale + en-tête exigés", async () => {
  const normal = await demarrer({ HISTORIQUE: "0" });
  try {
    assert.equal(JSON.parse((await requete(normal.port, { chemin: "/api/sante" })).t).fermable, false);
    assert.equal((await requete(normal.port, { methode: "POST", chemin: "/api/arreter", entetes: { Origin: `http://127.0.0.1:${normal.port}`, "X-KDL-Fermer": "1" } })).statut, 404);
  } finally { normal.enfant.kill(); }
  const installe = await demarrer({ HISTORIQUE: "0", KDL_ANTI_ARNAQUE_FERMABLE: "1" });
  const o = `http://127.0.0.1:${installe.port}`;
  try {
    assert.equal((await requete(installe.port, { methode: "POST", chemin: "/api/arreter", entetes: { Origin: o } })).statut, 403, "sans en-tête");
    assert.equal((await requete(installe.port, { methode: "POST", chemin: "/api/arreter", entetes: { "X-KDL-Fermer": "1" } })).statut, 403, "sans Origin");
    assert.equal((await requete(installe.port, { methode: "POST", chemin: "/api/arreter", entetes: { Origin: "https://pirate.example", "X-KDL-Fermer": "1" } })).statut, 403, "Origin étrangère");
    assert.equal((await requete(installe.port, { methode: "POST", chemin: "/api/arreter", entetes: { Origin: "http://127.0.0.1:1", "X-KDL-Fermer": "1" } })).statut, 403, "autre port");
    const fin = new Promise((ok) => installe.enfant.on("exit", ok));
    assert.equal((await requete(installe.port, { methode: "POST", chemin: "/api/arreter", entetes: { Origin: o, "X-KDL-Fermer": "1" } })).statut, 200);
    assert.equal(await fin, 0, "le processus s'arrête proprement");
  } finally { installe.enfant.kill(); }
});
