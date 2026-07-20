"use strict";
/**
 * Historique local des analyses (SQLite).
 *
 * On ne garde qu'un extrait du message, pas l'integralite : ces textes sont des
 * SMS et des mails prives, souvent ceux d'un client venu demander de l'aide.
 * Assez pour se souvenir d'une campagne en cours, pas assez pour constituer un
 * fichier de donnees personnelles.
 */
const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const EXTRAIT_MAX = 280;

function ouvrirBase(chemin) {
  fs.mkdirSync(path.dirname(chemin), { recursive: true });
  const db = new Database(chemin);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS analyses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      extrait TEXT NOT NULL,
      niveau TEXT NOT NULL,
      score INTEGER NOT NULL,
      marque TEXT,
      domaines TEXT,
      codes TEXT
    );
  `);
  try {
    fs.chmodSync(chemin, 0o600);
  } catch {
    /* systeme de fichiers sans permissions POSIX */
  }

  const insert = db.prepare(
    `INSERT INTO analyses (date, extrait, niveau, score, marque, domaines, codes)
     VALUES (@date, @extrait, @niveau, @score, @marque, @domaines, @codes)`
  );
  const lister = db.prepare(
    `SELECT id, date, extrait, niveau, score, marque, domaines, codes
     FROM analyses ORDER BY id DESC LIMIT ?`
  );

  return {
    enregistrer(texte, resultat) {
      insert.run({
        date: resultat.analyseLe,
        extrait: texte.slice(0, EXTRAIT_MAX),
        niveau: resultat.niveau,
        score: resultat.score,
        marque: resultat.marqueImitee,
        domaines: resultat.liens.map((l) => l.domaine).join(" "),
        codes: resultat.signaux.map((s) => s.code).join(" "),
      });
    },
    recents(n = 30) {
      return lister.all(n).map((r) => ({
        ...r,
        domaines: r.domaines ? r.domaines.split(" ").filter(Boolean) : [],
        codes: r.codes ? r.codes.split(" ").filter(Boolean) : [],
      }));
    },
    vider() {
      db.exec("DELETE FROM analyses");
    },
  };
}

module.exports = { ouvrirBase };
