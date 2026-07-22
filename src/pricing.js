/**
 * AQUALIFE OS — MOTOR DE PREÇO (servidor)
 * ================================================================
 * Porta fiel da lógica de preço do site (pricing v2.0), para que o
 * valor da cobrança seja SEMPRE recalculado no servidor — nunca
 * confiamos no valor enviado pelo navegador (segurança).
 * ================================================================
 */

export const REG = {
  PT: { nome: "Portugal",        moeda: "EUR", sim: "€",  pais: "PT" },
  RJ: { nome: "Rio de Janeiro",  moeda: "BRL", sim: "R$", pais: "BR" },
  SP: { nome: "São Paulo",       moeda: "BRL", sim: "R$", pais: "BR" },
};
const SC = "sob_consulta";

export function rotear(cp, cidade) {
  const d = (cp || "").replace(/\D/g, "");
  if (d.length === 7) return "PT";
  if (d.length === 8) {
    const p = parseInt(d.slice(0, 5), 10);
    if (p >= 20000 && p <= 28999) return "RJ";
    if (p >= 1000  && p <= 19999) return "SP";
    return "outro";
  }
  const c = (cidade || "").toLowerCase();
  if (/lisboa|porto|cascais|sintra|aveiro|ovar|braga|faro|coimbra/.test(c)) return "PT";
  if (/rio de janeiro|niter|b[úu]zios|petr[oó]polis/.test(c)) return "RJ";
  if (/s[ãa]o paulo|campinas|santos|guarulhos|osasco/.test(c)) return "SP";
  return "outro";
}

const PRECOS = {
  BR: {
    freshwater: [[200, 270], [600, 340], [1000, 500], [null, SC]],
    marine:     [[200, 330], [600, 400], [1000, 600], [null, SC]],
    pond:       [[2000, 450], [4000, 650], [10000, 800], [null, SC]],
  },
  PT: {
    freshwater: [[200, 45], [600, 65], [1000, 100], [null, SC]],
    marine:     [[200, 70], [600, 100], [1000, 150], [null, SC]],
    pond:       [[2000, 120], [4000, 180], [10000, 270], [null, SC]],
  },
};
export const TNOME = { freshwater: "Água doce", marine: "Marinho", pond: "Lago" };
export const PLANOS = {
  avulsa:     { nome: "Avulsa",             vm: 1, m: 0,  desc: 0,   parcelas: 1 },
  mensal:     { nome: "Mensal",             vm: 1, m: 1,  desc: .05, recorrente: true },
  mensal_2x:  { nome: "Mensal · 2 visitas", vm: 2, m: 1,  desc: .07, recorrente: true },
  trimestral: { nome: "Trimestral",         vm: 1, m: 3,  desc: .12, parcelas: 3 },
  semestral:  { nome: "Semestral",          vm: 1, m: 6,  desc: .18, parcelas: 6 },
  anual:      { nome: "Anual",              vm: 1, m: 12, desc: .25, parcelas: 12 },
};
const PGTOS = {
  BR: {
    pix:              { nome: "PIX",                   aj: -.05, tag: "mais barato" },
    transferencia:    { nome: "Transferência / boleto", aj: -.03 },
    cartao:           { nome: "Cartão à vista",         aj: 0 },
    cartao_parcelado: { nome: "Cartão parcelado (2-6×)", aj: .05 },
  },
  PT: {
    mbway:         { nome: "MB Way",               aj: -.05, tag: "mais barato" },
    debito_direto: { nome: "Débito direto",        aj: -.04 },
    transferencia: { nome: "Transferência bancária", aj: -.03 },
    cartao:        { nome: "Cartão de crédito",    aj: 0 },
  },
};

function faixa(pais, wt, vol) {
  const t = PRECOS[pais][wt]; let ant = 0;
  for (const [lim, pr] of t) {
    if (lim === null) return [SC, `acima de ${ant} L`];
    if (vol <= lim) return [pr, ant === 0 ? `até ${lim} L` : `${ant}–${lim} L`];
    ant = lim;
  }
  return [SC, "acima da tabela"];
}

/** Calcula o orçamento. Retorna objeto com valores em unidade monetária (não centavos). */
export function orcar(cp, cidade, wt, vol, plano, pgto) {
  const r = rotear(cp, cidade);
  if (!(r in REG)) return { atende: false, regiao: r };
  const info = REG[r], pais = info.pais;
  if (!pgto || !(pgto in PGTOS[pais])) pgto = pais === "BR" ? "pix" : "mbway";
  const pg = PGTOS[pais][pgto], p = PLANOS[plano] || PLANOS.avulsa;
  const [base, frot] = faixa(pais, wt, vol);

  if (base === SC) return {
    atende: true, sob_consulta: true, regiao: r, regiao_nome: info.nome,
    pais, moeda: info.moeda, sim: info.sim, faixa: frot,
    aviso: `${TNOME[wt]} ${frot}, projeto sob medida.`,
  };

  let acc = base;
  if (p.desc > 0) acc += -acc * p.desc;
  if (pg.aj !== 0) acc += acc * pg.aj;
  const visita = Math.round(acc * 100) / 100;

  return {
    atende: true, sob_consulta: false, regiao: r, regiao_nome: info.nome,
    pais, moeda: info.moeda, sim: info.sim, faixa: frot,
    plano, plano_nome: p.nome, vm: p.vm, meses: p.m,
    recorrente: Boolean(p.recorrente),
    parcelas: p.parcelas || 1,
    pagamento: pgto, pagamento_nome: pg.nome,
    valor_visita: visita,
    valor_mensal: p.m ? Math.round(visita * p.vm * 100) / 100 : 0,
    valor_total:  p.m ? Math.round(visita * p.vm * p.m * 100) / 100 : visita,
  };
}
