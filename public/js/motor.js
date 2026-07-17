// motor no navegador — mesma lógica do servidor (prévia ao vivo)
/**
 * AQUALIFE — MOTOR DE DIAGNÓSTICO
 * ================================================================
 * REGRA DE OURO: este motor DECIDE. A IA só escreve depois.
 *
 * Toda nota, urgência e ação sai daqui — de regras que vieram da
 * planilha Aqualife-Care-Regras-v0.1.xlsx, validada pelo Rafael.
 * Nada é inventado. Cada número é rastreável a uma faixa ou regra.
 *
 * O laudo guarda a versão (RULESET_VERSION) que o gerou. Se a regra
 * mudar amanhã, os laudos de hoje continuam explicáveis pela v1.0.
 * ================================================================
 */

import { REGRAS as regras } from "./regras.js";

export const RULESET_VERSION = regras.versao;

const URGENCIA_ORDEM = { ok: 0, atencao: 1, alerta: 2, critico: 3 };
const norm = (u) =>
  ({ "CRÍTICO": "critico", "ALERTA": "alerta", "ATENÇÃO": "atencao", "OK": "ok" }[u] ||
   String(u || "").toLowerCase());

/**
 * Classifica UM parâmetro contra sua faixa.
 * Retorna { estado, distancia } — distância é 0 quando ideal,
 * cresce conforme sai da faixa. É o que vira desconto na nota.
 */
function classificar(valor, faixa) {
  if (valor == null || !faixa) return null;
  const [im, ix] = faixa.ideal || [null, null];
  const [am, ax] = faixa.ok || [null, null];
  const ca = faixa.critico_abaixo;
  const cg = faixa.critico_acima;

  // crítico: fora do limite que a planilha marcou como crítico
  if (cg != null && valor > cg) return { estado: "critico", distancia: 1 };
  if (ca != null && valor < ca) return { estado: "critico", distancia: 1 };

  // ideal: dentro da faixa ideal → sem desconto
  const dentroIdeal =
    (im == null || valor >= im) && (ix == null || valor <= ix);
  if (dentroIdeal) return { estado: "ideal", distancia: 0 };

  // aceitável: fora do ideal mas dentro do ok → desconto proporcional
  const dentroOk = (am == null || valor >= am) && (ax == null || valor <= ax);
  if (dentroOk) {
    // quão longe do ideal, como fração da margem até o limite aceitável.
    // ★ só penaliza o lado que EXISTE: se o valor está abaixo do ideal
    //   mas o mínimo aceitável é igual ao mínimo ideal (ex: nitrato,
    //   ideal 0-20, ok 0-40), estar em 0 é ideal, não alerta.
    let d = 0;
    if (ix != null && valor > ix && ax != null && ax > ix)
      d = (valor - ix) / (ax - ix);
    else if (im != null && valor < im && am != null && im > am)
      d = (im - valor) / (im - am);
    // se d==0 aqui, o valor está fora do ideal só num lado sem margem
    // definida — tratamos como ideal (sem desconto).
    if (d === 0) return { estado: "ideal", distancia: 0 };
    return { estado: "aceitavel", distancia: Math.min(Math.max(d, 0.15), 1) };
  }

  // fora do aceitável mas ainda não crítico → alerta forte
  return { estado: "alerta", distancia: 1 };
}

/** Lê "pH > 7.5 E amônia > 0" e afins, de forma segura. */
function avaliarCondicao(regra, v, waterType, contexto) {
  const id = regra.id;
  const g = (k) => (v[k] == null ? null : Number(v[k]));

  switch (id) {
    case "PH_ALTO_AMONIA":
      return g("ph") != null && g("amonia") != null &&
             g("ph") > 7.5 && g("amonia") > 0;
    case "KH_BAIXO_INSTAB":
      return g("kh") != null && g("kh") < 3;
    case "KH_BAIXO_MARINHO":
      return waterType === "marine" && g("kh") != null && g("kh") < 7;
    case "MG_BAIXO_BLOQUEIA":
      return waterType === "marine" && g("magnesio") != null && g("magnesio") < 1200;
    case "NITRITO_PRESENTE":
      return g("nitrito") != null && g("nitrito") > 0;
    case "OD_BAIXO_TEMP_ALTA":
      return waterType === "pond" &&
             g("oxigenio") != null && g("temperatura") != null &&
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
      return waterType === "marine" &&
             g("nitrato") != null && g("fosfato") != null &&
             g("nitrato") <= 0.5 && g("fosfato") <= 0.01;
    default:
      return false;
  }
}

const APLICA = {
  "Todos": () => true,
  "Marinho": (wt) => wt === "marine",
  "Lago": (wt) => wt === "pond",
  "Doce": (wt) => wt === "freshwater",
  "Lago / Doce": (wt) => wt === "pond" || wt === "freshwater",
};

/**
 * Diagnóstico completo. Entrada:
 *   valores  — { ph, kh, amonia, ... } medidos pelo técnico
 *   waterType — "freshwater" | "marine" | "pond"
 *   contexto  — { variacaoTemp, oscilacaoPh } opcional (histórico)
 */
export function diagnosticar(valores, waterType, contexto = {}) {
  const faixas = regras.faixas[waterType];
  const pesos = regras.pesos[waterType];
  if (!faixas || !pesos) throw new Error(`tipo de água inválido: ${waterType}`);

  // 1. cada parâmetro perde pontos conforme sai do ideal
  let nota = 100;
  const parametros = [];
  let somaPesosAvaliados = 0;

  for (const [param, peso] of Object.entries(pesos)) {
    const valor = valores[param];
    const cls = classificar(valor, faixas[param]);
    if (cls == null) continue; // não medido — não penaliza
    somaPesosAvaliados += peso;
    const desconto = peso * cls.distancia;
    nota -= desconto;
    parametros.push({
      parametro: param, valor, estado: cls.estado,
      peso, desconto: +desconto.toFixed(1),
      faixa_ideal: faixas[param].ideal,
    });
  }

  // 2. regras de interação — o diferencial. Penalidade fixa + urgência.
  const alertas = [];
  let urgencia = "ok";
  for (const regra of regras.regras) {
    const aplica = (APLICA[regra.aplica] || (() => false))(waterType);
    if (!aplica) continue;
    if (avaliarCondicao(regra, valores, waterType, contexto)) {
      const u = norm(regra.urgencia);
      // ★ a planilha guarda a penalidade como número NEGATIVO (-30).
      //   Aplicar é SOMAR esse negativo. (Antes eu fazia nota-=(-30),
      //   que subia a nota — bug pego no teste do aquário com amônia.)
      nota += (regra.penalidade || 0);
      alertas.push({ id: regra.id, urgencia: u,
                     penalidade: regra.penalidade, explicacao: regra.entao });
      if (URGENCIA_ORDEM[u] > URGENCIA_ORDEM[urgencia]) urgencia = u;
    }
  }

  // 3. urgência também sobe se algum parâmetro estourou o crítico
  for (const p of parametros) {
    if (p.estado === "critico" && URGENCIA_ORDEM.critico > URGENCIA_ORDEM[urgencia])
      urgencia = "critico";
    else if (p.estado === "alerta" && URGENCIA_ORDEM.alerta > URGENCIA_ORDEM[urgencia])
      urgencia = "alerta";
  }

  nota = Math.max(0, Math.min(100, Math.round(nota)));

  // 4. confiança: quanto do peso total foi realmente medido
  const confianca = Math.round(
    (somaPesosAvaliados / Object.values(pesos).reduce((a, b) => a + b, 0)) * 100
  );

  return {
    ruleset_version: RULESET_VERSION,
    water_type: waterType,
    nota, urgencia, confianca,
    parametros: parametros.sort((a, b) => b.desconto - a.desconto),
    alertas,
    acoes: acoesPara(parametros, alertas, waterType),
  };
}

/** Casa o diagnóstico com a aba Ações-Recomendadas (texto do Rafael). */
function acoesPara(parametros, alertas, waterType) {
  const A = regras.acoes;
  const achar = (frag) => A.find((a) => a.situacao.toLowerCase().includes(frag));
  const out = [];
  const push = (a, motivo) => { if (a && !out.find((x) => x.situacao === a.situacao)) out.push({ ...a, motivo }); };

  const val = (p) => parametros.find((x) => x.parametro === p);
  const ruim = (p) => { const x = val(p); return x && x.estado !== "ideal"; };
  // acima/abaixo do ideal — para não sugerir "reduzir" o que está baixo
  const acima = (p) => { const x = val(p); const ix = x?.faixa_ideal?.[1];
    return x && ix != null && x.valor > ix; };

  if (ruim("amonia")) push(achar("amônia"), "amonia");
  if (ruim("nitrito")) push(achar("nitrito"), "nitrito");
  if (ruim("kh") && waterType === "marine") push(achar("kh baixo (marinho)"), "kh");
  else if (ruim("kh")) push(achar("kh baixo (doce"), "kh");
  if (ruim("oxigenio") && waterType === "pond") push(achar("oxigênio baixo"), "oxigenio");
  // ★ "nitrato+fosfato altos" só quando estão de fato ALTOS. No reef
  //   oligotrófico eles estão BAIXOS — a ação de reduzir seria o oposto.
  if (acima("nitrato") && acima("fosfato")) push(achar("nitrato + fosfato"), "algas");
  if (ruim("temperatura")) push(achar("temperatura"), "temperatura");

  if (!out.length) push(achar("tudo dentro"), "ok");
  return out;
}
