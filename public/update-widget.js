// KDL Update Widget — bouton « Mises à jour » (opt-in, aucune donnée envoyée par défaut).
// Lien direct vers https://kdl-tech.fr/updates ; vérification auto uniquement si activée.
(function () {
  var s = document.currentScript;
  var APP = s.getAttribute("data-app"), VER = s.getAttribute("data-ver");
  var K = "kdl_autoupdate_" + APP, UPDATES = "https://kdl-tech.fr/updates";
  function cmp(a, b) {
    a = (a || "0").split(".").map(Number); b = (b || "0").split(".").map(Number);
    for (var i = 0; i < 3; i++) { var x = a[i] || 0, y = b[i] || 0; if (x > y) return 1; if (x < y) return -1; }
    return 0;
  }
  var btn = document.getElementById("kdl-upd-btn"),
      panel = document.getElementById("kdl-upd-panel"),
      auto = document.getElementById("kdl-upd-auto");
  document.getElementById("kdl-upd-cur").textContent = "Version actuelle : " + VER;
  auto.checked = localStorage.getItem(K) === "1";
  btn.onclick = function () { panel.hidden = !panel.hidden; };
  auto.onchange = function () { localStorage.setItem(K, auto.checked ? "1" : "0"); if (auto.checked) check(); };
  function check() {
    fetch("https://kdl-tech.fr/telechargements/versions.json", { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var m = d.apps && d.apps[APP];
        if (m && cmp(m.version, VER) > 0) {
          document.getElementById("kdl-upd-txt").textContent =
            "Nouvelle version " + m.version + " disponible (vous avez " + VER + ").";
          document.getElementById("kdl-upd-dl").href = m.download || UPDATES;
          document.getElementById("kdl-upd-bar").hidden = false;
        }
      }).catch(function () {});
  }
  if (localStorage.getItem(K) === "1") check();
})();
