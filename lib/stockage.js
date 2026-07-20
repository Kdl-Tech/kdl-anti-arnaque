"use strict";
/**
 * Stockage local en JSON, pur JavaScript (aucune dependance native).
 * Choisi a la place de SQLite pour que l'app s'empaquette proprement en
 * executable sur Linux ET Windows, et s'installe sans compilateur.
 * Les volumes sont minuscules (historique plafonne) : un fichier JSON suffit.
 * Ecriture atomique : on ecrit un .tmp puis on renomme.
 */
const fs = require("fs");
const path = require("path");

function ouvrirStock(chemin, defaut) {
  fs.mkdirSync(path.dirname(chemin), { recursive: true });
  let data;
  try {
    data = JSON.parse(fs.readFileSync(chemin, "utf8"));
  } catch {
    data = JSON.parse(JSON.stringify(defaut));
  }
  function sauver() {
    const tmp = chemin + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(data));
    fs.renameSync(tmp, chemin);
    try { fs.chmodSync(chemin, 0o600); } catch { /* FS sans permissions POSIX */ }
  }
  return {
    data,
    sauver,
    prochainId() { data.seq = (data.seq || 0) + 1; return data.seq; },
  };
}

module.exports = { ouvrirStock };
