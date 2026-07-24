/**
 * AQUALIFE ANALYTICS — coleta e agregação de eventos de produto.
 * ================================================================
 * - Ingestão assíncrona em lote (batch insert).
 * - Anonimização de IP (LGPD): nunca guardamos o IP real.
 * - Parser leve de User-Agent (sem dependências externas).
 * ================================================================
 */
import crypto from "crypto";
import { query } from "./db.js";

const SALT = (process.env.ANALYTICS_SALT || process.env.JWT_SECRET || "aqualife-analytics").trim();

/** Anonimiza o IP: zera o último octeto (IPv4) e devolve um hash curto. LGPD. */
export function anonimizarIp(ip) {
  if (!ip) return null;
  let base = String(ip).replace(/^::ffff:/, "");
  if (base.includes(".")) {                      // IPv4 → zera último octeto
    const p = base.split("."); p[3] = "0"; base = p.join(".");
  } else if (base.includes(":")) {               // IPv6 → mantém só os 3 primeiros blocos
    base = base.split(":").slice(0, 3).join(":") + "::";
  }
  return crypto.createHash("sha256").update(SALT + base).digest("hex").slice(0, 16);
}

/** Parser leve de User-Agent → { device, os, browser }. */
export function parseUA(ua = "") {
  const u = ua.toLowerCase();
  let device = "desktop";
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/.test(u)) device = "tablet";
  else if (/mobi|iphone|ipod|android.*mobile|windows phone|blackberry/.test(u)) device = "mobile";

  let os = "Outro";
  if (/windows nt/.test(u)) os = "Windows";
  else if (/iphone|ipad|ipod/.test(u)) os = "iOS";
  else if (/mac os x/.test(u)) os = "macOS";
  else if (/android/.test(u)) os = "Android";
  else if (/linux/.test(u)) os = "Linux";

  let browser = "Outro";
  if (/edg\//.test(u)) browser = "Edge";
  else if (/opr\/|opera/.test(u)) browser = "Opera";
  else if (/chrome\/|crios/.test(u)) browser = "Chrome";
  else if (/firefox|fxios/.test(u)) browser = "Firefox";
  else if (/safari/.test(u)) browser = "Safari";
  return { device, os, browser };
}

/** País a partir de headers de proxy comuns (Cloudflare/Railway/Vercel). Null se ausente. */
export function paisDosHeaders(headers = {}) {
  return (headers["cf-ipcountry"] || headers["x-vercel-ip-country"] ||
          headers["x-geo-country"] || "").toString().toUpperCase() || null;
}

const NOMES_VALIDOS = new Set([
  "page_view","time_on_page","scroll","click","button_click","download","search","login","logout",
  "signup_start","signup_complete","error","message_sent","report_open","aquabook_search","academy_view",
  "video_start","video_complete","quote_start","quote_submit","booking_start","booking_submit",
  "checkout_start","purchase_complete","ticket_open","ticket_reply","species_submit","species_approved",
  "like","favorite","share","perf","js_error",
]);

/**
 * Insere um lote de eventos. `meta` traz dados do servidor (ip, ua, país).
 * Cada evento do cliente: { name, anon_id, user_id, session_id, path, referrer,
 *   utm_source, utm_medium, utm_campaign, lang, props, ts }
 */
export async function coletarEventos(meta, eventos) {
  if (!Array.isArray(eventos) || !eventos.length) return 0;
  const { device, os, browser } = parseUA(meta.ua);
  const ipHash = anonimizarIp(meta.ip);
  const country = meta.country || null;

  const lote = eventos.slice(0, 50).filter(e => e && typeof e.name === "string");
  if (!lote.length) return 0;

  const cols = ["event_name","anon_id","user_id","session_id","path","referrer",
    "utm_source","utm_medium","utm_campaign","device","os","browser","country","city",
    "lang","props","ip_hash","created_at"];
  const values = [], params = [];
  lote.forEach((e, i) => {
    const b = i * cols.length;
    values.push(`(${cols.map((_, j) => `$${b + j + 1}`).join(",")})`);
    const nome = NOMES_VALIDOS.has(e.name) ? e.name : e.name.slice(0, 60);
    let ts = null; try { if (e.ts) ts = new Date(e.ts).toISOString(); } catch {}
    params.push(
      nome,
      (e.anon_id || null)?.toString().slice(0, 80) || null,
      isUuid(e.user_id) ? e.user_id : null,
      (e.session_id || null)?.toString().slice(0, 80) || null,
      (e.path || null)?.toString().slice(0, 400) || null,
      (e.referrer || null)?.toString().slice(0, 400) || null,
      (e.utm_source || null)?.toString().slice(0, 120) || null,
      (e.utm_medium || null)?.toString().slice(0, 120) || null,
      (e.utm_campaign || null)?.toString().slice(0, 120) || null,
      device, os, browser, country, null,
      (e.lang || null)?.toString().slice(0, 12) || null,
      e.props ? JSON.stringify(e.props).slice(0, 4000) : null,
      ipHash,
      ts || new Date().toISOString(),
    );
  });

  await query(`INSERT INTO analytics_event (${cols.join(",")}) VALUES ${values.join(",")}`, params);
  return lote.length;
}

function isUuid(v) {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

const RANGES = { hoje: "1 day", "7d": "7 days", "30d": "30 days", "90d": "90 days" };

/** Visão geral do dashboard para um intervalo. */
export async function visaoGeral(range = "7d") {
  const janela = RANGES[range] || RANGES["7d"];
  const desde = `NOW() - INTERVAL '${janela}'`;
  const one = async (sql, p = []) => (await query(sql, p)).rows;

  const [onlineR] = await one(
    `SELECT COUNT(DISTINCT session_id)::int AS n FROM analytics_event WHERE created_at > NOW() - INTERVAL '5 minutes'`);
  const [hojeR] = await one(
    `SELECT COUNT(DISTINCT anon_id)::int AS n FROM analytics_event WHERE created_at::date = NOW()::date`);
  const [semanaR] = await one(
    `SELECT COUNT(DISTINCT anon_id)::int AS n FROM analytics_event WHERE created_at > NOW() - INTERVAL '7 days'`);
  const [mesR] = await one(
    `SELECT COUNT(DISTINCT anon_id)::int AS n FROM analytics_event WHERE created_at > NOW() - INTERVAL '30 days'`);

  const [totR] = await one(
    `SELECT COUNT(*)::int AS eventos, COUNT(DISTINCT session_id)::int AS sessoes,
            COUNT(DISTINCT anon_id)::int AS visitantes,
            COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL)::int AS logados
     FROM analytics_event WHERE created_at > ${desde}`);

  // Novos x recorrentes: visitante cujo 1º evento caiu dentro da janela = novo
  const [novosR] = await one(
    `WITH prim AS (SELECT anon_id, MIN(created_at) mc FROM analytics_event WHERE anon_id IS NOT NULL GROUP BY anon_id)
     SELECT COUNT(*) FILTER (WHERE mc > ${desde})::int AS novos,
            COUNT(*) FILTER (WHERE mc <= ${desde})::int AS recorrentes
     FROM prim WHERE anon_id IN (SELECT DISTINCT anon_id FROM analytics_event WHERE created_at > ${desde})`);

  // Tempo médio na página (evento time_on_page traz props.seconds)
  const [tempoR] = await one(
    `SELECT COALESCE(ROUND(AVG((props->>'seconds')::numeric)),0)::int AS s
     FROM analytics_event WHERE event_name='time_on_page' AND created_at > ${desde} AND props ? 'seconds'`);

  // Taxa de rejeição: sessões com só 1 page_view / total de sessões com page_view
  const [rejR] = await one(
    `WITH pv AS (SELECT session_id, COUNT(*) c FROM analytics_event
                 WHERE event_name='page_view' AND created_at > ${desde} AND session_id IS NOT NULL GROUP BY session_id)
     SELECT CASE WHEN COUNT(*)=0 THEN 0
            ELSE ROUND(100.0*COUNT(*) FILTER (WHERE c=1)/COUNT(*)) END::int AS taxa FROM pv`);

  const dispositivos = await one(
    `SELECT COALESCE(device,'?') k, COUNT(DISTINCT session_id)::int v FROM analytics_event
     WHERE created_at > ${desde} GROUP BY device ORDER BY v DESC`);
  const sistemas = await one(
    `SELECT COALESCE(os,'?') k, COUNT(DISTINCT session_id)::int v FROM analytics_event
     WHERE created_at > ${desde} GROUP BY os ORDER BY v DESC LIMIT 8`);
  const navegadores = await one(
    `SELECT COALESCE(browser,'?') k, COUNT(DISTINCT session_id)::int v FROM analytics_event
     WHERE created_at > ${desde} GROUP BY browser ORDER BY v DESC LIMIT 8`);
  const paises = await one(
    `SELECT COALESCE(country,'?') k, COUNT(DISTINCT session_id)::int v FROM analytics_event
     WHERE created_at > ${desde} GROUP BY country ORDER BY v DESC LIMIT 10`);
  const idiomas = await one(
    `SELECT COALESCE(lang,'?') k, COUNT(DISTINCT session_id)::int v FROM analytics_event
     WHERE created_at > ${desde} GROUP BY lang ORDER BY v DESC LIMIT 8`);
  const origens = await one(
    `SELECT COALESCE(NULLIF(utm_source,''),'direto') k, COUNT(DISTINCT session_id)::int v FROM analytics_event
     WHERE created_at > ${desde} GROUP BY utm_source ORDER BY v DESC LIMIT 10`);

  const topPaginas = await one(
    `SELECT COALESCE(path,'?') k, COUNT(*)::int views, COUNT(DISTINCT anon_id)::int uniq
     FROM analytics_event WHERE event_name='page_view' AND created_at > ${desde}
     GROUP BY path ORDER BY views DESC LIMIT 12`);
  const topEventos = await one(
    `SELECT event_name k, COUNT(*)::int v FROM analytics_event
     WHERE created_at > ${desde} GROUP BY event_name ORDER BY v DESC LIMIT 15`);

  // Série diária de visitantes e eventos
  const serie = await one(
    `SELECT to_char(d, 'YYYY-MM-DD') dia,
            COALESCE(vis,0)::int visitantes, COALESCE(ev,0)::int eventos
     FROM generate_series((${desde})::date, NOW()::date, '1 day') d
     LEFT JOIN (
       SELECT created_at::date dd, COUNT(DISTINCT anon_id) vis, COUNT(*) ev
       FROM analytics_event WHERE created_at > ${desde} GROUP BY dd
     ) x ON x.dd = d ORDER BY d`);

  return {
    online: onlineR?.n || 0,
    visitantes_hoje: hojeR?.n || 0,
    visitantes_semana: semanaR?.n || 0,
    visitantes_mes: mesR?.n || 0,
    eventos: totR?.eventos || 0,
    sessoes: totR?.sessoes || 0,
    visitantes: totR?.visitantes || 0,
    logados: totR?.logados || 0,
    novos: novosR?.novos || 0,
    recorrentes: novosR?.recorrentes || 0,
    tempo_medio_s: tempoR?.s || 0,
    rejeicao: rejR?.taxa || 0,
    dispositivos, sistemas, navegadores, paises, idiomas, origens,
    top_paginas: topPaginas, top_eventos: topEventos, serie,
  };
}

// Etapas do funil de conversão do ecossistema Aqualife.
const FUNIL_STEPS = [
  { key: "site",     label: "Visitou o site",       cond: "event_name='page_view'" },
  { key: "aquabook", label: "Explorou o Aquabook",  cond: "event_name='aquabook_search' OR path ILIKE '%aquabook%'" },
  { key: "conta",    label: "Criou conta",          cond: "event_name='signup_complete'" },
  { key: "care",     label: "Assinou o Care",       cond: "event_name='purchase_complete'" },
  { key: "academy",  label: "Entrou na Academy",    cond: "event_name='academy_view' OR path ILIKE '%curso%' OR path ILIKE '%academy%'" },
  { key: "cliente",  label: "Agendou manutenção",   cond: "event_name='booking_submit'" },
];

/** Funil de conversão nested (cada etapa exige as anteriores). Mostra abandono. */
export async function funil(range = "30d") {
  const janela = RANGES[range] || RANGES["30d"];
  const desde = `NOW() - INTERVAL '${janela}'`;
  const sel = FUNIL_STEPS.map((s, i) => `bool_or(${s.cond}) AS s${i}`).join(", ");
  const rows = (await query(
    `SELECT anon_id, ${sel} FROM analytics_event
     WHERE created_at > ${desde} AND anon_id IS NOT NULL GROUP BY anon_id`, [])).rows;

  const nested = FUNIL_STEPS.map(() => 0);   // exige todas as etapas anteriores
  const isolado = FUNIL_STEPS.map(() => 0);  // alcançou a etapa (independente)
  rows.forEach(r => {
    let ok = true;
    for (let i = 0; i < FUNIL_STEPS.length; i++) {
      if (r["s" + i]) isolado[i]++;
      ok = ok && r["s" + i];
      if (ok) nested[i]++;
    }
  });

  const topo = nested[0] || 0;
  const etapas = FUNIL_STEPS.map((s, i) => {
    const anterior = i === 0 ? nested[0] : nested[i - 1];
    return {
      key: s.key, label: s.label,
      usuarios: nested[i], alcancaram: isolado[i],
      pct_topo: topo ? Math.round(nested[i] / topo * 100) : 0,
      pct_anterior: anterior ? Math.round(nested[i] / anterior * 100) : 0,
      abandono: i === 0 ? 0 : anterior - nested[i],
      abandono_pct: (i > 0 && anterior) ? Math.round((anterior - nested[i]) / anterior * 100) : 0,
    };
  });

  let maior = null;
  for (let i = 1; i < etapas.length; i++) {
    if (!maior || etapas[i].abandono_pct > maior.pct)
      maior = { de: etapas[i - 1].label, para: etapas[i].label, pct: etapas[i].abandono_pct, n: etapas[i].abandono };
  }
  return { total: topo, etapas, maior_abandono: maior };
}

// Seções do ecossistema (rótulo + ordem de exibição).
const SECOES_LABEL = {
  home: "Home / Institucional", agendar: "Agendamento", aquabook: "Aquabook",
  academy: "Academy", blog: "Blog", care: "Aqualife Care",
  conta: "Login / Cadastro", outros: "Outras páginas",
};
const SECOES_ORDEM = ["home","agendar","aquabook","academy","blog","care","conta","outros"];

/** Analytics por página: agrega os eventos por seção do ecossistema. */
export async function secoes(range = "30d") {
  const janela = RANGES[range] || RANGES["30d"];
  const desde = `NOW() - INTERVAL '${janela}'`;

  const rows = (await query(
    `WITH ev AS (
       SELECT *, CASE
         WHEN path ILIKE '%aquabook%' THEN 'aquabook'
         WHEN path ILIKE '%curso%' OR path ILIKE '%academy%' THEN 'academy'
         WHEN path ILIKE '%blog%' OR path ILIKE '%post%' THEN 'blog'
         WHEN path ILIKE '%dashboard%' OR path ILIKE '%painel%' OR path ILIKE '%/care%' THEN 'care'
         WHEN path ILIKE '%entrar%' OR path ILIKE '%cadastro%' OR path ILIKE '%redefinir%' THEN 'conta'
         WHEN path ILIKE '%#/agendar%' THEN 'agendar'
         WHEN path ILIKE '/site.html%' OR path = '/' OR path ILIKE '/index%' THEN 'home'
         ELSE 'outros' END AS secao
       FROM analytics_event WHERE created_at > ${desde}
     )
     SELECT secao,
       COUNT(*) FILTER (WHERE event_name='page_view')::int AS pageviews,
       COUNT(DISTINCT anon_id)::int AS visitantes,
       COALESCE(ROUND(AVG((props->>'seconds')::numeric) FILTER (WHERE event_name='time_on_page' AND props ? 'seconds')),0)::int AS tempo,
       COALESCE(ROUND(AVG((props->>'max_scroll')::numeric) FILTER (WHERE event_name='time_on_page' AND props ? 'max_scroll')),0)::int AS scroll,
       COUNT(*) FILTER (WHERE event_name='click')::int AS cliques
     FROM ev GROUP BY secao`, [])).rows;

  const mapa = {}; rows.forEach(r => mapa[r.secao] = r);
  const lista = SECOES_ORDEM.filter(k => mapa[k]).map(k => ({
    key: k, label: SECOES_LABEL[k], ...mapa[k],
  }));

  // Insights do Aquabook (dependem do evento aquabook_search trazer props.q)
  const buscas = (await query(
    `SELECT props->>'q' AS q, COUNT(*)::int AS n FROM analytics_event
     WHERE event_name='aquabook_search' AND created_at > ${desde} AND COALESCE(props->>'q','') <> ''
     GROUP BY props->>'q' ORDER BY n DESC LIMIT 15`, [])).rows;
  const semResultado = (await query(
    `SELECT props->>'q' AS q, COUNT(*)::int AS n FROM analytics_event
     WHERE event_name='aquabook_search' AND created_at > ${desde}
       AND COALESCE(props->>'q','') <> '' AND (props->>'resultados')::int = 0
     GROUP BY props->>'q' ORDER BY n DESC LIMIT 15`, [])).rows;

  // Vídeos da Academy (dependem de video_start/video_complete)
  const [videoR] = (await query(
    `SELECT COUNT(*) FILTER (WHERE event_name='video_start')::int AS iniciados,
            COUNT(*) FILTER (WHERE event_name='video_complete')::int AS concluidos
     FROM analytics_event WHERE created_at > ${desde}`, [])).rows;
  const taxaVideo = videoR && videoR.iniciados ? Math.round(videoR.concluidos / videoR.iniciados * 100) : 0;

  return {
    secoes: lista,
    aquabook: { buscas, sem_resultado: semResultado },
    academy: { videos_iniciados: videoR?.iniciados || 0, videos_concluidos: videoR?.concluidos || 0, taxa_conclusao: taxaVideo },
  };
}
