/* =====================================================================
   AQUALIFE IA — widget de chat flutuante
   Autossuficiente: injeta seu próprio CSS e HTML. Só aparece para
   usuários logados (com aqualife_token) e quando a IA está ativa.
   ===================================================================== */
(function () {
  "use strict";
  if (window.__aqIA) return;            // evita injeção dupla
  window.__aqIA = true;

  var token = null;
  try { token = localStorage.getItem("aqualife_token"); } catch (e) {}
  if (!token) return;                   // visitante não vê a IA

  var API = "/api/ia";
  var HKEY = "aq_ia_hist";
  var historico = [];                   // {role, content}
  try { historico = JSON.parse(sessionStorage.getItem(HKEY) || "[]"); } catch (e) { historico = []; }

  // ---- só monta se a IA estiver disponível ----
  fetch(API + "/status", { headers: { authorization: "Bearer " + token } })
    .then(function (r) { return r.ok ? r.json() : { disponivel: false }; })
    .then(function (s) { if (s && s.disponivel) montar(); })
    .catch(function () {});

  function estilos() {
    var css = ""
      + ".aqia-fab{position:fixed;right:20px;bottom:20px;z-index:2147483000;width:60px;height:60px;border-radius:50%;"
      + "border:none;cursor:pointer;background:linear-gradient(135deg,#1B6E8C,#125265);box-shadow:0 8px 22px -6px rgba(18,51,63,.5);"
      + "display:flex;align-items:center;justify-content:center;transition:transform .16s,box-shadow .16s}"
      + ".aqia-fab:hover{transform:translateY(-2px);box-shadow:0 14px 28px -8px rgba(18,51,63,.6)}"
      + ".aqia-fab svg{width:28px;height:28px;fill:none;stroke:#fff;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}"
      + ".aqia-fab .aqia-dot{position:absolute;top:12px;right:12px;width:10px;height:10px;border-radius:50%;background:#C9A227;border:2px solid #fff}"
      + ".aqia-panel{position:fixed;right:20px;bottom:92px;z-index:2147483000;width:380px;max-width:calc(100vw - 32px);height:560px;max-height:calc(100vh - 120px);"
      + "background:#F4F8F9;border:1px solid #DCE6EA;border-radius:16px;box-shadow:0 24px 60px -20px rgba(18,51,63,.4);display:none;flex-direction:column;overflow:hidden;"
      + "font-family:Inter,-apple-system,'Segoe UI',sans-serif}"
      + ".aqia-panel.on{display:flex}"
      + ".aqia-head{background:linear-gradient(135deg,#1B6E8C,#125265);color:#fff;padding:14px 16px;display:flex;align-items:center;gap:10px}"
      + ".aqia-head .aqia-av{width:34px;height:34px;border-radius:9px;background:rgba(255,255,255,.16);display:flex;align-items:center;justify-content:center;flex:none}"
      + ".aqia-head .aqia-av svg{width:19px;height:19px;fill:none;stroke:#fff;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}"
      + ".aqia-head b{font-size:15px;font-weight:600;display:block;line-height:1.1}"
      + ".aqia-head span{font-size:11.5px;opacity:.85}"
      + ".aqia-x{margin-left:auto;background:none;border:none;color:#fff;font-size:22px;cursor:pointer;opacity:.85;line-height:1;padding:2px 6px}"
      + ".aqia-x:hover{opacity:1}"
      + ".aqia-msgs{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px}"
      + ".aqia-b{max-width:85%;padding:10px 13px;border-radius:13px;font-size:14px;line-height:1.5;white-space:normal;word-wrap:break-word}"
      + ".aqia-b.u{align-self:flex-end;background:#1B6E8C;color:#fff;border-bottom-right-radius:4px}"
      + ".aqia-b.a{align-self:flex-start;background:#fff;color:#3A5561;border:1px solid #DCE6EA;border-bottom-left-radius:4px}"
      + ".aqia-b.a strong{color:#12333F}"
      + ".aqia-b.a ul{margin:6px 0;padding-left:18px}.aqia-b.a li{margin:2px 0}"
      + ".aqia-typ{align-self:flex-start;display:flex;gap:4px;padding:12px 14px;background:#fff;border:1px solid #DCE6EA;border-radius:13px}"
      + ".aqia-typ i{width:7px;height:7px;border-radius:50%;background:#9DB6BE;display:inline-block;animation:aqiabl 1s infinite}"
      + ".aqia-typ i:nth-child(2){animation-delay:.2s}.aqia-typ i:nth-child(3){animation-delay:.4s}"
      + "@keyframes aqiabl{0%,60%,100%{opacity:.3}30%{opacity:1}}"
      + ".aqia-foot{border-top:1px solid #DCE6EA;padding:10px;display:flex;gap:8px;background:#fff}"
      + ".aqia-foot textarea{flex:1;resize:none;border:1px solid #DCE6EA;border-radius:10px;padding:10px 12px;font-family:inherit;font-size:14px;color:#12333F;max-height:110px;outline:none}"
      + ".aqia-foot textarea:focus{border-color:#1B6E8C}"
      + ".aqia-send{flex:none;width:42px;border:none;border-radius:10px;background:#1B6E8C;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center}"
      + ".aqia-send:disabled{opacity:.5;cursor:default}"
      + ".aqia-send svg{width:19px;height:19px;fill:none;stroke:#fff;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}"
      + ".aqia-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:2px}"
      + ".aqia-chip{font-size:12px;background:#E8F2F5;color:#125265;border:1px solid #cfe4ea;border-radius:20px;padding:6px 11px;cursor:pointer}"
      + ".aqia-chip:hover{background:#dcedf1}"
      + "html.aqia-ready [data-aqia-laudo],html.aqia-ready [data-aqia-perguntar]{display:inline-flex !important}"
      + "@media(max-width:480px){.aqia-panel{right:8px;left:8px;width:auto;bottom:86px;height:calc(100vh - 110px)}.aqia-fab{right:16px;bottom:16px}}";
    var st = document.createElement("style");
    st.textContent = css;
    document.head.appendChild(st);
  }

  var iconChat = '<svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.9-.9L3 21l1.9-5.6A8.5 8.5 0 1 1 21 11.5Z"/></svg>';
  var iconBot = '<svg viewBox="0 0 24 24"><rect x="4" y="7" width="16" height="12" rx="3"/><path d="M12 7V4M8 13h.01M16 13h.01"/></svg>';
  var iconSend = '<svg viewBox="0 0 24 24"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4Z"/></svg>';

  var panel, msgsEl, input, sendBtn, fab, aberto = false, esperando = false;

  function montar() {
    estilos();

    fab = document.createElement("button");
    fab.className = "aqia-fab";
    fab.setAttribute("aria-label", "Abrir Aqualife IA");
    fab.innerHTML = iconChat + '<span class="aqia-dot"></span>';
    fab.onclick = toggle;
    document.body.appendChild(fab);

    panel = document.createElement("div");
    panel.className = "aqia-panel";
    panel.innerHTML =
      '<div class="aqia-head"><div class="aqia-av">' + iconBot + '</div>'
      + '<div><b>Aqualife IA</b><span>Assistente de aquarismo</span></div>'
      + '<button class="aqia-x" aria-label="Fechar">&times;</button></div>'
      + '<div class="aqia-msgs" id="aqiaMsgs"></div>'
      + '<div class="aqia-foot"><textarea rows="1" placeholder="Pergunte sobre seu aquário, laudo, peixes…"></textarea>'
      + '<button class="aqia-send" aria-label="Enviar">' + iconSend + '</button></div>';
    document.body.appendChild(panel);

    msgsEl = panel.querySelector("#aqiaMsgs");
    input = panel.querySelector("textarea");
    sendBtn = panel.querySelector(".aqia-send");
    panel.querySelector(".aqia-x").onclick = toggle;
    sendBtn.onclick = enviar;
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); }
    });
    input.addEventListener("input", function () {
      input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, 110) + "px";
    });

    // reidrata histórico (se houver, de outra página)
    if (historico.length) { historico.forEach(function (m) { bolha(m.role === "user" ? "u" : "a", m.content); }); }
    else { boasVindas(); }

    // marca que a IA está pronta → o botão "Analisar com IA" pode se revelar
    document.documentElement.classList.add("aqia-ready");
  }

  function toggle() {
    if (!panel) return;
    aberto = !aberto;
    panel.classList.toggle("on", aberto);
    if (aberto) { setTimeout(function () { input && input.focus(); }, 60); scrollFim(); }
  }

  function boasVindas() {
    var txt = "Olá! 🐠 Sou a **Aqualife IA**. Posso analisar seus laudos do Care, tirar dúvidas de aquarismo e avaliar compatibilidade entre peixes. Como posso ajudar?";
    bolha("a", txt);
    var chips = document.createElement("div");
    chips.className = "aqia-chips";
    ["Analisar meu último laudo", "Posso juntar Betta com Neon?", "Como ciclar meu aquário?"].forEach(function (c) {
      var b = document.createElement("button");
      b.className = "aqia-chip"; b.textContent = c;
      b.onclick = function () { input.value = c; enviar(); };
      chips.appendChild(b);
    });
    msgsEl.appendChild(chips);
  }

  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }
  function fmt(s) {
    var h = esc(s);
    h = h.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    // listas simples: linhas iniciadas por - ou •
    var linhas = h.split("\n"), out = [], emLista = false;
    linhas.forEach(function (ln) {
      if (/^\s*[-•]\s+/.test(ln)) {
        if (!emLista) { out.push("<ul>"); emLista = true; }
        out.push("<li>" + ln.replace(/^\s*[-•]\s+/, "") + "</li>");
      } else {
        if (emLista) { out.push("</ul>"); emLista = false; }
        out.push(ln);
      }
    });
    if (emLista) out.push("</ul>");
    return out.join("<br>").replace(/<br>(<ul>|<\/ul>|<li>)/g, "$1").replace(/(<\/ul>|<\/li>)<br>/g, "$1");
  }

  function bolha(cls, texto) {
    var d = document.createElement("div");
    d.className = "aqia-b " + cls;
    d.innerHTML = cls === "a" ? fmt(texto) : esc(texto);
    msgsEl.appendChild(d);
    scrollFim();
    return d;
  }
  function scrollFim() { if (msgsEl) msgsEl.scrollTop = msgsEl.scrollHeight; }
  function salvar() { try { sessionStorage.setItem(HKEY, JSON.stringify(historico.slice(-16))); } catch (e) {} }

  function enviar() {
    var texto = (input.value || "").trim();
    if (!texto) return;
    input.value = ""; input.style.height = "auto";
    enviarTexto(texto, null);
  }

  function enviarTexto(texto, laudoId) {
    if (esperando || !texto || !msgsEl) return;
    var chips = msgsEl.querySelector(".aqia-chips"); if (chips) chips.remove();

    bolha("u", texto);
    historico.push({ role: "user", content: texto });
    salvar();

    esperando = true; sendBtn.disabled = true;
    var typ = document.createElement("div");
    typ.className = "aqia-typ"; typ.innerHTML = "<i></i><i></i><i></i>";
    msgsEl.appendChild(typ); scrollFim();

    var body = { mensagens: historico.slice(-12) };
    if (laudoId) body.laudo_id = laudoId;

    fetch(API + "/chat", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer " + token },
      body: JSON.stringify(body)
    })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        typ.remove();
        if (!res.ok) { bolha("a", res.j && res.j.erro ? res.j.erro : "Não consegui responder agora. Tente novamente."); return; }
        var resp = res.j.resposta || "Sem resposta.";
        bolha("a", resp);
        historico.push({ role: "assistant", content: resp });
        salvar();
      })
      .catch(function () { typ.remove(); bolha("a", "Falha de conexão. Verifique sua internet e tente de novo."); })
      .finally(function () { esperando = false; sendBtn.disabled = false; input.focus(); });
  }

  // ---- API pública + botões "Analisar com IA" em qualquer página ----
  function abrirSe() { if (!aberto) toggle(); }
  window.AqualifeIA = {
    abrir: abrirSe,
    fechar: function () { if (aberto) toggle(); },
    perguntar: function (texto, opts) {
      opts = opts || {}; abrirSe();
      setTimeout(function () { enviarTexto(texto, opts.laudoId || null); }, 250);
    },
    analisarLaudo: function (laudoId, rotulo) {
      abrirSe();
      var q = "Analise " + (rotulo ? ("o laudo do " + rotulo) : "este meu laudo") +
              " do Aqualife Care: explique em linguagem simples o que está bom, o que precisa de atenção e o que eu devo fazer agora.";
      setTimeout(function () { enviarTexto(q, laudoId || null); }, 250);
    }
  };

  // Delegação: qualquer elemento com data-aqia-laudo / data-aqia-perguntar
  // aciona a IA — funciona para botões criados dinamicamente (laudos, modais).
  document.addEventListener("click", function (e) {
    var elL = e.target.closest && e.target.closest("[data-aqia-laudo]");
    if (elL) { e.preventDefault(); window.AqualifeIA.analisarLaudo(elL.getAttribute("data-aqia-laudo"), elL.getAttribute("data-aqia-rotulo") || ""); return; }
    var elP = e.target.closest && e.target.closest("[data-aqia-perguntar]");
    if (elP) { e.preventDefault(); window.AqualifeIA.perguntar(elP.getAttribute("data-aqia-perguntar")); }
  });
})();
