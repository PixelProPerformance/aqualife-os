/**
 * AQUALIFE ANALYTICS — tracker do navegador (LGPD-friendly).
 * Inclua com: <script src="/js/analytics.js" defer></script>
 * Expõe window.aqtrack(nome, props) para eventos manuais.
 */
(function () {
  "use strict";
  var ENDPOINT = "/api/analytics/collect";
  var COOKIE = "aq_consent";           // 'accept' | 'reject'
  var SESSION_MAX = 30 * 60 * 1000;    // 30 min de inatividade encerra a sessão

  // ---------- util ----------
  function getCookie(n) { return (document.cookie.match("(^|;)\\s*" + n + "\\s*=\\s*([^;]+)") || [])[2]; }
  function setCookie(n, v, dias) {
    var d = new Date(); d.setTime(d.getTime() + dias * 864e5);
    document.cookie = n + "=" + v + ";expires=" + d.toUTCString() + ";path=/;SameSite=Lax";
  }
  function uid() {
    try { return crypto.randomUUID(); }
    catch (e) { return "x" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); }
  }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} }
  function ss(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) {} }

  var consent = getCookie(COOKIE);
  var ativo = consent === "accept";

  // ---------- identidade ----------
  function anonId() {
    var id = ls("aq_aid"); if (!id) { id = uid(); ls("aq_aid", id); }
    if (!getCookie("aq_aid")) setCookie("aq_aid", id, 365); // deixa o servidor ler o mesmo id
    return id;
  }
  function sessionId() {
    var id = ss("aq_sid"), ts = +ss("aq_sid_ts") || 0, agora = Date.now();
    if (!id || (agora - ts) > SESSION_MAX) { id = uid(); ss("aq_sid", id); }
    ss("aq_sid_ts", agora); return id;
  }
  function userId() {
    try { var u = JSON.parse(localStorage.getItem("aqualife_user") || "null"); return (u && u.id) || null; }
    catch (e) { return null; }
  }
  function utm() {
    var p = new URLSearchParams(location.search);
    return { s: p.get("utm_source"), m: p.get("utm_medium"), c: p.get("utm_campaign") };
  }

  // ---------- fila e envio ----------
  var fila = [];
  function base(nome, props) {
    var u = utm();
    return {
      name: nome, anon_id: anonId(), user_id: userId(), session_id: sessionId(),
      path: location.pathname + location.hash, referrer: document.referrer || null,
      utm_source: u.s, utm_medium: u.m, utm_campaign: u.c,
      lang: (navigator.language || "").slice(0, 12), props: props || null, ts: new Date().toISOString(),
    };
  }
  function enfileirar(nome, props) {
    if (!ativo) return;
    fila.push(base(nome, props));
    if (fila.length >= 12) flush();
  }
  function flush(sincrono) {
    if (!ativo || !fila.length) return;
    var lote = fila.splice(0, fila.length);
    var payload = JSON.stringify({ events: lote });
    try {
      if (sincrono && navigator.sendBeacon) navigator.sendBeacon(ENDPOINT, new Blob([payload], { type: "application/json" }));
      else fetch(ENDPOINT, { method: "POST", headers: { "content-type": "application/json" }, body: payload, keepalive: true }).catch(function () {});
    } catch (e) {}
  }
  setInterval(function () { flush(false); }, 5000);

  // API pública
  window.aqtrack = function (nome, props) { enfileirar(nome, props); };

  // ---------- captura automática ----------
  var entrou = Date.now(), maxScroll = 0, marcos = {};
  function pageView() { entrou = Date.now(); maxScroll = 0; marcos = {}; enfileirar("page_view", { title: document.title }); }

  function onScroll() {
    var h = document.documentElement, alt = (h.scrollHeight - h.clientHeight) || 1;
    var pct = Math.min(100, Math.round((h.scrollTop || document.body.scrollTop) / alt * 100));
    if (pct > maxScroll) maxScroll = pct;
    [25, 50, 75, 100].forEach(function (m) {
      if (pct >= m && !marcos[m]) { marcos[m] = 1; enfileirar("scroll", { depth: m }); }
    });
  }
  function tempoNaPagina() {
    var s = Math.round((Date.now() - entrou) / 1000);
    if (s > 0 && s < 7200) enfileirar("time_on_page", { seconds: s, max_scroll: maxScroll, path: location.pathname + location.hash });
  }

  // cliques: botões, links e qualquer elemento com data-ev
  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-ev], button, a");
    if (!el) return;
    if (el.hasAttribute("data-ev")) {
      var extra = {}; if (el.dataset.evProps) { try { extra = JSON.parse(el.dataset.evProps); } catch (x) {} }
      enfileirar(el.getAttribute("data-ev"), Object.assign({ text: (el.innerText || "").trim().slice(0, 60) }, extra));
      return;
    }
    var txt = (el.innerText || el.getAttribute("aria-label") || "").trim().slice(0, 60);
    var id = el.id ? "#" + el.id : "";
    var href = el.getAttribute("href") || null;
    enfileirar("click", { tag: el.tagName.toLowerCase(), text: txt, id: id, href: href });
    // download automático: link para arquivo
    if (href && /\.(pdf|zip|docx?|xlsx?|pptx?|csv|png|jpe?g|mp4|mp3|rar)(\?|$)/i.test(href))
      enfileirar("download", { href: href.slice(0, 300), text: txt });
  }, true);

  // ---------- auto-instrumentação (sem editar as páginas) ----------
  // Vídeos <video>: início e conclusão
  document.addEventListener("play", function (e) {
    if (e.target && e.target.tagName === "VIDEO") enfileirar("video_start", { src: (e.target.currentSrc || "").slice(0, 200) });
  }, true);
  document.addEventListener("ended", function (e) {
    if (e.target && e.target.tagName === "VIDEO") enfileirar("video_complete", { src: (e.target.currentSrc || "").slice(0, 200) });
  }, true);

  // Busca no Aquabook: captura o termo digitado (debounce), sem depender do markup exato
  var buscaTimer = null;
  document.addEventListener("input", function (e) {
    var el = e.target;
    if (!el || el.tagName !== "INPUT") return;
    var tipo = (el.type || "text").toLowerCase();
    var chave = ((el.name || "") + (el.id || "") + (el.placeholder || "")).toLowerCase();
    var naPagina = /aquabook/.test(location.pathname + location.hash);
    var pareceBusca = tipo === "search" || /busca|search|pesquis|esp[eé]cie|peixe/.test(chave);
    if (!(naPagina || pareceBusca)) return;
    clearTimeout(buscaTimer);
    var val = (el.value || "").trim();
    buscaTimer = setTimeout(function () {
      if (val.length >= 3) enfileirar("aquabook_search", { q: val.slice(0, 80) });
    }, 900);
  }, true);

  // Envio de formulário: intenção de cadastro / login
  document.addEventListener("submit", function (e) {
    var f = e.target; if (!f || f.tagName !== "FORM") return;
    var chave = ((f.id || "") + (f.className || "") + (f.getAttribute("action") || "") + (location.pathname)).toLowerCase();
    if (/cadastr|signup|registr|criar.?conta/.test(chave)) enfileirar("signup_start", {});
    else if (/login|entrar|acesso/.test(chave)) enfileirar("login", {});
  }, true);

  // erros de JS
  window.addEventListener("error", function (e) {
    enfileirar("js_error", { message: (e.message || "").slice(0, 200), source: (e.filename || "").slice(0, 200), line: e.lineno });
  });

  // performance (LCP simplificado + tempo de carregamento) uma vez
  window.addEventListener("load", function () {
    setTimeout(function () {
      try {
        var nav = performance.getEntriesByType("navigation")[0];
        var lcpE = performance.getEntriesByType("largest-contentful-paint");
        enfileirar("perf", {
          load_ms: nav ? Math.round(nav.loadEventEnd) : null,
          ttfb_ms: nav ? Math.round(nav.responseStart) : null,
          lcp_ms: lcpE && lcpE.length ? Math.round(lcpE[lcpE.length - 1].startTime) : null,
        });
      } catch (e) {}
    }, 0);
  });

  window.addEventListener("scroll", function () { window.requestAnimationFrame(onScroll); }, { passive: true });
  window.addEventListener("hashchange", function () { tempoNaPagina(); pageView(); });
  window.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") { tempoNaPagina(); flush(true); } });
  window.addEventListener("pagehide", function () { tempoNaPagina(); flush(true); });

  // Conversões detectadas pela URL de retorno (uma vez por sessão)
  function conversoesPorUrl() {
    try {
      var p = new URLSearchParams(location.search);
      if (p.get("ag") === "ok" && !ss("aq_conv_ag")) {
        ss("aq_conv_ag", "1");
        enfileirar("booking_submit", {}); enfileirar("purchase_complete", { tipo: "agendamento" });
      }
      if ((p.get("assinatura") === "ok" || p.get("care") === "ok") && !ss("aq_conv_care")) {
        ss("aq_conv_care", "1");
        enfileirar("purchase_complete", { tipo: "care" });
      }
    } catch (e) {}
  }

  function iniciar() { pageView(); conversoesPorUrl(); }

  // ---------- consentimento LGPD ----------
  function ativar() { ativo = true; setCookie(COOKIE, "accept", 365); iniciar(); }
  function recusar() { ativo = false; setCookie(COOKIE, "reject", 365); }

  function banner() {
    if (getCookie(COOKIE)) { if (consent === "accept") iniciar(); return; }
    var css = document.createElement("style");
    css.textContent = ".aqc{position:fixed;left:16px;right:16px;bottom:16px;z-index:9999;max-width:560px;margin:0 auto;background:#12333F;color:#fff;border-radius:14px;padding:16px 18px;box-shadow:0 12px 34px -10px rgba(0,0,0,.45);font-family:Inter,system-ui,sans-serif;font-size:13.5px;line-height:1.5}.aqc b{color:#fff}.aqc-a{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}.aqc button{border:0;border-radius:9px;padding:9px 16px;font-weight:600;font-size:13px;cursor:pointer;font-family:inherit}.aqc .ok{background:#F2792B;color:#fff}.aqc .no{background:transparent;color:#cfe0e6;border:1px solid rgba(255,255,255,.3)}.aqc a{color:#7fd0e6}";
    document.head.appendChild(css);
    var d = document.createElement("div");
    d.className = "aqc";
    d.innerHTML = '<b>🐠 Sua privacidade</b><br>Usamos cookies para entender como você usa o Aqualife e melhorar sua experiência. Seu IP é anonimizado. <div class="aqc-a"><button class="ok">Aceitar</button><button class="no">Recusar</button></div>';
    document.body.appendChild(d);
    d.querySelector(".ok").onclick = function () { ativar(); d.remove(); };
    d.querySelector(".no").onclick = function () { recusar(); d.remove(); };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", banner);
  else banner();
})();
