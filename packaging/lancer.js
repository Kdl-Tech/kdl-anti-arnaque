"use strict";
// Lanceur de la version installée de KDL Anti-arnaque (Linux .deb, Windows).
// Exécuté par le runtime Node OFFICIEL non modifié livré avec l'application :
//   Linux   : /opt/kdl-anti-arnaque/runtime/node app/lancer.js
//   Windows : conhost.exe --headless runtime\node.exe app\lancer.js (pas de fenêtre)
// - Données de l'utilisateur hors du dossier du programme (la désinstallation ne
//   les efface pas) : ~/.local/share/KDL/Anti-arnaque ou %LOCALAPPDATA%\KDL\Anti-arnaque.
// - Journal : journal.log (UTF-8) dans ce dossier ; rotation au-delà de 1 Mo.
// - Déjà lancée : on ouvre simplement le navigateur sur l'instance existante.
// - « --console » : messages affichés en console (diagnostic).
const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");

const PORT = Number(process.env.PORT || 4210);
const URL_APP = `http://localhost:${PORT}`;

function dossierDonnees() {
  if (process.platform === "win32") return path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local"), "KDL", "Anti-arnaque");
  const xdg = process.env.XDG_DATA_HOME && path.isAbsolute(process.env.XDG_DATA_HOME) ? process.env.XDG_DATA_HOME : path.join(os.homedir(), ".local", "share");
  return path.join(xdg, "KDL", "Anti-arnaque");
}

function ouvrirNavigateur() {
  const [cmd, args] = process.platform === "win32" ? ["cmd", ["/c", "start", "", URL_APP]]
    : process.platform === "darwin" ? ["open", [URL_APP]] : ["xdg-open", [URL_APP]];
  try { const c = spawn(cmd, args, { detached: true, stdio: "ignore", windowsHide: true }); c.on("error", () => {}); c.unref(); } catch (_) { /* navigateur absent */ }
}

// Une instance d'Anti-arnaque répond-elle déjà sur ce port ?
function dejaLancee() {
  return new Promise((ok) => {
    const r = http.get({ host: "127.0.0.1", port: PORT, path: "/api/integration/v1/etat", timeout: 1500 }, (res) => {
      let t = ""; res.on("data", (d) => (t += d));
      res.on("end", () => { try { ok(JSON.parse(t).application === "kdl-anti-arnaque"); } catch (_) { ok(false); } });
    });
    r.on("timeout", () => { r.destroy(); ok(false); });
    r.on("error", () => ok(false));
  });
}

(async () => {
  const donnees = dossierDonnees();
  fs.mkdirSync(donnees, { recursive: true, mode: 0o700 });
  if (!process.argv.includes("--console")) {
    const journal = path.join(donnees, "journal.log");
    let taille = -1;
    try { taille = fs.statSync(journal).size; } catch (_) { /* premier lancement */ }
    if (taille > 1024 * 1024) { try { fs.renameSync(journal, path.join(donnees, "journal-precedent.log")); taille = -1; } catch (_) { /* on continue d'ajouter */ } }
    if (taille < 0) fs.writeFileSync(journal, "﻿", { mode: 0o600 });
    const ecrire = (t) => { try { fs.appendFileSync(journal, String(t)); } catch (_) { /* disque plein */ } };
    const ligne = (niveau) => (...a) => ecrire(`${new Date().toISOString()} ${niveau} ${a.map((x) => (x instanceof Error ? x.stack : String(x))).join(" ")}\n`);
    console.log = console.info = ligne("INFO");
    console.warn = ligne("ALERTE");
    console.error = ligne("ERREUR");
    process.stdout.write = (t) => { ecrire(t); return true; };
    process.stderr.write = (t) => { ecrire(t); return true; };
  }
  if (await dejaLancee()) {
    console.log(`KDL Anti-arnaque est déjà lancée : ${URL_APP}`);
    ouvrirNavigateur();
    return;
  }
  process.env.KDL_ANTI_ARNAQUE_DATA = donnees;
  process.env.KDL_ANTI_ARNAQUE_FERMABLE = "1";
  process.on("uncaughtException", (e) => { console.error("Arrêt sur erreur :", e); process.exit(3); });
  require("./server.js");
})();
