/* =====================================================================
   AQUALIFE — Barras de saúde por parâmetro (laudo)
   Componente único usado no painel do cliente, no laudo do admin e no PDF.
   Reproduz as barras coloridas da tela de construção do autodiagnóstico.
   API:
     LaudoBars.html(parametros)            -> string HTML (injeta o CSS 1x)
     LaudoBars.pdf(doc, parametros, opts)  -> desenha no jsPDF, retorna novo y
   ===================================================================== */
(function () {
  "use strict";
  var COR = { ideal: "#22e37a", aceitavel: "#22d3ee", alerta: "#ffc224", critico: "#ff4d6d" };
  var CORRGB = { ideal: [34, 227, 122], aceitavel: [34, 211, 238], alerta: [255, 194, 36], critico: [255, 77, 109] };
  var ROTULO = { temperatura: "Temperatura", ph: "pH", kh: "KH", gh: "GH", amonia: "Amônia",
    nitrito: "Nitrito", nitrato: "Nitrato", fosfato: "Fosfato", oxigenio: "Oxigênio",
    salinidade: "Salinidade", calcio: "Cálcio", magnesio: "Magnésio", alcalinidade_meq: "Alcalinidade", silicato: "Silicato" };
  var UNID = { temperatura: "°C", ph: "", kh: "dKH", gh: "dGH", amonia: "ppm", nitrito: "ppm",
    nitrato: "ppm", fosfato: "ppm", oxigenio: "mg/L", salinidade: "", calcio: "ppm", magnesio: "ppm", alcalinidade_meq: "meq/L", silicato: "ppm" };

  function estadoDe(p) {
    var e = String(p.estado || p.urgencia || "").toLowerCase();
    if (e === "ok") return "ideal";
    if (e === "atencao") return "aceitavel";
    if (COR[e]) return e;
    return "ideal";
  }
  function fmtNum(x) { var n = Number(x); return Number.isFinite(n) ? String(parseFloat(n.toFixed(3))) : x; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }

  // calcula a escala/posição de um parâmetro com faixa ideal [lo,hi]
  function escala(p) {
    var f = p.faixa_ideal;
    if (!Array.isArray(f) || f.length < 2 || f[0] == null || f[1] == null || isNaN(+p.valor)) return null;
    var lo = +f[0], hi = +f[1]; if (hi < lo) { var t = lo; lo = hi; hi = t; }
    var span = Math.max(hi - lo, Math.abs(hi) * 0.15, 0.5);
    var smin = lo - span, smax = hi + span, W = (smax - smin) || 1;
    var v = +p.valor;
    var pct = function (x) { return Math.max(0, Math.min(100, ((x - smin) / W) * 100)); };
    var tag, dentro = v >= lo && v <= hi;
    if (v < lo) tag = "abaixo do ideal"; else if (v > hi) tag = "acima do ideal"; else tag = "dentro do ideal";
    return { lo: lo, hi: hi, smin: smin, smax: smax, v: v, pct: pct, tag: tag, dentro: dentro };
  }

  // ---------------- HTML ----------------
  var cssPronto = false;
  function injectCss() {
    if (cssPronto) return; cssPronto = true;
    var css =
      ".lbp-title{font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:var(--suave,#6B8591);font-weight:700;margin:16px 0 6px}"
      + ".lbp{padding:13px 0;border-top:1px solid var(--linha,#DCE6EA)}.lbp:first-of-type{border-top:none}"
      + ".lbp-top{display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin-bottom:9px}"
      + ".lbp-nome{font-size:14px;color:var(--tinta,#12333F);font-weight:600}"
      + ".lbp-val{font-size:12.5px;color:var(--suave,#6B8591)}.lbp-val b{color:var(--tinta,#12333F);font-size:16px}"
      + ".lbp-bar{position:relative;height:13px;border-radius:20px;margin:2px 0;"
      + "background:linear-gradient(90deg,rgba(255,77,109,.55),rgba(255,194,36,.45),rgba(34,227,122,.55),rgba(255,194,36,.45),rgba(255,77,109,.55))}"
      + ".lbp-ideal{position:absolute;top:0;bottom:0;background:rgba(34,227,122,.75);border-radius:20px;box-shadow:0 0 10px rgba(34,227,122,.5)}"
      + ".lbp-mark{position:absolute;top:-4px;width:5px;height:21px;border-radius:3px;transform:translateX(-2.5px);"
      + "box-shadow:0 0 0 2px rgba(8,24,32,.7),0 0 9px 1px currentColor}"
      + ".lbp-legs{display:flex;justify-content:space-between;font-size:10.5px;color:var(--suave,#6B8591);margin-top:6px;gap:6px}"
      + ".lbp-tag{font-weight:700}"
      + ".lbp-badge{font-size:11px;font-weight:700;padding:2px 9px;border-radius:20px;white-space:nowrap}"
      + ".lbp-badge.ideal{background:#D1FAE5;color:#065F46}.lbp-badge.aceitavel{background:#E0F7FA;color:#075985}"
      + ".lbp-badge.alerta{background:#FEF3C7;color:#92400E}.lbp-badge.critico{background:#FEE2E2;color:#991B1B}";
    var st = document.createElement("style"); st.setAttribute("data-lbp", "1"); st.textContent = css;
    document.head.appendChild(st);
  }

  function barraHtml(p) {
    var est = estadoDe(p), cor = COR[est] || "#22d3ee";
    var nome = ROTULO[p.parametro] || p.parametro || "";
    var un = UNID[p.parametro] != null ? UNID[p.parametro] : "";
    var top = '<div class="lbp-top"><span class="lbp-nome">' + esc(nome) + '</span>'
      + '<span class="lbp-val"><b>' + esc(fmtNum(p.valor)) + '</b> ' + esc(un) + '</span></div>';
    var s = escala(p);
    if (!s) {
      return '<div class="lbp">' + top + '<span class="lbp-badge ' + est + '">' + est + '</span></div>';
    }
    var tagCor = s.dentro ? "#22a35a" : cor;
    return '<div class="lbp">' + top
      + '<div class="lbp-bar">'
      + '<div class="lbp-ideal" style="left:' + s.pct(s.lo) + '%;right:' + (100 - s.pct(s.hi)) + '%"></div>'
      + '<div class="lbp-mark" style="left:' + s.pct(s.v) + '%;background:' + cor + ';color:' + cor + '"></div>'
      + '</div>'
      + '<div class="lbp-legs"><span>' + fmtNum(s.smin) + '</span>'
      + '<span class="lbp-tag" style="color:' + tagCor + '">' + s.tag + ' · ideal ' + fmtNum(s.lo) + '–' + fmtNum(s.hi) + '</span>'
      + '<span>' + fmtNum(s.smax) + '</span></div></div>';
  }

  function html(parametros, titulo) {
    injectCss();
    var arr = (parametros || []).filter(Boolean);
    if (!arr.length) return "";
    return '<div class="lbp-title">' + (titulo || "Saúde por parâmetro") + '</div>' + arr.map(barraHtml).join("");
  }

  // ---------------- PDF (jsPDF) ----------------
  // opts: { x, y, w, pageH, margin }  -> retorna novo y
  function pdf(doc, parametros, opts) {
    opts = opts || {};
    var x = opts.x != null ? opts.x : 16;
    var w = opts.w != null ? opts.w : 178;
    var pageH = opts.pageH || 297;
    var margin = opts.margin != null ? opts.margin : 16;
    var y = opts.y != null ? opts.y : 40;
    var arr = (parametros || []).filter(Boolean);
    if (!arr.length) return y;

    doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(11, 42, 58);
    doc.text("Saúde por parâmetro", x, y); y += 7;

    for (var i = 0; i < arr.length; i++) {
      var p = arr[i];
      if (y > pageH - 30) { doc.addPage(); y = margin + 6; }
      var est = estadoDe(p), rgb = CORRGB[est] || CORRGB.aceitavel;
      var nome = ROTULO[p.parametro] || p.parametro || "";
      var un = UNID[p.parametro] != null ? UNID[p.parametro] : "";

      // linha: nome (esq) + valor (dir)
      doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(18, 51, 63);
      doc.text(String(nome), x, y);
      doc.setFont("helvetica", "normal"); doc.setTextColor(90, 118, 129);
      doc.text(fmtNum(p.valor) + (un ? " " + un : ""), x + w, y, { align: "right" });
      y += 3;

      // barra (track cinza + zona ideal verde + marcador colorido)
      var barH = 4, r = barH / 2;
      doc.setFillColor(224, 231, 233); doc.roundedRect(x, y, w, barH, r, r, "F");
      var s = escala(p);
      if (s) {
        var loX = x + (s.pct(s.lo) / 100) * w;
        var hiX = x + (s.pct(s.hi) / 100) * w;
        doc.setFillColor(34, 227, 122); doc.roundedRect(loX, y, Math.max(hiX - loX, 1), barH, r, r, "F");
        var mX = x + (s.pct(s.v) / 100) * w;
        doc.setFillColor(rgb[0], rgb[1], rgb[2]);
        doc.roundedRect(mX - 0.9, y - 1.4, 1.8, barH + 2.8, 0.9, 0.9, "F");
      } else {
        // sem faixa: pinta a barra toda com a cor do estado
        doc.setFillColor(rgb[0], rgb[1], rgb[2]); doc.roundedRect(x, y, w, barH, r, r, "F");
      }
      y += barH + 3.5;

      // legenda
      doc.setFontSize(7.5); doc.setTextColor(120, 140, 148);
      if (s) {
        doc.text(fmtNum(s.smin), x, y);
        doc.setTextColor(rgb[0], rgb[1], rgb[2]); doc.setFont("helvetica", "bold");
        doc.text(s.tag + " · ideal " + fmtNum(s.lo) + "–" + fmtNum(s.hi), x + w / 2, y, { align: "center" });
        doc.setFont("helvetica", "normal"); doc.setTextColor(120, 140, 148);
        doc.text(fmtNum(s.smax), x + w, y, { align: "right" });
      } else {
        doc.setTextColor(rgb[0], rgb[1], rgb[2]); doc.setFont("helvetica", "bold");
        doc.text(String(est), x, y); doc.setFont("helvetica", "normal");
      }
      y += 7;
    }
    return y;
  }

  window.LaudoBars = { html: html, pdf: pdf, injectCss: injectCss };
})();
