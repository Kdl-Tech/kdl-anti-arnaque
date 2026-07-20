"use strict";
/* Interface KDL Anti-arnaque. Le QR code est decode ICI, dans le navigateur :
   l'image ne quitte jamais l'appareil. */

const $ = (id) => document.getElementById(id);
const message = $("message");
const etatQr = $("etat-qr");

function texte(el, valeur) { el.textContent = valeur; }

function afficherEtat(msg) {
  if (!msg) { etatQr.hidden = true; return; }
  etatQr.hidden = false;
  texte(etatQr, msg);
}

// --- Analyse -------------------------------------------------------------

async function analyser() {
  const contenu = message.value.trim();
  if (!contenu) { message.focus(); return; }
  const bouton = $("analyser");
  bouton.disabled = true;
  bouton.textContent = "Analyse…";
  try {
    const rep = await fetch("/api/analyse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texte: contenu }),
    });
    const data = await rep.json();
    if (!rep.ok) throw new Error(data.erreur || "Analyse impossible.");
    afficher(data);
    chargerHistorique();
  } catch (e) {
    afficherEtat(e.message);
  } finally {
    bouton.disabled = false;
    bouton.textContent = "Analyser";
  }
}

function afficher(r) {
  $("resultat").hidden = false;

  const verdict = $("verdict");
  verdict.className = "verdict " + r.couleur;
  texte($("verdict-libelle"), r.libelle);
  texte($("verdict-score"), r.score);
  texte(
    $("verdict-detail"),
    r.marqueImitee
      ? `Ce message se fait passer pour « ${r.marqueImitee} ».`
      : r.niveau === "sur"
        ? "Aucun signal d'arnaque connu dans ce message."
        : "Plusieurs éléments méritent votre attention."
  );

  // Liens
  const liens = $("liens");
  liens.replaceChildren();
  for (const l of r.liens) {
    const li = document.createElement("li");
    const dom = document.createElement("div");
    dom.className = "domaine";
    dom.textContent = l.domaine;
    const adr = document.createElement("div");
    adr.className = "adresse";
    adr.textContent = l.adresse;
    li.append(dom, adr);
    liens.append(li);
  }
  $("bloc-liens").hidden = r.liens.length === 0;

  // Signaux
  const signaux = $("signaux");
  signaux.replaceChildren();
  for (const s of r.signaux) {
    const li = document.createElement("li");
    li.className = s.gravite;
    const t = document.createElement("span");
    t.className = "titre";
    t.textContent = s.titre;
    const ex = document.createElement("span");
    ex.className = "explication";
    ex.textContent = s.explication;
    li.append(t, ex);
    signaux.append(li);
  }
  $("bloc-signaux").hidden = r.signaux.length === 0;

  // Conseils
  const conseils = $("conseils");
  conseils.replaceChildren();
  for (const c of r.conseils) {
    const li = document.createElement("li");
    li.textContent = c;
    conseils.append(li);
  }
  $("bloc-conseils").hidden = r.conseils.length === 0;

  $("resultat").scrollIntoView({ behavior: "smooth", block: "start" });
}

// --- QR code (decodage local) -------------------------------------------

function lireQr(fichier) {
  afficherEtat("Lecture du QR code…");
  const img = new Image();
  const url = URL.createObjectURL(fichier);
  img.onload = () => {
    const max = 1400;
    const ratio = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * ratio);
    c.height = Math.round(img.height * ratio);
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, c.width, c.height);
    const pixels = ctx.getImageData(0, 0, c.width, c.height);
    URL.revokeObjectURL(url);

    const code = window.jsQR(pixels.data, pixels.width, pixels.height, { inversionAttempts: "attemptBoth" });
    if (!code || !code.data) {
      afficherEtat("Aucun QR code lisible sur cette image. Essayez une photo plus nette ou plus proche.");
      return;
    }
    afficherEtat("QR code décodé : analyse en cours.");
    message.value = code.data;
    analyser();
  };
  img.onerror = () => afficherEtat("Image illisible.");
  img.src = url;
}

// --- Historique ----------------------------------------------------------

async function chargerHistorique() {
  const liste = $("historique");
  try {
    const items = await (await fetch("/api/historique")).json();
    liste.replaceChildren();
    if (!items.length) {
      const li = document.createElement("li");
      li.className = "vide";
      li.textContent = "Aucune analyse pour l'instant.";
      liste.append(li);
      return;
    }
    for (const it of items) {
      const li = document.createElement("li");
      const p = document.createElement("span");
      p.className = "pastille " + (it.niveau === "dangereux" ? "rouge" : it.niveau === "douteux" ? "ambre" : "vert");
      const ex = document.createElement("span");
      ex.className = "extrait";
      ex.textContent = it.extrait;
      const q = document.createElement("span");
      q.className = "quand";
      q.textContent = new Date(it.date).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
      li.append(p, ex, q);
      liste.append(li);
    }
  } catch {
    /* historique indisponible : ce n'est pas bloquant */
  }
}

// --- Branchements --------------------------------------------------------

$("analyser").addEventListener("click", analyser);
message.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") analyser();
});
$("effacer").addEventListener("click", () => {
  message.value = "";
  $("resultat").hidden = true;
  afficherEtat("");
  message.focus();
});
$("fichier-qr").addEventListener("change", (e) => {
  const f = e.target.files && e.target.files[0];
  if (f) lireQr(f);
  e.target.value = "";
});
$("vider").addEventListener("click", async () => {
  await fetch("/api/historique", { method: "DELETE" });
  chargerHistorique();
});

chargerHistorique();
