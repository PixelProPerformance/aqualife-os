/**
 * AQUALIFE — alternância de tema (escuro padrão / claro opcional).
 * O tema é aplicado o quanto antes por um script inline no <head> de cada
 * página (evita "flash"). Este arquivo só cria o botão flutuante de troca.
 */
(function () {
  "use strict";
  var KEY = "aq_theme";
  function atual() {
    return document.documentElement.getAttribute("data-theme") || "dark";
  }
  function aplicar(t) {
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem(KEY, t); } catch (e) {}
    var b = document.getElementById("aqThemeToggle");
    if (b) { b.textContent = t === "dark" ? "☀️" : "🌙"; b.title = t === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"; }
  }
  function montar() {
    if (document.getElementById("aqThemeToggle")) return;
    var b = document.createElement("button");
    b.id = "aqThemeToggle";
    b.className = "theme-toggle";
    b.setAttribute("aria-label", "Alternar tema");
    b.onclick = function () { aplicar(atual() === "dark" ? "light" : "dark"); };
    document.body.appendChild(b);
    aplicar(atual());
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", montar);
  else montar();
})();
