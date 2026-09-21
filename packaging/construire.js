#!/usr/bin/env node
"use strict";
// Construit la version installable de KDL Anti-arnaque.
//
//   KDL_NODE_SHASUMS=SHASUMS256.txt KDL_NODE_LINUX_TAR=node-v24.x-linux-x64.tar.xz node packaging/construire.js linux
//   KDL_NODE_SHASUMS=SHASUMS256.txt KDL_NODE_WIN=node.exe                           node packaging/construire.js windows
//
// Runtime : Node OFFICIEL non modifié (empreinte vérifiée contre SHASUMS256.txt de
// nodejs.org), jamais d'exécutable fabriqué (pkg / Node SEA : binaires modifiés non
// signés, bloqués par Smart App Control sous Windows 11).
// Application : fichiers du dépôt + dépendances de production seules
// (npm ci --omit=dev --ignore-scripts). Ni tests, ni données, ni historique.
// Linux → dist/kdl-anti-arnaque_<version>_amd64.deb (dpkg-deb, fakeroot).
// Windows → dist/windows/kdl-anti-arnaque/, puis sur Windows : ISCC.exe packaging\kdl-anti-arnaque.iss
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");

const RACINE = path.resolve(__dirname, "..");
const PAQUET = require("../package.json");
const VERSION = PAQUET.version;
const cible = process.argv[2];
if (!["linux", "windows"].includes(cible)) { console.error("usage : construire.js linux|windows"); process.exit(2); }
const sha = (f) => crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex");
function verifier(fichier, nomDansShasums) {
  const sums = process.env.KDL_NODE_SHASUMS;
  if (!sums || !fs.existsSync(sums)) throw new Error("KDL_NODE_SHASUMS : SHASUMS256.txt de nodejs.org requis");
  const ligne = fs.readFileSync(sums, "utf8").split("\n").find((l) => l.trim().endsWith("  " + nomDansShasums));
  if (!ligne || ligne.split(/\s+/)[0] !== sha(fichier)) throw new Error(`empreinte de ${nomDansShasums} non conforme à SHASUMS256.txt`);
}

const SORTIE = path.join(RACINE, "dist", cible, "kdl-anti-arnaque");
fs.rmSync(SORTIE, { recursive: true, force: true });
const APP = cible === "linux" ? path.join(SORTIE, "opt", "kdl-anti-arnaque", "app") : path.join(SORTIE, "app");
const RUNTIME = path.join(path.dirname(APP), "runtime");
fs.mkdirSync(APP, { recursive: true });
fs.mkdirSync(RUNTIME, { recursive: true });

// 1. Application
for (const e of ["server.js", "package.json", "package-lock.json", "lib", "public", "LICENSE"]) fs.cpSync(path.join(RACINE, e), path.join(APP, e), { recursive: true });
fs.copyFileSync(path.join(__dirname, "lancer.js"), path.join(APP, "lancer.js"));
execFileSync("npm", ["ci", "--omit=dev", "--ignore-scripts", "--no-audit", "--no-fund"], { cwd: APP, stdio: "ignore" });
for (const interdit of ["data", "test", "dist", ".git", ".env"]) if (fs.existsSync(path.join(APP, interdit))) throw new Error(`${interdit} ne doit pas être livré`);

// 2. Runtime officiel
if (cible === "linux") {
  const tar = process.env.KDL_NODE_LINUX_TAR;
  if (!tar || !fs.existsSync(tar)) throw new Error("KDL_NODE_LINUX_TAR requis");
  verifier(tar, path.basename(tar));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "kdl-aa-node-"));
  execFileSync("tar", ["-xJf", tar, "-C", tmp]);
  const dossier = path.join(tmp, path.basename(tar).replace(/\.tar\.xz$/, ""));
  fs.copyFileSync(path.join(dossier, "bin", "node"), path.join(RUNTIME, "node"));
  fs.copyFileSync(path.join(dossier, "LICENSE"), path.join(RUNTIME, "LICENSE"));
  fs.rmSync(tmp, { recursive: true, force: true });
} else {
  const exe = process.env.KDL_NODE_WIN;
  if (!exe || !fs.existsSync(exe)) throw new Error("KDL_NODE_WIN requis");
  verifier(exe, "win-x64/node.exe");
  fs.copyFileSync(exe, path.join(RUNTIME, "node.exe"));
  const licence = process.env.KDL_NODE_LICENCE;   // LICENSE de Node (identique pour toutes les plateformes)
  if (!licence || !fs.existsSync(licence)) throw new Error("KDL_NODE_LICENCE : fichier LICENSE de Node requis");
  fs.copyFileSync(licence, path.join(RUNTIME, "LICENSE"));
  fs.copyFileSync(path.join(__dirname, "kdl-anti-arnaque.ico"), path.join(SORTIE, "kdl-anti-arnaque.ico"));
  console.log(`KDL Anti-arnaque ${VERSION} — ${path.relative(RACINE, SORTIE)} prêt pour Inno Setup.`);
  process.exit(0);
}

// 3. Paquet Debian
const ecrire = (rel, contenu, mode = 0o644) => { const f = path.join(SORTIE, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, contenu, { mode }); fs.chmodSync(f, mode); };
ecrire("usr/bin/kdl-anti-arnaque", "#!/bin/sh\n# KDL Anti-arnaque — lanceur (127.0.0.1:4210, données dans ~/.local/share/KDL/Anti-arnaque)\nexec /opt/kdl-anti-arnaque/runtime/node /opt/kdl-anti-arnaque/app/lancer.js \"$@\"\n", 0o755);
ecrire("usr/share/applications/kdl-anti-arnaque.desktop", [
  "[Desktop Entry]", "Type=Application", "Version=1.0", "Name=KDL Anti-arnaque",
  "Comment=Vérifier un SMS, un mail ou un lien suspect (analyse locale)", "Exec=kdl-anti-arnaque",
  "Icon=kdl-anti-arnaque", "Terminal=false", "Categories=Utility;Security;", "Keywords=arnaque;phishing;SMS;hameçonnage;", "StartupNotify=false", ""].join("\n"));
fs.mkdirSync(path.join(SORTIE, "usr/share/icons/hicolor/256x256/apps"), { recursive: true });
fs.copyFileSync(path.join(RACINE, "public", "icone.png"), path.join(SORTIE, "usr/share/icons/hicolor/256x256/apps/kdl-anti-arnaque.png"));
ecrire("usr/share/doc/kdl-anti-arnaque/copyright", `KDL Anti-arnaque ${VERSION} — KDL TECH — https://kdl-tech.fr/\nLicence : MIT (voir /opt/kdl-anti-arnaque/app/LICENSE).\nRuntime : Node.js (licence : /opt/kdl-anti-arnaque/runtime/LICENSE).\n`);
fs.chmodSync(path.join(RUNTIME, "node"), 0o755);
// prerm : arrête les instances lancées depuis CE paquet (chemin exact du runtime), jamais les autres node.
ecrire("DEBIAN/prerm", `#!/bin/sh
set -e
for p in /proc/[0-9]*; do
  if [ "$(readlink "$p/exe" 2>/dev/null)" = "/opt/kdl-anti-arnaque/runtime/node" ]; then kill "\${p#/proc/}" 2>/dev/null || true; fi
done
exit 0
`, 0o755);
const taille = Number(execFileSync("du", ["-sk", "--exclude=DEBIAN", SORTIE]).toString().split(/\s/)[0]);
ecrire("DEBIAN/control", [
  "Package: kdl-anti-arnaque", `Version: ${VERSION}`, "Architecture: amd64", "Maintainer: KDL TECH <contact@kdl-tech.fr>",
  `Installed-Size: ${taille}`, "Depends: libc6 (>= 2.28), libstdc++6, xdg-utils", "Section: utils", "Priority: optional",
  "Homepage: https://kdl-tech.fr/logiciels/kdl-anti-arnaque/",
  "Description: Analyse locale d'un SMS, d'un mail ou d'un lien suspect",
  " Colle un message reçu : KDL Anti-arnaque rend un verdict explicable (signaux",
  " vérifiables, aucune IA, aucune requête réseau) et indique quoi faire.",
  " Écoute uniquement sur 127.0.0.1:4210. Données dans ~/.local/share/KDL/Anti-arnaque,",
  " jamais supprimées par la désinstallation.", ""].join("\n"));
execFileSync("find", [SORTIE, "-type", "d", "-exec", "chmod", "755", "{}", "+"]);
execFileSync("find", [SORTIE, "-type", "f", "-exec", "chmod", "go-w", "{}", "+"]);
const deb = path.join(RACINE, "dist", `kdl-anti-arnaque_${VERSION}_amd64.deb`);
execFileSync("fakeroot", ["dpkg-deb", "--build", "--root-owner-group", "-Zxz", SORTIE, deb], { stdio: "ignore" });
console.log(`${path.relative(RACINE, deb)}  ${sha(deb)}`);
