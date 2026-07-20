"use strict";
/**
 * KDL Anti-arnaque — serveur local.
 *
 * Ecoute par defaut sur 127.0.0.1 : l'app est un outil personnel, pas un service
 * public. Les messages analysés sont souvent des SMS privés de la personne qui
 * demande de l'aide ; ils ne sortent jamais de la machine et ne sont conservés
 * que si l'historique est active.
 */
const path = require("path");
const express = require("express");
const { analyser } = require("./lib/analyse");
const { ouvrirBase } = require("./lib/db");

const PORT = Number(process.env.PORT || 4210);
const HOTE = process.env.HOTE || "127.0.0.1";
const HISTORIQUE = process.env.HISTORIQUE !== "0";

const app = express();
const base = ouvrirBase(path.join(__dirname, "data", "analyses.db"));

app.use(express.json({ limit: "256kb" }));
app.disable("x-powered-by");
app.use((_req, res, next) => {
  res.set("X-Content-Type-Options", "nosniff");
  res.set("Referrer-Policy", "no-referrer");
  res.set(
    "Content-Security-Policy",
    "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; base-uri 'none'; form-action 'none'"
  );
  next();
});

app.post("/api/analyse", (req, res) => {
  const texte = String(req.body && req.body.texte ? req.body.texte : "").trim();
  if (!texte) return res.status(400).json({ erreur: "Message vide." });
  if (texte.length > 20000) return res.status(413).json({ erreur: "Message trop long." });

  const resultat = analyser(texte);
  if (HISTORIQUE) {
    try {
      base.enregistrer(texte, resultat);
    } catch (e) {
      console.error("[HISTORIQUE]", e.message);
    }
  }
  res.json(resultat);
});

app.get("/api/historique", (_req, res) => {
  res.json(HISTORIQUE ? base.recents(30) : []);
});

app.delete("/api/historique", (_req, res) => {
  base.vider();
  res.json({ ok: true });
});

app.get("/api/sante", (_req, res) => {
  res.json({ app: "kdl-anti-arnaque", version: require("./package.json").version, historique: HISTORIQUE });
});

app.use(express.static(path.join(__dirname, "public"), { maxAge: "1h" }));

app.listen(PORT, HOTE, () => {
  console.log(`KDL Anti-arnaque -> http://${HOTE}:${PORT}`);
  if (!HISTORIQUE) console.log("Historique desactive (HISTORIQUE=0).");
});
