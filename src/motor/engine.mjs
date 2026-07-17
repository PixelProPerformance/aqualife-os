/**
 * AQUALIFE — MOTOR DE DIAGNÓSTICO v1.0
 * ================================================================
 * REGRA DE OURO: este motor DECIDE. A IA só escreve depois.
 * Código idêntico ao original do Replit — só removido o
 * "import with { type: 'json' }" que não funciona em todos os
 * ambientes Node 20. Carregamos regras.json via fs/readFileSync.
 * ================================================================
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const regras = JSON.parse(
  readFileSync(path.join(__dirname, "regras.json"), "utf8")
);

export const RULESET_VERSION = regras.versao;

const URGENCIA_ORDEM = { ok: 0, atencao: 1, alerta: 2, critico: 3 };
const norm = (u) =>
  ({ "CRÍTICO": "critico", "ALERTA": "alerta", "ATENÇÃO": "atencao", "OK": "ok" }[u] ||
   String(u || "").toLowerCase());

function classificar(valor, faixa) {
  if (valor == null || !faixa) return null;
  const [im, ix] = faixa.ideal || [null, null];
  const [am, ax] = faixa.ok || [null, null];
  const ca = faixa.critico_abaixo;
  const cg = faixa.critico_acima;

  if (cg != null && valor > cg) return { estado: "critico", distancia: 1 };
  if (ca != null && valor < ca) return { estado: "critico", distancia: 1 };

  const dentroIdeal =
    (im == null || valor >= im) && (ix == null || valor <= ix);
  if (dentroIdeal) return { estado: "ideal", distancia: 0 };

  const dentroOk = (am == null || valor >= am) && (ax == null || valor <= ax);
  if (dentroOk) {
    let d = 0;
    if (ix != null && valor > ix && ax != null && ax > ix)
      d = (valor - ix) / (ax - ix);
    else if (im != null && valor < im && am != null && im > am)
      d = (im - valor) / (im - am);
    if (d === 0) return { estado: "ideal", distancia: 0 };
    return { estado: "aceitavel", distancia: Math.min(Math.max(d, 0.15), 1) };
  }

  return { estado: "alerta", distancia: 1 };
}

function avaliarCondicao(regra, v, waterType, contexto) {
  const id = regra.id;
  const g = (k) => (v[k] == null ? null : Number(v[k]));

  switch (id) {
    case "PH_ALTO_AMONIA":
      return g("ph") != null && g("amonia") != null && g("ph") > 7.5 && g("amonia") > 0;
    case "KH_BAIXO_INSTAB":
      return g("kh") != null && g("kh") < 3;
    case "KH_BAIXO_MARINHO":
      return waterType === "marine" && g("kh") != null && g("kh") < 7;
    case "MG_BAIXO_BLOQUEIA":
      return waterType === "marine" && g("magnesio") != null && g("magnesio") < 1200;
    case "NITRITO_PRESENTE":
      return g("nitrito") != null && g("nitrito") > 0;
    case "OD_BAIXO_TEMP_ALTA":
      return waterType === "pond" && g("oxigenio") != null && g("temperatura") != null &&
             g("oxigenio") < 5 && g("temperatura") > 26;
    case "NO3_PO4_ALGA":
      return g("nitrato") != null && g("fosfato") != null &&
             g("nitrato") > 40 && g("fosfato") > 1;
    case "TEMP_VARIACAO":
      return waterType === "marine" && contexto?.variacaoTemp != null &&
             contexto.variacaoTemp > 1;
    case "PH_INSTAVEL_LAGO":
      return waterType === "pond" && contexto?.oscilacaoPh != null &&
             contexto.oscilacaoPh > 1.5;
    case "NO3_ZERO_REEF":
      return waterType === "marine" && g("nitrato") != null && g("fosfato") != null &&
             g("nitrato") <= 0.5 && g("fosfato") <= 0.01;
    default:
      return false;
  }
}

const APLICA = {
  "Todos":      () => true,
  "Marinho":    (wt) => wt === "marine",
  "Lago":       (wt) => wt === "pond",
  "Doce":       (wt) => wt === "freshwater",
  "Lago / Doce":(wt) => wt === "pond" || wt === "freshwater",
};

export function diagnosticar(valores, waterType, contexto = {}) {
  const faixas = regras.faixas[waterType];
  const pesos  = regras.pesos[waterType];
  if (!faixas || !pesos) throw new Error(`tipo de água inválido: ${waterType}`);

  let nota = 100;
  const parametros = [];
  let somaPesosAvaliados = 0;

  for (const [param, peso] of Object.entries(pesos)) {
    const valor = valores[param];
    const cls = classificar(valor, faixas[param]);
    if (cls == null) continue;
    somaPesosAvaliados += peso;
    const desconto = peso * cls.distancia;
    nota -= desconto;
    parametros.push({
      parametro: param, valor, estado: cls.estado,
      peso, desconto: +desconto.toFixed(1),
      faixa_ideal: faixas[param].ideal,
    });
  }

  const alertas = [];
  let urgencia = "ok";
  for (const regra of regras.regras) {
    const aplica = (APLICA[regra.aplica] || (() => false))(waterType);
    if (!aplica) continue;
    if (avaliarCondicao(regra, valores, waterType, contexto)) {
      const u = norm(regra.urgencia);
      nota += (regra.penalidade || 0);
      alertas.push({ id: regra.id, urgencia: u,
                     penalidade: regra.penalidade, explicacao: regra.entao });
      if (URGENCIA_ORDEM[u] > URGENCIA_ORDEM[urgencia]) urgencia = u;
    }
  }

  for (const p of parametros) {
    if (p.estado === "critico" && URGENCIA_ORDEM.critico > URGENCIA_ORDEM[urgencia])
      urgencia = "critico";
    else if (p.estado === "alerta" && URGENCIA_ORDEM.alerta > URGENCIA_ORDEM[urgencia])
      urgencia = "alerta";
  }

  nota = Math.max(0, Math.min(100, Math.round(nota)));
  const totalPesos = Object.values(pesos).reduce((a, b) => a + b, 0);
  const confianca = Math.round((somaPesosAvaliados / totalPesos) * 100);

  return {
    ruleset_version: RULESET_VERSION,
    water_type: waterType,
    nota, urgencia, confianca,
    parametros: parametros.sort((a, b) => b.desconto - a.desconto),
    alertas,
    acoes: acoesPara(parametros, alertas, waterType),
  };
}

function acoesPara(parametros, alertas, waterType) {
  const A = regras.acoes;
  const achar = (frag) => A.find((a) => a.situacao.toLowerCase().includes(frag));
  const out = [];
  const push = (a, motivo) => {
    if (a && !out.find((x) => x.situacao === a.situacao)) out.push({ ...a, motivo });
  };

  const val  = (p) => parametros.find((x) => x.parametro === p);
  const ruim = (p) => { const x = val(p); return x && x.estado !== "ideal"; };
  const acima = (p) => { const x = val(p); const ix = x?.faixa_ideal?.[1];
    return x && ix != null && x.valor > ix; };

  if (ruim("amonia"))  push(achar("amônia"), "amonia");
  if (ruim("nitrito")) push(achar("nitrito"), "nitrito");
  if (ruim("kh") && waterType === "marine") push(achar("kh baixo (marinho)"), "kh");
  else if (ruim("kh")) push(achar("kh baixo (doce"), "kh");
  if (ruim("oxigenio") && waterType === "pond") push(achar("oxigênio baixo"), "oxigenio");
  if (acima("nitrato") && acima("fosfato")) push(achar("nitrato + fosfato"), "algas");
  if (ruim("temperatura")) push(achar("temperatura"), "temperatura");

  if (!out.length) push(achar("tudo dentro"), "ok");
  return out;
}
