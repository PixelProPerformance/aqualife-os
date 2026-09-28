/**
 * AQUALIFE OS — LOJA (E-COMMERCE NATIVO) · Fase 1: catálogo
 * ================================================================
 * Catálogo: categorias, produtos, variações (SKU/EAN/preço/estoque)
 * e fotos. Rotas públicas (vitrine) + rotas admin (gestão).
 *
 * Fotos: enviadas para o CLOUDINARY (armazenamento permanente, fora
 * do disco efêmero do Railway). As credenciais ficam no banco
 * (integracao_config), nunca no código. Se o Cloudinary ainda não
 * estiver configurado, cai automaticamente para o disco local.
 *
 * A ficha do produto guarda os campos necessários para Mercado Livre
 * (marca, modelo, condição, garantia, GTIN/EAN, categoria ML, peso/
 * dimensões) e para a nota fiscal / Focus NFe (NCM, CEST, origem,
 * unidade, EAN) — prontos para a integração futura.
 *
 * Injeção de dependências (desacoplado e testável):
 *   registrarLoja({ app, query, withTransaction, exigeLogin, exigeAdmin, getConfig, setConfig })
 *
 * Preços SEMPRE em centavos (INT). Tabelas criadas no garantirSchema().
 * ================================================================
 */

import multer from "multer";
import crypto from "crypto";
import { writeFileSync, mkdirSync, unlink } from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Pasta das fotos: caminho ABSOLUTO baseado na localização do módulo (src/),
// apontando para <raiz>/public/uploads — exatamente o que o express.static serve.
// Assim o Volume persistente do Railway montado nesse caminho funciona sem depender
// do diretório de trabalho. Pode ser sobrescrito por env UPLOADS_DIR se preciso.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, "../public/uploads");
try { mkdirSync(UPLOADS_DIR, { recursive: true }); } catch {}

// Compressão de imagens (sharp). Se não estiver instalado, salva sem comprimir.
// Para ativar: adicione "sharp" às dependências do package.json.
let sharp = null;
try { sharp = (await import("sharp")).default; console.log("[loja] sharp ativo — imagens serão comprimidas."); }
catch { console.warn("[loja] sharp ausente — imagens salvas sem compressão (adicione 'sharp' ao package.json)."); }

function extDe(originalname) {
  const e = (originalname || "img.jpg").split(".").pop().replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 5);
  return e || "jpg";
}
// Redimensiona (máx 1600px), converte para WebP q80 — costuma reduzir ~85% do tamanho.
async function comprimir(buffer, originalname) {
  if (!sharp) { const ext = extDe(originalname); return { buffer, ext }; }
  try {
    const out = await sharp(buffer).rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 82, mozjpeg: true }).toBuffer();
    return { buffer: out, ext: "jpg" };
  } catch (e) {
    console.warn("[loja] falha ao comprimir, salvando original:", e.message);
    return { buffer, ext: extDe(originalname) };
  }
}

// Multer em memória (precisamos do buffer para enviar ao Cloudinary)
const uploadMem = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 10 },
  fileFilter: (req, file, cb) =>
    file.mimetype.startsWith("image/") ? cb(null, true) : cb(new Error("Apenas imagens são permitidas")),
});

function slugify(s) {
  return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}
const intNaoNeg = (x) => { const n = Math.trunc(Number(x)); return Number.isFinite(n) && n >= 0 ? n : 0; };
const numNaoNeg = (x) => { const n = Number(x); return Number.isFinite(n) && n >= 0 ? Math.round(n * 10) / 10 : 0; };
const txt = (x, max = 200) => String(x == null ? "" : x).trim().slice(0, max);
const soDigitos = (x, max = 20) => String(x == null ? "" : x).replace(/\D/g, "").slice(0, max);
function mascarar(v) { if (!v) return null; if (v.length <= 8) return "••••"; return v.slice(0, 4) + "••••" + v.slice(-4); }

export function registrarLoja(deps) {
  const { app, query, withTransaction, exigeLogin, exigeAdmin, getConfig, setConfig,
          baseUrl = "https://app.aqualifeaquarismo.com", enviarEmail = null } = deps;
  if (!app || !query || !getConfig) throw new Error("registrarLoja: app, query e getConfig são obrigatórios");

  // ---------- CLOUDINARY ----------
  async function cloudinaryCfg() {
    const [cloud, key, secret] = await Promise.all([
      getConfig("cloudinary_cloud_name"), getConfig("cloudinary_api_key"), getConfig("cloudinary_api_secret"),
    ]);
    return (cloud && key && secret) ? { cloud, key, secret } : null;
  }
  // Assina os parâmetros (ordem alfabética) + api_secret, SHA-1 — padrão Cloudinary
  function assinar(params, secret) {
    const base = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join("&");
    return crypto.createHash("sha1").update(base + secret).digest("hex");
  }
  async function enviarCloudinary(buffer, cfg) {
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = "aqualife/loja";
    const signature = assinar({ folder, timestamp }, cfg.secret);
    const form = new FormData();
    form.append("file", new Blob([buffer]));
    form.append("api_key", cfg.key);
    form.append("timestamp", String(timestamp));
    form.append("folder", folder);
    form.append("signature", signature);
    const r = await fetch(`https://api.cloudinary.com/v1_1/${cfg.cloud}/image/upload`, { method: "POST", body: form });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.secure_url) throw new Error((j.error && j.error.message) || `Cloudinary HTTP ${r.status}`);
    return { url: j.secure_url, publicId: j.public_id || null };
  }
  async function destruirCloudinary(publicId, cfg) {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = assinar({ public_id: publicId, timestamp }, cfg.secret);
    const form = new FormData();
    form.append("public_id", publicId);
    form.append("api_key", cfg.key);
    form.append("timestamp", String(timestamp));
    form.append("signature", signature);
    await fetch(`https://api.cloudinary.com/v1_1/${cfg.cloud}/image/destroy`, { method: "POST", body: form }).catch(() => {});
  }
  function salvarNoDisco(buffer, ext) {
    const nome = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext || "jpg"}`;
    writeFileSync(path.join(UPLOADS_DIR, nome), buffer);
    return `/uploads/${nome}`;
  }

  const normVariacao = (v, ordem) => ({
    id: v && v.id ? String(v.id) : null,
    nome: txt(v && v.nome, 60) || null,
    sku: txt(v && v.sku, 60) || null,
    ean: soDigitos(v && v.ean, 14) || null,
    preco_cents: intNaoNeg(v && v.preco_cents),
    preco_promo_cents: v && v.preco_promo_cents != null && v.preco_promo_cents !== "" ? intNaoNeg(v.preco_promo_cents) : null,
    estoque: intNaoNeg(v && v.estoque),
    custo_cents: intNaoNeg(v && v.custo_cents),
    estoque_minimo: intNaoNeg(v && v.estoque_minimo),
    ordem: intNaoNeg(ordem),
    ativo: v && v.ativo === false ? false : true,
  });
  const camposProduto = (b) => ({
    nome: txt(b.nome, 140),
    descricao: txt(b.descricao, 6000) || null,
    categoria_id: b.categoria_id || null,
    marca: txt(b.marca, 80) || null,
    modelo: txt(b.modelo, 80) || null,
    condicao: (b.condicao === "usado" ? "usado" : "novo"),
    garantia_meses: intNaoNeg(b.garantia_meses),
    ncm: soDigitos(b.ncm, 8) || null,
    cest: soDigitos(b.cest, 7) || null,
    origem_fiscal: /^[0-8]$/.test(String(b.origem_fiscal)) ? String(b.origem_fiscal) : "0",
    unidade: txt(b.unidade, 6) || "UN",
    ml_categoria_id: txt(b.ml_categoria_id, 40) || null,
    peso_gramas: intNaoNeg(b.peso_gramas),
    altura_cm: numNaoNeg(b.altura_cm),
    largura_cm: numNaoNeg(b.largura_cm),
    comprimento_cm: numNaoNeg(b.comprimento_cm),
    ativo: b.ativo === false ? false : true,
    destaque: Boolean(b.destaque),
    // Compatibilidade / conteúdo técnico (opcionais; base do "serve pro meu aquário?")
    litragem_min: b.litragem_min === "" || b.litragem_min == null ? null : intNaoNeg(b.litragem_min),
    litragem_max: b.litragem_max === "" || b.litragem_max == null ? null : intNaoNeg(b.litragem_max),
    vazao_lh: b.vazao_lh === "" || b.vazao_lh == null ? null : intNaoNeg(b.vazao_lh),
    sistema: ["doce", "marinho", "plantado", "lago"].includes(b.sistema) ? b.sistema : null,
    dica_tecnica: txt(b.dica_tecnica, 600) || null,
  });

  // ---- ERP: motor de movimentação de estoque (livro-razão auditável) ----
  const TIPOS_MOV = ["entrada", "venda", "devolucao", "ajuste", "perda", "transferencia", "inicial"];
  // q = função de query DENTRO de uma transação (para travar a linha com FOR UPDATE)
  async function movimentarEstoque(q, m) {
    const r = await q(`SELECT estoque, custo_cents FROM loja_variacao WHERE id=$1 FOR UPDATE`, [m.variacao_id]);
    if (!r.rows[0]) throw Object.assign(new Error("variacao_nao_encontrada"), { code: 404 });
    const atual = Number(r.rows[0].estoque) || 0;
    const custoAtual = Number(r.rows[0].custo_cents) || 0;
    const qty = Math.trunc(Number(m.qty) || 0);
    if (qty === 0) throw Object.assign(new Error("qty_zero"), { code: 400 });
    const saldo = atual + qty;
    if (saldo < 0 && !m.permitirNegativo) throw Object.assign(new Error("estoque_insuficiente"), { code: 409 });
    let novoCusto = custoAtual;
    if (qty > 0 && m.custo_unit_cents != null && m.custo_unit_cents > 0) {
      novoCusto = atual > 0 ? Math.round((atual * custoAtual + qty * m.custo_unit_cents) / (atual + qty)) : Math.round(m.custo_unit_cents);
    }
    await q(`UPDATE loja_variacao SET estoque=$2, custo_cents=$3 WHERE id=$1`, [m.variacao_id, saldo, novoCusto]);
    await q(`INSERT INTO estoque_mov (variacao_id, tipo, qty, custo_unit_cents, saldo_after, motivo, ref_tipo, ref_id, usuario_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [m.variacao_id, TIPOS_MOV.includes(m.tipo) ? m.tipo : "ajuste", qty,
       m.custo_unit_cents != null ? m.custo_unit_cents : null, saldo, m.motivo || null, m.ref_tipo || null, m.ref_id || null, m.usuario_id || null]);
    return { saldo, custo_cents: novoCusto };
  }

  // ==========================================================
  // VITRINE (público)
  // ==========================================================
  app.get("/api/loja/categorias", async (req, res) => {
    try {
      const r = await query(`SELECT id, nome, slug, ordem FROM loja_categoria WHERE ativo = true ORDER BY ordem, nome`);
      res.json(r.rows);
    } catch (err) { console.error("[loja/categorias]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });

  app.get("/api/loja/produtos", async (req, res) => {
    try {
      const cat = txt(req.query.categoria, 80);
      const params = []; let filtro = "p.ativo = true";
      if (cat) { params.push(cat); filtro += ` AND c.slug = $${params.length}`; }
      const r = await query(
        `SELECT p.id, p.nome, p.slug, p.marca, p.destaque, p.sistema, p.litragem_min, p.litragem_max, p.vazao_lh, c.nome AS categoria, c.slug AS categoria_slug,
                (SELECT url FROM loja_imagem i WHERE i.produto_id = p.id ORDER BY i.capa DESC, i.ordem LIMIT 1) AS capa,
                (SELECT MIN(COALESCE(NULLIF(v.preco_promo_cents,0), v.preco_cents)) FROM loja_variacao v WHERE v.produto_id = p.id AND v.ativo = true) AS preco_a_partir,
                (SELECT MIN(v.preco_cents) FROM loja_variacao v WHERE v.produto_id = p.id AND v.ativo = true) AS preco_cheio,
                (SELECT COALESCE(SUM(v.estoque),0) FROM loja_variacao v WHERE v.produto_id = p.id AND v.ativo = true) AS estoque_total
         FROM loja_produto p LEFT JOIN loja_categoria c ON c.id = p.categoria_id
         WHERE ${filtro} ORDER BY p.destaque DESC, p.nome`, params);
      res.json(r.rows);
    } catch (err) { console.error("[loja/produtos]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });

  app.get("/api/loja/produto/:idOuSlug", async (req, res) => {
    try {
      const key = txt(req.params.idOuSlug, 80);
      const ehUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key);
      const pr = await query(
        `SELECT p.*, c.nome AS categoria, c.slug AS categoria_slug
         FROM loja_produto p LEFT JOIN loja_categoria c ON c.id = p.categoria_id
         WHERE p.ativo = true AND ${ehUuid ? "p.id = $1" : "p.slug = $1"} LIMIT 1`, [key]);
      const prod = pr.rows[0];
      if (!prod) return res.status(404).json({ erro: "produto não encontrado" });
      const [vr, ir] = await Promise.all([
        query(`SELECT id, nome, sku, ean, preco_cents, preco_promo_cents, estoque, ordem FROM loja_variacao WHERE produto_id = $1 AND ativo = true ORDER BY ordem, nome`, [prod.id]),
        query(`SELECT id, url, ordem, capa FROM loja_imagem WHERE produto_id = $1 ORDER BY capa DESC, ordem`, [prod.id]),
      ]);
      res.json({ ...prod, variacoes: vr.rows, imagens: ir.rows });
    } catch (err) { console.error("[loja/produto]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });

  // Busca com autocomplete (produtos + categorias)
  app.get("/api/loja/busca", async (req, res) => {
    try {
      const q = txt(req.query.q, 60);
      if (q.length < 2) return res.json({ produtos: [], categorias: [] });
      const like = "%" + q.replace(/[%_\\]/g, "") + "%";
      const [prod, cats] = await Promise.all([
        query(
          `SELECT p.id, p.nome, p.slug, p.marca,
                  (SELECT url FROM loja_imagem i WHERE i.produto_id = p.id ORDER BY i.capa DESC, i.ordem LIMIT 1) AS capa,
                  (SELECT MIN(COALESCE(NULLIF(v.preco_promo_cents,0), v.preco_cents)) FROM loja_variacao v WHERE v.produto_id = p.id AND v.ativo = true) AS preco_a_partir
           FROM loja_produto p LEFT JOIN loja_categoria c ON c.id = p.categoria_id
           WHERE p.ativo = true AND (p.nome ILIKE $1 OR p.marca ILIKE $1 OR p.descricao ILIKE $1 OR c.nome ILIKE $1)
           ORDER BY p.destaque DESC, p.nome LIMIT 6`, [like]),
        query(`SELECT nome, slug FROM loja_categoria WHERE ativo = true AND nome ILIKE $1 ORDER BY nome LIMIT 4`, [like]),
      ]);
      res.json({ produtos: prod.rows, categorias: cats.rows });
    } catch (err) { console.error("[loja/busca]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });

  // Produtos relacionados (mesma categoria) — para o cross-sell da PDP
  app.get("/api/loja/produto/:id/relacionados", async (req, res) => {
    try {
      const r = await query(
        `SELECT p.id, p.nome, p.slug, p.marca,
                (SELECT url FROM loja_imagem i WHERE i.produto_id = p.id ORDER BY i.capa DESC, i.ordem LIMIT 1) AS capa,
                (SELECT MIN(COALESCE(NULLIF(v.preco_promo_cents,0), v.preco_cents)) FROM loja_variacao v WHERE v.produto_id = p.id AND v.ativo = true) AS preco_a_partir,
                (SELECT MIN(v.preco_cents) FROM loja_variacao v WHERE v.produto_id = p.id AND v.ativo = true) AS preco_cheio,
                (SELECT COALESCE(SUM(v.estoque),0) FROM loja_variacao v WHERE v.produto_id = p.id AND v.ativo = true) AS estoque_total
         FROM loja_produto p
         WHERE p.ativo = true AND p.id <> $1
           AND p.categoria_id = (SELECT categoria_id FROM loja_produto WHERE id = $1)
         ORDER BY p.destaque DESC, p.nome LIMIT 8`, [req.params.id]);
      res.json(r.rows);
    } catch (err) { console.error("[loja/relacionados]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });

  // ==========================================================
  // BANNERS ROTATIVOS DA HOME
  // ==========================================================
  const camposBanner = (b) => ({
    titulo: txt(b.titulo, 120) || null, subtitulo: txt(b.subtitulo, 200) || null,
    link: txt(b.link, 300) || null, cta_label: txt(b.cta_label, 40) || null,
    ordem: intNaoNeg(b.ordem), ativo: b.ativo === false ? false : true,
  });
  app.get("/api/loja/banners", async (req, res) => {
    try {
      const r = await query(`SELECT id, titulo, subtitulo, imagem_url, link, cta_label FROM loja_banner WHERE ativo = true ORDER BY ordem, criado_em`);
      res.json(r.rows);
    } catch (err) { console.error("[loja/banners]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });
  app.get("/api/admin/loja/banners", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const r = await query(`SELECT * FROM loja_banner ORDER BY ordem, criado_em`);
      res.json(r.rows);
    } catch (err) { console.error("[admin/loja/banners:get]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });
  app.post("/api/admin/loja/banners", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const f = camposBanner(req.body || {});
      const r = await query(`INSERT INTO loja_banner (titulo, subtitulo, link, cta_label, ordem, ativo) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [f.titulo, f.subtitulo, f.link, f.cta_label, f.ordem, f.ativo]);
      res.json({ ok: true, id: r.rows[0].id });
    } catch (err) { console.error("[admin/loja/banners:post]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });
  app.put("/api/admin/loja/banners/:id", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const f = camposBanner(req.body || {});
      const r = await query(`UPDATE loja_banner SET titulo=$2, subtitulo=$3, link=$4, cta_label=$5, ordem=$6, ativo=$7 WHERE id=$1 RETURNING id`,
        [req.params.id, f.titulo, f.subtitulo, f.link, f.cta_label, f.ordem, f.ativo]);
      if (!r.rows[0]) return res.status(404).json({ erro: "banner não encontrado" });
      res.json({ ok: true });
    } catch (err) { console.error("[admin/loja/banners:put]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });
  app.delete("/api/admin/loja/banners/:id", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const r = await query(`DELETE FROM loja_banner WHERE id=$1 RETURNING id`, [req.params.id]);
      if (!r.rows[0]) return res.status(404).json({ erro: "banner não encontrado" });
      res.json({ ok: true });
    } catch (err) { console.error("[admin/loja/banners:del]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });
  app.post("/api/admin/loja/banners/:id/imagem", exigeLogin, exigeAdmin, uploadMem.single("imagem"), async (req, res) => {
    try {
      const ex = await query(`SELECT id FROM loja_banner WHERE id=$1`, [req.params.id]);
      if (!ex.rows[0]) return res.status(404).json({ erro: "banner não encontrado" });
      if (!req.file) return res.status(400).json({ erro: "nenhuma imagem enviada" });
      const comp = await comprimir(req.file.buffer, req.file.originalname);
      const cfg = await cloudinaryCfg();
      let url;
      if (cfg) { const up = await enviarCloudinary(comp.buffer, cfg); url = up.url; }
      else { url = salvarNoDisco(comp.buffer, comp.ext); }
      await query(`UPDATE loja_banner SET imagem_url=$2 WHERE id=$1`, [req.params.id, url]);
      res.json({ ok: true, imagem_url: url });
    } catch (err) { console.error("[admin/loja/banners:img]", err.message); res.status(500).json({ erro: "erro ao enviar imagem" }); }
  });

  // Política comercial da loja (desconto PIX + parcelamento) — usada nos cards/PDP
  async function comercialCfg() {
    const [pix, pmax, pmin] = await Promise.all([
      getConfig("loja_pix_pct"), getConfig("loja_parcelas_max"), getConfig("loja_parcela_min_cents"),
    ]);
    return {
      pix_desconto_pct: Math.max(0, Math.min(50, Number(pix) || 0)),
      parcelas_max: Math.max(1, Math.min(24, parseInt(pmax) || 1)),
      parcela_min_cents: Math.max(0, parseInt(pmin) || 0),
    };
  }
  app.get("/api/loja/comercial", async (req, res) => {
    try { res.json(await comercialCfg()); }
    catch (err) { console.error("[loja/comercial]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });
  app.get("/api/admin/loja/comercial", exigeLogin, exigeAdmin, async (req, res) => {
    try { res.json(await comercialCfg()); }
    catch (err) { console.error("[admin/loja/comercial:get]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });
  app.put("/api/admin/loja/comercial", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const b = req.body || {};
      await setConfig("loja_pix_pct", String(Math.max(0, Math.min(50, Number(b.pix_desconto_pct) || 0))));
      await setConfig("loja_parcelas_max", String(Math.max(1, Math.min(24, parseInt(b.parcelas_max) || 1))));
      await setConfig("loja_parcela_min_cents", String(Math.max(0, parseInt(b.parcela_min_cents) || 0)));
      res.json({ ok: true, ...(await comercialCfg()) });
    } catch (err) { console.error("[admin/loja/comercial:put]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });

  // ==========================================================
  // CARRINHO + FRETE (público) — preços/estoque validados no servidor
  // ==========================================================
  async function validarCarrinho(itensIn) {
    const itens = Array.isArray(itensIn) ? itensIn : [];
    const mapaQtd = {};
    for (const it of itens) {
      const vid = String((it && it.variacao_id) || "");
      if (vid) mapaQtd[vid] = (mapaQtd[vid] || 0) + Math.max(1, intNaoNeg(it.qty || it.quantidade || 1));
    }
    const ids = Object.keys(mapaQtd);
    if (!ids.length) return { itens: [], subtotal_cents: 0, peso_gramas: 0, indisponivel: false };
    const r = await query(
      `SELECT v.id, v.nome AS variacao, v.preco_cents, v.preco_promo_cents, v.estoque,
              p.id AS produto_id, p.nome AS produto, p.peso_gramas, p.altura_cm, p.largura_cm, p.comprimento_cm,
              (SELECT url FROM loja_imagem i WHERE i.produto_id=p.id ORDER BY i.capa DESC, i.ordem LIMIT 1) AS capa
       FROM loja_variacao v JOIN loja_produto p ON p.id = v.produto_id
       WHERE v.ativo = true AND p.ativo = true AND v.id = ANY($1::uuid[])`, [ids]);
    const out = []; let subtotal = 0, peso = 0, indisponivel = r.rows.length < ids.length;
    for (const row of r.rows) {
      const pedido = mapaQtd[row.id];
      const preco = (row.preco_promo_cents && row.preco_promo_cents > 0) ? row.preco_promo_cents : row.preco_cents;
      const qty = Math.min(pedido, row.estoque);
      if (qty < pedido) indisponivel = true;
      if (qty <= 0) { indisponivel = true; continue; }
      subtotal += preco * qty; peso += (row.peso_gramas || 0) * qty;
      out.push({
        variacao_id: row.id, produto_id: row.produto_id, produto: row.produto, variacao: row.variacao,
        preco_cents: preco, qty, subtotal_cents: preco * qty, estoque: row.estoque, capa: row.capa,
        peso_gramas: row.peso_gramas, altura_cm: row.altura_cm, largura_cm: row.largura_cm, comprimento_cm: row.comprimento_cm,
      });
    }
    return { itens: out, subtotal_cents: subtotal, peso_gramas: peso, indisponivel };
  }

  // Cálculo de frete via Melhor Envio (token/CEP de origem no banco)
  async function calcularFreteME(cepDestino, itens) {
    // remove um "Bearer " colado por engano e espaços/quebras nas pontas
    const token = String(await getConfig("melhorenvio_token") || "").replace(/^Bearer\s+/i, "").trim();
    const cepOrigem = soDigitos(await getConfig("melhorenvio_cep_origem"), 8);
    if (!token || cepOrigem.length !== 8) { const e = new Error("frete_nao_configurado"); e.code = 400; throw e; }
    const sandbox = (await getConfig("melhorenvio_sandbox")) === "true";
    const base = sandbox ? "https://sandbox.melhorenvio.com.br" : "https://melhorenvio.com.br";
    const products = itens.map((it, i) => ({
      id: String(i + 1),
      width: Math.max(11, Math.round(it.largura_cm || 0)),
      height: Math.max(2, Math.round(it.altura_cm || 0)),
      length: Math.max(16, Math.round(it.comprimento_cm || 0)),
      weight: Math.max(0.1, (it.peso_gramas || 0) / 1000),
      insurance_value: +((it.preco_cents || 0) / 100).toFixed(2),
      quantity: it.qty,
    }));
    const r = await fetch(base + "/api/v2/me/shipment/calculate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json", "Accept": "application/json",
        "Authorization": "Bearer " + token,
        "User-Agent": "Aqualife OS (pixelproperformance@gmail.com)",
      },
      body: JSON.stringify({
        from: { postal_code: cepOrigem }, to: { postal_code: cepDestino },
        products, options: { receipt: false, own_hand: false },
      }),
    });
    const raw = await r.text();
    let j = null; try { j = JSON.parse(raw); } catch {}
    if (!r.ok) {
      const e = new Error("me_http_" + r.status); e.code = 502;
      e.detalhe = (j && (j.message || j.error || j.errors)) || raw.slice(0, 300);
      throw e;
    }
    const lista = Array.isArray(j) ? j : [];
    return lista.filter((o) => o && !o.error && (o.price || o.custom_price)).map((o) => ({
      id: o.id, nome: o.name, empresa: (o.company && o.company.name) || "",
      preco: Number(o.custom_price || o.price || 0),
      prazo_dias: o.delivery_time || o.custom_delivery_time || null,
    }));
  }

  app.post("/api/loja/carrinho", async (req, res) => {
    try { res.json(await validarCarrinho(req.body && req.body.itens)); }
    catch (err) { console.error("[loja/carrinho]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });

  app.post("/api/loja/frete", async (req, res) => {
    try {
      const cep = soDigitos(req.body && req.body.cep_destino, 8);
      if (cep.length !== 8) return res.status(400).json({ erro: "CEP inválido" });
      const carrinho = await validarCarrinho(req.body && req.body.itens);
      if (!carrinho.itens.length) return res.status(400).json({ erro: "carrinho vazio" });
      const opcoes = await calcularFreteME(cep, carrinho.itens);
      res.json({ opcoes, subtotal_cents: carrinho.subtotal_cents });
    } catch (err) {
      if (err.code === 400) return res.status(400).json({ erro: "O frete ainda não foi configurado pela loja." });
      console.error("[loja/frete]", err.message);
      res.status(502).json({ erro: "não foi possível calcular o frete agora" });
    }
  });

  // ==========================================================
  // ADMIN — categorias
  // ==========================================================
  app.get("/api/admin/loja/categorias", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const r = await query(`SELECT c.*, (SELECT COUNT(*) FROM loja_produto p WHERE p.categoria_id = c.id) AS n_produtos FROM loja_categoria c ORDER BY c.ordem, c.nome`);
      res.json(r.rows);
    } catch (err) { console.error("[admin/loja/categorias:get]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });
  app.post("/api/admin/loja/categorias", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const nome = txt(req.body && req.body.nome, 80);
      if (!nome) return res.status(400).json({ erro: "informe o nome da categoria" });
      const r = await query(`INSERT INTO loja_categoria (nome, slug, ordem) VALUES ($1,$2,$3) RETURNING *`, [nome, slugify(nome), intNaoNeg(req.body && req.body.ordem)]);
      res.json(r.rows[0]);
    } catch (err) { console.error("[admin/loja/categorias:post]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });
  app.put("/api/admin/loja/categorias/:id", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const nome = txt(req.body && req.body.nome, 80);
      const r = await query(`UPDATE loja_categoria SET nome = COALESCE(NULLIF($2,''), nome), slug = COALESCE(NULLIF($3,''), slug), ordem = $4, ativo = $5 WHERE id = $1 RETURNING *`,
        [req.params.id, nome, nome ? slugify(nome) : "", intNaoNeg(req.body && req.body.ordem), req.body && req.body.ativo === false ? false : true]);
      if (!r.rows[0]) return res.status(404).json({ erro: "categoria não encontrada" });
      res.json(r.rows[0]);
    } catch (err) { console.error("[admin/loja/categorias:put]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });
  app.delete("/api/admin/loja/categorias/:id", exigeLogin, exigeAdmin, async (req, res) => {
    try { await query(`DELETE FROM loja_categoria WHERE id = $1`, [req.params.id]); res.json({ ok: true }); }
    catch (err) { console.error("[admin/loja/categorias:del]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });

  // ==========================================================
  // ADMIN — produtos
  // ==========================================================
  app.get("/api/admin/loja/produtos", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const r = await query(
        `SELECT p.id, p.nome, p.ativo, p.destaque, c.nome AS categoria,
                (SELECT url FROM loja_imagem i WHERE i.produto_id = p.id ORDER BY i.capa DESC, i.ordem LIMIT 1) AS capa,
                (SELECT COUNT(*) FROM loja_variacao v WHERE v.produto_id = p.id) AS n_variacoes,
                (SELECT COALESCE(SUM(v.estoque),0) FROM loja_variacao v WHERE v.produto_id = p.id) AS estoque_total,
                (SELECT MIN(COALESCE(NULLIF(v.preco_promo_cents,0), v.preco_cents)) FROM loja_variacao v WHERE v.produto_id = p.id) AS preco_a_partir
         FROM loja_produto p LEFT JOIN loja_categoria c ON c.id = p.categoria_id ORDER BY p.ativo DESC, p.nome`);
      res.json(r.rows);
    } catch (err) { console.error("[admin/loja/produtos:get]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });
  app.get("/api/admin/loja/produtos/:id", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const pr = await query(`SELECT * FROM loja_produto WHERE id = $1`, [req.params.id]);
      const prod = pr.rows[0];
      if (!prod) return res.status(404).json({ erro: "produto não encontrado" });
      const [vr, ir] = await Promise.all([
        query(`SELECT * FROM loja_variacao WHERE produto_id = $1 ORDER BY ordem, nome`, [prod.id]),
        query(`SELECT * FROM loja_imagem WHERE produto_id = $1 ORDER BY capa DESC, ordem`, [prod.id]),
      ]);
      res.json({ ...prod, variacoes: vr.rows, imagens: ir.rows });
    } catch (err) { console.error("[admin/loja/produtos:getId]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });
  app.post("/api/admin/loja/produtos", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const b = req.body || {}; const f = camposProduto(b);
      if (!f.nome) return res.status(400).json({ erro: "informe o nome do produto" });
      const variacoesIn = Array.isArray(b.variacoes) && b.variacoes.length ? b.variacoes
        : [{ nome: null, preco_cents: intNaoNeg(b.preco_cents), estoque: intNaoNeg(b.estoque) }];
      const out = await withTransaction(async (c) => {
        const pr = await c.query(
          `INSERT INTO loja_produto (nome, slug, descricao, categoria_id, marca, modelo, condicao, garantia_meses,
             ncm, cest, origem_fiscal, unidade, ml_categoria_id, peso_gramas, altura_cm, largura_cm, comprimento_cm, ativo, destaque,
             litragem_min, litragem_max, vazao_lh, sistema, dica_tecnica)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24) RETURNING *`,
          [f.nome, slugify(f.nome), f.descricao, f.categoria_id, f.marca, f.modelo, f.condicao, f.garantia_meses,
           f.ncm, f.cest, f.origem_fiscal, f.unidade, f.ml_categoria_id, f.peso_gramas, f.altura_cm, f.largura_cm, f.comprimento_cm, f.ativo, f.destaque,
           f.litragem_min, f.litragem_max, f.vazao_lh, f.sistema, f.dica_tecnica]);
        const prod = pr.rows[0]; let ordem = 0;
        for (const vIn of variacoesIn) {
          const v = normVariacao(vIn, ordem++);
          const vr = await c.query(`INSERT INTO loja_variacao (produto_id, nome, sku, ean, preco_cents, preco_promo_cents, estoque, custo_cents, estoque_minimo, ordem, ativo)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
            [prod.id, v.nome, v.sku, v.ean, v.preco_cents, v.preco_promo_cents, v.estoque, v.custo_cents, v.estoque_minimo, v.ordem, v.ativo]);
          if (v.estoque > 0) {
            await c.query(`INSERT INTO estoque_mov (variacao_id, tipo, qty, custo_unit_cents, saldo_after, motivo) VALUES ($1,'inicial',$2,$3,$2,'Saldo inicial (cadastro)')`,
              [vr.rows[0].id, v.estoque, v.custo_cents || null]);
          }
        }
        return prod;
      });
      res.json({ ok: true, id: out.id });
    } catch (err) { console.error("[admin/loja/produtos:post]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });
  app.put("/api/admin/loja/produtos/:id", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const b = req.body || {}; const f = camposProduto(b);
      if (!f.nome) return res.status(400).json({ erro: "informe o nome do produto" });
      await withTransaction(async (c) => {
        const upd = await c.query(
          `UPDATE loja_produto SET nome=$2, slug=$3, descricao=$4, categoria_id=$5, marca=$6, modelo=$7, condicao=$8,
             garantia_meses=$9, ncm=$10, cest=$11, origem_fiscal=$12, unidade=$13, ml_categoria_id=$14,
             peso_gramas=$15, altura_cm=$16, largura_cm=$17, comprimento_cm=$18, ativo=$19, destaque=$20,
             litragem_min=$21, litragem_max=$22, vazao_lh=$23, sistema=$24, dica_tecnica=$25, atualizado_em=NOW()
           WHERE id=$1 RETURNING id`,
          [req.params.id, f.nome, slugify(f.nome), f.descricao, f.categoria_id, f.marca, f.modelo, f.condicao,
           f.garantia_meses, f.ncm, f.cest, f.origem_fiscal, f.unidade, f.ml_categoria_id, f.peso_gramas, f.altura_cm, f.largura_cm, f.comprimento_cm, f.ativo, f.destaque,
           f.litragem_min, f.litragem_max, f.vazao_lh, f.sistema, f.dica_tecnica]);
        if (!upd.rows[0]) { const e = new Error("nao_encontrado"); e.code404 = true; throw e; }
        const variacoesIn = Array.isArray(b.variacoes) ? b.variacoes : [];
        const manter = []; let ordem = 0;
        for (const vIn of variacoesIn) {
          const v = normVariacao(vIn, ordem++);
          if (v.id) {
            // Estoque NÃO é alterado aqui — só via livro-razão (Movimentar estoque). Custo/mínimo editáveis.
            const r = await c.query(`UPDATE loja_variacao SET nome=$2, sku=$3, ean=$4, preco_cents=$5, preco_promo_cents=$6, custo_cents=$7, estoque_minimo=$8, ordem=$9, ativo=$10 WHERE id=$1 AND produto_id=$11 RETURNING id`,
              [v.id, v.nome, v.sku, v.ean, v.preco_cents, v.preco_promo_cents, v.custo_cents, v.estoque_minimo, v.ordem, v.ativo, req.params.id]);
            if (r.rows[0]) manter.push(r.rows[0].id);
          } else {
            const r = await c.query(`INSERT INTO loja_variacao (produto_id, nome, sku, ean, preco_cents, preco_promo_cents, estoque, custo_cents, estoque_minimo, ordem, ativo)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
              [req.params.id, v.nome, v.sku, v.ean, v.preco_cents, v.preco_promo_cents, v.estoque, v.custo_cents, v.estoque_minimo, v.ordem, v.ativo]);
            manter.push(r.rows[0].id);
            if (v.estoque > 0) await c.query(`INSERT INTO estoque_mov (variacao_id, tipo, qty, custo_unit_cents, saldo_after, motivo) VALUES ($1,'inicial',$2,$3,$2,'Saldo inicial (cadastro)')`, [r.rows[0].id, v.estoque, v.custo_cents || null]);
          }
        }
        if (manter.length) await c.query(`DELETE FROM loja_variacao WHERE produto_id=$1 AND NOT (id = ANY($2::uuid[]))`, [req.params.id, manter]);
        else await c.query(`DELETE FROM loja_variacao WHERE produto_id=$1`, [req.params.id]);
      });
      res.json({ ok: true });
    } catch (err) {
      if (err.code404) return res.status(404).json({ erro: "produto não encontrado" });
      console.error("[admin/loja/produtos:put]", err.message); res.status(500).json({ erro: "erro interno" });
    }
  });
  app.delete("/api/admin/loja/produtos/:id", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const r = await query(`UPDATE loja_produto SET ativo=false, atualizado_em=NOW() WHERE id=$1 RETURNING id`, [req.params.id]);
      if (!r.rows[0]) return res.status(404).json({ erro: "produto não encontrado" });
      res.json({ ok: true });
    } catch (err) { console.error("[admin/loja/produtos:del]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });

  // ==========================================================
  // ERP — estoque: movimentação manual, extrato e resumo
  // ==========================================================
  app.post("/api/admin/loja/estoque/movimento", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const b = req.body || {};
      const tipo = TIPOS_MOV.includes(b.tipo) ? b.tipo : "ajuste";
      let qty = Math.trunc(Number(b.qty) || 0);
      // Conveniência: se vier "quantidade" positiva, aplica o sinal pelo tipo
      if (!qty && b.quantidade != null) {
        const n = Math.abs(Math.trunc(Number(b.quantidade) || 0));
        qty = (["venda", "perda"].includes(tipo)) ? -n : n;
      }
      if (!b.variacao_id) return res.status(400).json({ erro: "variação não informada" });
      if (!qty) return res.status(400).json({ erro: "quantidade inválida" });
      const custo = b.custo_unit_cents != null && b.custo_unit_cents !== "" ? intNaoNeg(b.custo_unit_cents) : null;
      const out = await withTransaction((cx) => movimentarEstoque((t,p)=>cx.query(t,p), {
        variacao_id: b.variacao_id, tipo, qty, custo_unit_cents: custo, motivo: txt(b.motivo, 200) || null,
        ref_tipo: "manual", ref_id: null, usuario_id: req.usuario && req.usuario.id,
      }));
      res.json({ ok: true, ...out });
    } catch (err) {
      if (err.code === 409) return res.status(409).json({ erro: "Estoque insuficiente para essa saída." });
      if (err.code === 404) return res.status(404).json({ erro: "variação não encontrada" });
      if (err.code === 400) return res.status(400).json({ erro: "quantidade inválida" });
      console.error("[admin/loja/estoque/mov]", err.message); res.status(500).json({ erro: "erro interno" });
    }
  });
  app.get("/api/admin/loja/estoque/:variacaoId/movimentos", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const r = await query(`SELECT tipo, qty, custo_unit_cents, saldo_after, motivo, ref_tipo, ref_id, criado_em
                             FROM estoque_mov WHERE variacao_id=$1 ORDER BY criado_em DESC LIMIT 100`, [req.params.variacaoId]);
      res.json(r.rows);
    } catch (err) { console.error("[admin/loja/estoque/movs]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });
  app.get("/api/admin/loja/estoque/resumo", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const tot = await query(
        `SELECT COALESCE(SUM(v.estoque),0)::int AS unidades,
                COALESCE(SUM(v.estoque * v.custo_cents),0)::bigint AS valor_custo_cents,
                COALESCE(SUM(v.estoque * v.preco_cents),0)::bigint AS valor_venda_cents
         FROM loja_variacao v JOIN loja_produto p ON p.id=v.produto_id WHERE v.ativo=true AND p.ativo=true`);
      const baixo = await query(
        `SELECT v.id, v.nome AS variacao, v.estoque, v.estoque_minimo, p.nome AS produto
         FROM loja_variacao v JOIN loja_produto p ON p.id=v.produto_id
         WHERE v.ativo=true AND p.ativo=true AND v.estoque_minimo > 0 AND v.estoque <= v.estoque_minimo
         ORDER BY (v.estoque - v.estoque_minimo) ASC LIMIT 50`);
      const t = tot.rows[0] || {};
      res.json({
        unidades: Number(t.unidades || 0),
        valor_custo_cents: Number(t.valor_custo_cents || 0),
        valor_venda_cents: Number(t.valor_venda_cents || 0),
        margem_potencial_cents: Number(t.valor_venda_cents || 0) - Number(t.valor_custo_cents || 0),
        abaixo_minimo: baixo.rows,
      });
    } catch (err) { console.error("[admin/loja/estoque/resumo]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });

  // ==========================================================
  // ADMIN — fotos (Cloudinary, com fallback para disco)
  // ==========================================================
  app.post("/api/admin/loja/produtos/:id/fotos", exigeLogin, exigeAdmin, uploadMem.array("fotos", 10), async (req, res) => {
    try {
      const pr = await query(`SELECT id FROM loja_produto WHERE id=$1`, [req.params.id]);
      if (!pr.rows[0]) return res.status(404).json({ erro: "produto não encontrado" });
      const arquivos = req.files || [];
      if (!arquivos.length) return res.status(400).json({ erro: "nenhuma imagem enviada" });
      const cfg = await cloudinaryCfg();
      const jaTem = await query(`SELECT COUNT(*)::int AS n FROM loja_imagem WHERE produto_id=$1`, [req.params.id]);
      let ordem = jaTem.rows[0].n; const criadas = [];
      for (const fa of arquivos) {
        const comp = await comprimir(fa.buffer, fa.originalname);
        let url, publicId = null;
        if (cfg) {
          const up = await enviarCloudinary(comp.buffer, cfg); url = up.url; publicId = up.publicId;
        } else {
          url = salvarNoDisco(comp.buffer, comp.ext);
        }
        const capa = ordem === 0;
        const r = await query(`INSERT INTO loja_imagem (produto_id, url, public_id, ordem, capa) VALUES ($1,$2,$3,$4,$5) RETURNING id, url, ordem, capa`,
          [req.params.id, url, publicId, ordem, capa]);
        criadas.push(r.rows[0]); ordem++;
      }
      res.json({ ok: true, imagens: criadas, destino: cfg ? "cloudinary" : "disco" });
    } catch (err) { console.error("[admin/loja/fotos:post]", err.message); res.status(500).json({ erro: err.message || "erro interno" }); }
  });

  app.put("/api/admin/loja/foto/:imgId/capa", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const img = await query(`SELECT produto_id FROM loja_imagem WHERE id=$1`, [req.params.imgId]);
      if (!img.rows[0]) return res.status(404).json({ erro: "imagem não encontrada" });
      await withTransaction(async (c) => {
        await c.query(`UPDATE loja_imagem SET capa=false WHERE produto_id=$1`, [img.rows[0].produto_id]);
        await c.query(`UPDATE loja_imagem SET capa=true WHERE id=$1`, [req.params.imgId]);
      });
      res.json({ ok: true });
    } catch (err) { console.error("[admin/loja/foto:capa]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });

  app.delete("/api/admin/loja/foto/:imgId", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const r = await query(`DELETE FROM loja_imagem WHERE id=$1 RETURNING url, public_id`, [req.params.imgId]);
      if (!r.rows[0]) return res.status(404).json({ erro: "imagem não encontrada" });
      const { url, public_id } = r.rows[0];
      if (public_id) {
        const cfg = await cloudinaryCfg();
        if (cfg) await destruirCloudinary(public_id, cfg);
      } else if (url) {
        const nome = path.basename(url);
        if (nome) unlink(path.join(UPLOADS_DIR, nome), () => {});
      }
      res.json({ ok: true });
    } catch (err) { console.error("[admin/loja/foto:del]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });

  // ==========================================================
  // ADMIN — credenciais do Cloudinary (guardadas no banco)
  // ==========================================================
  app.get("/api/admin/integracoes/cloudinary", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const cloud = await getConfig("cloudinary_cloud_name");
      const key = await getConfig("cloudinary_api_key");
      const secret = await getConfig("cloudinary_api_secret");
      res.json({
        configurado: Boolean(cloud && key && secret),
        cloud_name: cloud || null,
        api_key_mascarado: mascarar(key),
        api_secret_mascarado: mascarar(secret),
      });
    } catch (err) { console.error("[admin/cloudinary:get]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });
  app.put("/api/admin/integracoes/cloudinary", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const { cloud_name, api_key, api_secret } = req.body || {};
      if (cloud_name !== undefined) await setConfig("cloudinary_cloud_name", txt(cloud_name, 100));
      if (api_key !== undefined && api_key !== "") await setConfig("cloudinary_api_key", txt(api_key, 100));
      if (api_secret !== undefined && api_secret !== "") await setConfig("cloudinary_api_secret", txt(api_secret, 120));
      res.json({ ok: true });
    } catch (err) { console.error("[admin/cloudinary:put]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });

  // ==========================================================
  // ADMIN — credenciais do Melhor Envio (frete)
  // ==========================================================
  app.get("/api/admin/integracoes/melhorenvio", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const token = await getConfig("melhorenvio_token");
      const cep = await getConfig("melhorenvio_cep_origem");
      res.json({
        configurado: Boolean(token && cep),
        cep_origem: cep || null,
        sandbox: (await getConfig("melhorenvio_sandbox")) === "true",
        token_mascarado: mascarar(token),
      });
    } catch (err) { console.error("[admin/melhorenvio:get]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });
  app.put("/api/admin/integracoes/melhorenvio", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const { token, cep_origem, sandbox } = req.body || {};
      if (token !== undefined && token !== "") await setConfig("melhorenvio_token", txt(token, 4000)); // JWT do Melhor Envio ~1700 chars
      if (cep_origem !== undefined) await setConfig("melhorenvio_cep_origem", soDigitos(cep_origem, 8));
      if (sandbox !== undefined) await setConfig("melhorenvio_sandbox", sandbox ? "true" : "false");
      res.json({ ok: true });
    } catch (err) { console.error("[admin/melhorenvio:put]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });
  // Teste de conexão do frete — testa o MESMO token nos DOIS ambientes (produção e sandbox)
  // para diagnosticar: token de sandbox, token inválido, ou permissão faltando.
  app.post("/api/admin/integracoes/melhorenvio/teste", exigeLogin, exigeAdmin, async (req, res) => {
    const token = String(await getConfig("melhorenvio_token") || "").replace(/^Bearer\s+/i, "").trim();
    const cepOrigem = soDigitos(await getConfig("melhorenvio_cep_origem"), 8);
    if (!token || cepOrigem.length !== 8) return res.status(400).json({ erro: "Configure o token e o CEP de origem primeiro." });
    const corpo = {
      from: { postal_code: cepOrigem }, to: { postal_code: "01310100" },
      products: [{ id: "1", width: 15, height: 5, length: 20, weight: 0.5, insurance_value: 50, quantity: 1 }],
      options: { receipt: false, own_hand: false },
    };
    async function tenta(base) {
      try {
        const r = await fetch(base + "/api/v2/me/shipment/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json",
            "Authorization": "Bearer " + token, "User-Agent": "Aqualife OS (pixelproperformance@gmail.com)" },
          body: JSON.stringify(corpo),
        });
        const raw = await r.text(); let j = null; try { j = JSON.parse(raw); } catch {}
        const n = Array.isArray(j) ? j.filter((o) => o && !o.error && (o.price || o.custom_price)).length : 0;
        const msg = (j && (j.message || j.error)) || (r.ok ? "" : raw.slice(0, 150));
        return { status: r.status, ok: r.ok && n > 0, n, msg };
      } catch (e) { return { status: 0, ok: false, n: 0, msg: e.message }; }
    }
    const [producao, sandbox] = await Promise.all([tenta("https://melhorenvio.com.br"), tenta("https://sandbox.melhorenvio.com.br")]);
    res.json({ token_len: token.length, producao, sandbox });
  });

  // ==========================================================
  // CHECKOUT + PEDIDO + PAGAMENTO (Mercado Pago)
  // ==========================================================
  const reaisC = (c) => "R$ " + (Number(c || 0) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  async function criarPreferenceLoja(pedido, itens) {
    const token = await getConfig("mercadopago_access_token");
    if (!token) { const e = new Error("mp_nao_configurado"); e.code = 400; throw e; }
    const items = itens.map((it) => ({
      title: (it.produto + (it.variacao ? " - " + it.variacao : "")).slice(0, 250),
      quantity: it.qty, unit_price: +(it.preco_cents / 100).toFixed(2), currency_id: "BRL",
    }));
    const body = {
      items,
      payer: { name: pedido.cliente_nome, email: pedido.cliente_email },
      external_reference: "LOJA-" + pedido.id,
      back_urls: {
        success: `${baseUrl}/loja.html?pedido=ok`,
        failure: `${baseUrl}/loja.html?pedido=falha`,
        pending: `${baseUrl}/loja.html?pedido=pendente`,
      },
      auto_return: "approved",
      notification_url: `${baseUrl}/api/webhooks/mercadopago`,
      statement_descriptor: "AQUALIFE LOJA",
      shipments: { cost: +(pedido.frete_cents / 100).toFixed(2), mode: "not_specified" },
    };
    const r = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: { "content-type": "application/json", "authorization": "Bearer " + token, "X-Idempotency-Key": "LOJA-" + pedido.id },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.id) { const e = new Error((j && j.message) || ("MP HTTP " + r.status)); e.code = 502; throw e; }
    return { id: j.id, init_point: j.init_point || j.sandbox_init_point };
  }

  function emailPedido(ped) {
    return `<div style="font-family:Arial,sans-serif;color:#12333F;line-height:1.6">
      <h2 style="color:#125265">Pedido confirmado! 🐠</h2>
      <p>Olá, ${(ped.cliente_nome || "").split(" ")[0]}. Recebemos o pagamento do seu pedido na Aqualife.</p>
      <p><b>Subtotal:</b> ${reaisC(ped.subtotal_cents)}<br>
         <b>Frete${ped.frete_servico ? " (" + ped.frete_servico + ")" : ""}:</b> ${reaisC(ped.frete_cents)}<br>
         <b>Total:</b> ${reaisC(ped.total_cents)}</p>
      <p><b>Entrega:</b> ${ped.rua}, ${ped.numero}${ped.complemento ? " - " + ped.complemento : ""} — ${ped.bairro}, ${ped.cidade}/${ped.uf} — CEP ${ped.cep}</p>
      <p>Acompanhe o status do seu pedido a qualquer momento:</p>
      <p><a href="${baseUrl}/pedido.html?id=${encodeURIComponent(ped.id)}&email=${encodeURIComponent(ped.cliente_email || "")}"
            style="display:inline-block;background:#125265;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px">Acompanhar meu pedido</a></p>
      <p style="font-size:13px;color:#557">Nº do pedido: ${ped.id}</p>
      <p>Em breve você recebe o código de rastreio. Obrigado por comprar com a gente!</p>
    </div>`;
  }

  function emailEnviado(ped) {
    const url = trackingUrl(ped.rastreio_codigo);
    return `<div style="font-family:Arial,sans-serif;color:#12333F;line-height:1.6">
      <h2 style="color:#125265">Seu pedido foi enviado! 📦</h2>
      <p>Olá, ${(ped.cliente_nome || "").split(" ")[0]}. Seu pedido saiu para entrega${ped.frete_servico ? " via " + ped.frete_servico : ""}.</p>
      ${ped.rastreio_codigo ? `<p><b>Código de rastreio:</b> ${ped.rastreio_codigo}</p>
        ${url ? `<p><a href="${url}" style="display:inline-block;background:#125265;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px">Rastrear entrega</a></p>` : ""}` : ""}
      <p>Você também pode acompanhar tudo aqui:
        <a href="${linkPedido(ped)}">acompanhar meu pedido</a>.</p>
      <p style="font-size:13px;color:#557">Nº do pedido: ${ped.id}</p>
    </div>`;
  }

  app.post("/api/loja/checkout", async (req, res) => {
    try {
      const b = req.body || {}, c = b.cliente || {}, e = b.endereco || {};
      const f = {
        nome: txt(c.nome, 120), email: txt(c.email, 120), cpf: soDigitos(c.cpf, 14), telefone: soDigitos(c.telefone, 15),
        cep: soDigitos(e.cep, 8), rua: txt(e.rua, 160), numero: txt(e.numero, 20),
        complemento: txt(e.complemento, 80) || null, bairro: txt(e.bairro, 120), cidade: txt(e.cidade, 120), uf: txt(e.uf, 2).toUpperCase(),
      };
      for (const k of ["nome", "email", "cpf", "telefone", "cep", "rua", "numero", "bairro", "cidade", "uf"])
        if (!f[k]) return res.status(400).json({ erro: "preencha todos os campos obrigatórios" });
      if (!/^\S+@\S+\.\S+$/.test(f.email)) return res.status(400).json({ erro: "e-mail inválido" });
      if (f.cep.length !== 8) return res.status(400).json({ erro: "CEP inválido" });

      const carrinho = await validarCarrinho(b.itens);
      if (!carrinho.itens.length) return res.status(400).json({ erro: "carrinho vazio" });
      if (carrinho.indisponivel) return res.status(409).json({ erro: "O estoque de algum item mudou. Revise o carrinho.", recarregar: true });

      // Re-valida o frete no servidor (evita adulteração do preço)
      const opcoes = await calcularFreteME(f.cep, carrinho.itens);
      const opt = opcoes.find((o) => String(o.id) === String(b.frete_id));
      if (!opt) return res.status(400).json({ erro: "Opção de frete inválida. Recalcule o frete." });
      const freteCents = Math.round(opt.preco * 100);
      const freteServico = opt.nome + (opt.empresa ? " - " + opt.empresa : "");
      const total = carrinho.subtotal_cents + freteCents;

      const pedido = await withTransaction(async (cx) => {
        const pr = await cx.query(
          `INSERT INTO loja_pedido (cliente_nome, cliente_email, cliente_cpf, cliente_telefone,
             cep, rua, numero, complemento, bairro, cidade, uf,
             subtotal_cents, frete_servico, frete_servico_id, frete_cents, total_cents, status, status_pagamento)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'pendente','pending') RETURNING *`,
          [f.nome, f.email, f.cpf, f.telefone, f.cep, f.rua, f.numero, f.complemento, f.bairro, f.cidade, f.uf,
           carrinho.subtotal_cents, freteServico, String(opt.id), freteCents, total]);
        const ped = pr.rows[0];
        for (const it of carrinho.itens) {
          await cx.query(
            `INSERT INTO loja_pedido_item (pedido_id, variacao_id, produto_id, produto_nome, variacao_nome, preco_cents, qty, subtotal_cents)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
            [ped.id, it.variacao_id, it.produto_id, it.produto, it.variacao, it.preco_cents, it.qty, it.subtotal_cents]);
        }
        return ped;
      });

      const pref = await criarPreferenceLoja(pedido, carrinho.itens);
      await query(`UPDATE loja_pedido SET mp_preference_id=$2 WHERE id=$1`, [pedido.id, pref.id]);
      res.json({ ok: true, pedido_id: pedido.id, init_point: pref.init_point });
    } catch (err) {
      if (err.code === 400) return res.status(400).json({ erro: "Pagamento ou frete ainda não configurado pela loja." });
      console.error("[loja/checkout]", err.message);
      res.status(err.code || 500).json({ erro: "Não foi possível finalizar agora. Tente novamente." });
    }
  });

  // Chamado pelo webhook do Mercado Pago (server.js) para pedidos "LOJA-…"
  async function processarPagamentoMP(pg) {
    try {
      const ref = String((pg && pg.external_reference) || "");
      if (!ref.startsWith("LOJA-")) return;
      const id = ref.slice(5);
      const pr = await query(`SELECT * FROM loja_pedido WHERE id=$1`, [id]);
      const ped = pr.rows[0]; if (!ped) return;
      if (pg.status === "approved") {
        const jaPago = ped.status === "pago";
        await withTransaction(async (cx) => {
          const upd = await cx.query(
            `UPDATE loja_pedido SET status='pago', status_pagamento='approved', mp_payment_id=$2, atualizado_em=NOW()
             WHERE id=$1 AND status<>'pago' RETURNING id`, [id, String(pg.id)]);
          if (upd.rows[0]) {
            const its = await cx.query(`SELECT variacao_id, qty FROM loja_pedido_item WHERE pedido_id=$1`, [id]);
            for (const it of its.rows)
              if (it.variacao_id) {
                try { await movimentarEstoque((t,p)=>cx.query(t,p), { variacao_id: it.variacao_id, tipo: "venda", qty: -Math.abs(it.qty), motivo: "Venda (pedido pago)", ref_tipo: "pedido", ref_id: id, permitirNegativo: true }); }
                catch (e) { console.warn("[loja] baixa de estoque:", e.message); }
              }
          }
        });
        if (!jaPago && enviarEmail) {
          try { await enviarEmail({ para: ped.cliente_email, assunto: "Pedido confirmado — Aqualife", html: emailPedido(ped) }); }
          catch (e) { console.warn("[loja] e-mail de pedido falhou:", e.message); }
        }
        // NF-e automática ao aprovar o pagamento (se ativada e configurada) — não bloqueia o webhook
        if (!jaPago) {
          try {
            const auto = (await getConfig("nfe_auto")) === "true";
            const token = String(await getConfig("focusnfe_token") || "").trim();
            if (auto && token) emitirNFe(id).catch((e) => console.warn("[loja] NF-e automática falhou:", e.message));
          } catch (e) { console.warn("[loja] NF-e auto (config):", e.message); }
        }
      } else if (["rejected", "cancelled", "refunded", "charged_back"].includes(pg.status)) {
        await query(`UPDATE loja_pedido SET status_pagamento=$2, atualizado_em=NOW() WHERE id=$1 AND status<>'pago'`, [id, pg.status]);
      }
    } catch (err) { console.error("[loja] processarPagamentoMP:", err.message); }
  }

  // ADMIN — pedidos
  app.get("/api/admin/loja/pedidos", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const r = await query(
        `SELECT id, cliente_nome, cliente_email, total_cents, frete_servico, status, status_pagamento, origem, ml_order_id, criado_em
         FROM loja_pedido ORDER BY criado_em DESC LIMIT 300`);
      res.json(r.rows);
    } catch (err) { console.error("[admin/loja/pedidos]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });
  app.get("/api/admin/loja/pedidos/:id", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const pr = await query(`SELECT * FROM loja_pedido WHERE id=$1`, [req.params.id]);
      const ped = pr.rows[0];
      if (!ped) return res.status(404).json({ erro: "pedido não encontrado" });
      const its = await query(`SELECT * FROM loja_pedido_item WHERE pedido_id=$1 ORDER BY produto_nome`, [req.params.id]);
      res.json({ ...ped, itens: its.rows });
    } catch (err) { console.error("[admin/loja/pedidos:id]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });

  // ==========================================================
  // FASE 4B — rastreio do pedido para o cliente (público + conta)
  // ==========================================================
  const STATUS_LABEL = {
    pendente: "Aguardando pagamento", pago: "Pagamento confirmado", separando: "Em separação",
    enviado: "Enviado", entregue: "Entregue", cancelado: "Cancelado",
  };
  const trackingUrl = (cod) => cod ? "https://www.melhorrastreio.com.br/rastreio/" + encodeURIComponent(cod) : null;
  const linkPedido = (ped) => baseUrl + "/pedido.html?id=" + encodeURIComponent(ped.id) + "&email=" + encodeURIComponent(ped.cliente_email || "");

  function pedidoPublico(ped, itens) {
    return {
      id: ped.id, criado_em: ped.criado_em,
      status: ped.status, status_label: STATUS_LABEL[ped.status] || ped.status,
      status_pagamento: ped.status_pagamento,
      subtotal_cents: ped.subtotal_cents, frete_cents: ped.frete_cents, total_cents: ped.total_cents,
      frete_servico: ped.frete_servico || null,
      rastreio_codigo: ped.rastreio_codigo || null, rastreio_url: trackingUrl(ped.rastreio_codigo),
      entrega: { rua: ped.rua, numero: ped.numero, complemento: ped.complemento, bairro: ped.bairro, cidade: ped.cidade, uf: ped.uf, cep: ped.cep },
      itens: (itens || []).map((i) => ({ produto_nome: i.produto_nome, variacao_nome: i.variacao_nome, qty: i.qty, preco_cents: i.preco_cents, subtotal_cents: i.subtotal_cents })),
    };
  }

  // Consulta pública por número do pedido + e-mail (link do e-mail / página pedido.html)
  app.get("/api/loja/pedido/:id", async (req, res) => {
    try {
      const email = txt(req.query.email, 120).toLowerCase();
      if (!email) return res.status(400).json({ erro: "informe o e-mail do pedido" });
      const pr = await query(`SELECT * FROM loja_pedido WHERE id=$1`, [req.params.id]);
      const ped = pr.rows[0];
      if (!ped || String(ped.cliente_email || "").toLowerCase() !== email)
        return res.status(404).json({ erro: "Pedido não encontrado. Confira o número e o e-mail." });
      const its = await query(`SELECT * FROM loja_pedido_item WHERE pedido_id=$1 ORDER BY produto_nome`, [req.params.id]);
      res.json(pedidoPublico(ped, its.rows));
    } catch (err) { console.error("[loja/pedido:get]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });

  // "Meus pedidos" — cliente logado (casa pelo e-mail da conta)
  app.get("/api/loja/meus-pedidos", exigeLogin, async (req, res) => {
    try {
      const ur = await query(`SELECT email FROM app_user WHERE id=$1`, [req.usuario.id]);
      const email = String((ur.rows[0] && ur.rows[0].email) || "").toLowerCase();
      if (!email) return res.json([]);
      const pr = await query(
        `SELECT id, total_cents, frete_servico, status, status_pagamento, rastreio_codigo, criado_em
         FROM loja_pedido WHERE lower(cliente_email)=$1 ORDER BY criado_em DESC LIMIT 100`, [email]);
      res.json(pr.rows.map((p) => ({
        id: p.id, criado_em: p.criado_em, status: p.status, status_label: STATUS_LABEL[p.status] || p.status,
        total_cents: p.total_cents, frete_servico: p.frete_servico || null,
        rastreio_codigo: p.rastreio_codigo || null, rastreio_url: trackingUrl(p.rastreio_codigo),
      })));
    } catch (err) { console.error("[loja/meus-pedidos]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });

  // ---- Favoritos (wishlist) ----
  app.get("/api/loja/favoritos", exigeLogin, async (req, res) => {
    try {
      const r = await query(
        `SELECT p.id, p.nome, p.slug, p.marca,
                (SELECT url FROM loja_imagem i WHERE i.produto_id = p.id ORDER BY i.capa DESC, i.ordem LIMIT 1) AS capa,
                (SELECT MIN(COALESCE(NULLIF(v.preco_promo_cents,0), v.preco_cents)) FROM loja_variacao v WHERE v.produto_id = p.id AND v.ativo = true) AS preco_a_partir,
                (SELECT MIN(v.preco_cents) FROM loja_variacao v WHERE v.produto_id = p.id AND v.ativo = true) AS preco_cheio,
                (SELECT COALESCE(SUM(v.estoque),0) FROM loja_variacao v WHERE v.produto_id = p.id AND v.ativo = true) AS estoque_total
         FROM loja_favorito f JOIN loja_produto p ON p.id = f.produto_id
         WHERE f.user_id = $1 AND p.ativo = true
         ORDER BY f.criado_em DESC`, [req.usuario.id]);
      res.json({ ids: r.rows.map((x) => x.id), produtos: r.rows });
    } catch (err) { console.error("[loja/favoritos:get]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });
  app.post("/api/loja/favoritos/:produtoId", exigeLogin, async (req, res) => {
    try {
      await query(`INSERT INTO loja_favorito (user_id, produto_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [req.usuario.id, req.params.produtoId]);
      res.json({ ok: true, favorito: true });
    } catch (err) { console.error("[loja/favoritos:post]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });
  app.delete("/api/loja/favoritos/:produtoId", exigeLogin, async (req, res) => {
    try {
      await query(`DELETE FROM loja_favorito WHERE user_id=$1 AND produto_id=$2`, [req.usuario.id, req.params.produtoId]);
      res.json({ ok: true, favorito: false });
    } catch (err) { console.error("[loja/favoritos:del]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });

  // ---- Endereços salvos (agenda de entrega) ----
  const camposEndereco = (b) => ({
    apelido: txt(b.apelido, 40) || null,
    cep: soDigitos(b.cep, 8), rua: txt(b.rua, 160), numero: txt(b.numero, 20),
    complemento: txt(b.complemento, 80) || null, bairro: txt(b.bairro, 120),
    cidade: txt(b.cidade, 120), uf: txt(b.uf, 2).toUpperCase(), principal: Boolean(b.principal),
  });
  function endValido(f) {
    return f.cep.length === 8 && f.rua && f.numero && f.bairro && f.cidade && f.uf.length === 2;
  }
  app.get("/api/loja/enderecos", exigeLogin, async (req, res) => {
    try {
      const r = await query(`SELECT * FROM loja_endereco WHERE user_id=$1 ORDER BY principal DESC, criado_em DESC`, [req.usuario.id]);
      res.json(r.rows);
    } catch (err) { console.error("[loja/enderecos:get]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });
  app.post("/api/loja/enderecos", exigeLogin, async (req, res) => {
    try {
      const f = camposEndereco(req.body || {});
      if (!endValido(f)) return res.status(400).json({ erro: "preencha CEP, rua, número, bairro, cidade e UF" });
      const out = await withTransaction(async (c) => {
        const jaTem = await c.query(`SELECT COUNT(*)::int AS n FROM loja_endereco WHERE user_id=$1`, [req.usuario.id]);
        const principal = f.principal || jaTem.rows[0].n === 0; // primeiro vira principal
        if (principal) await c.query(`UPDATE loja_endereco SET principal=false WHERE user_id=$1`, [req.usuario.id]);
        const r = await c.query(
          `INSERT INTO loja_endereco (user_id, apelido, cep, rua, numero, complemento, bairro, cidade, uf, principal)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
          [req.usuario.id, f.apelido, f.cep, f.rua, f.numero, f.complemento, f.bairro, f.cidade, f.uf, principal]);
        return r.rows[0];
      });
      res.json({ ok: true, id: out.id });
    } catch (err) { console.error("[loja/enderecos:post]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });
  app.put("/api/loja/enderecos/:id", exigeLogin, async (req, res) => {
    try {
      const f = camposEndereco(req.body || {});
      if (!endValido(f)) return res.status(400).json({ erro: "preencha CEP, rua, número, bairro, cidade e UF" });
      await withTransaction(async (c) => {
        if (f.principal) await c.query(`UPDATE loja_endereco SET principal=false WHERE user_id=$1`, [req.usuario.id]);
        const r = await c.query(
          `UPDATE loja_endereco SET apelido=$3, cep=$4, rua=$5, numero=$6, complemento=$7, bairro=$8, cidade=$9, uf=$10, principal=$11
           WHERE id=$1 AND user_id=$2 RETURNING id`,
          [req.params.id, req.usuario.id, f.apelido, f.cep, f.rua, f.numero, f.complemento, f.bairro, f.cidade, f.uf, f.principal]);
        if (!r.rows[0]) { const e = new Error("nao_encontrado"); e.code404 = true; throw e; }
      });
      res.json({ ok: true });
    } catch (err) {
      if (err.code404) return res.status(404).json({ erro: "endereço não encontrado" });
      console.error("[loja/enderecos:put]", err.message); res.status(500).json({ erro: "erro interno" });
    }
  });
  app.delete("/api/loja/enderecos/:id", exigeLogin, async (req, res) => {
    try {
      const r = await query(`DELETE FROM loja_endereco WHERE id=$1 AND user_id=$2 RETURNING id`, [req.params.id, req.usuario.id]);
      if (!r.rows[0]) return res.status(404).json({ erro: "endereço não encontrado" });
      res.json({ ok: true });
    } catch (err) { console.error("[loja/enderecos:del]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });

  // ==========================================================
  // FASE 4A — gestão de pedidos: status, remetente e etiqueta (Melhor Envio)
  // ==========================================================
  const STATUS_PEDIDO = ["pago", "separando", "enviado", "entregue", "cancelado"];

  async function meBaseToken() {
    const token = String(await getConfig("melhorenvio_token") || "").replace(/^Bearer\s+/i, "").trim();
    if (!token) { const e = new Error("frete_nao_configurado"); e.code = 400; throw e; }
    const sandbox = (await getConfig("melhorenvio_sandbox")) === "true";
    return { token, base: sandbox ? "https://sandbox.melhorenvio.com.br" : "https://melhorenvio.com.br" };
  }
  async function meCall(path, body) {
    const { token, base } = await meBaseToken();
    const r = await fetch(base + path, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json",
        "Authorization": "Bearer " + token, "User-Agent": "Aqualife OS (pixelproperformance@gmail.com)" },
      body: JSON.stringify(body || {}),
    });
    const raw = await r.text(); let j = null; try { j = JSON.parse(raw); } catch {}
    return { ok: r.ok, status: r.status, json: j, raw };
  }
  const msgDe = (c) => {
    const j = c.json;
    if (j && j.message) return j.message;
    if (j && j.errors) { try { return Object.values(j.errors).flat().join(" · "); } catch { return JSON.stringify(j.errors); } }
    if (j && j.error) return j.error;
    return (c.raw || "").slice(0, 200) || ("HTTP " + c.status);
  };

  // Dados do remetente (usados na etiqueta)
  app.get("/api/admin/loja/remetente", exigeLogin, exigeAdmin, async (req, res) => {
    try { const raw = await getConfig("loja_remetente"); res.json(raw ? JSON.parse(raw) : {}); }
    catch (err) { console.error("[admin/loja/remetente:get]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });
  app.put("/api/admin/loja/remetente", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const b = req.body || {};
      const rem = {
        nome: txt(b.nome, 120), documento: soDigitos(b.documento, 14), inscricao: txt(b.inscricao, 20) || "ISENTO",
        email: txt(b.email, 120), telefone: soDigitos(b.telefone, 15),
        cep: soDigitos(b.cep, 8), rua: txt(b.rua, 160), numero: txt(b.numero, 20), complemento: txt(b.complemento, 80),
        bairro: txt(b.bairro, 120), cidade: txt(b.cidade, 120), uf: txt(b.uf, 2).toUpperCase(),
      };
      await setConfig("loja_remetente", JSON.stringify(rem));
      res.json({ ok: true });
    } catch (err) { console.error("[admin/loja/remetente:put]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });

  // Mudar status do pedido
  app.put("/api/admin/loja/pedidos/:id/status", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const s = txt(req.body && req.body.status, 20);
      if (!STATUS_PEDIDO.includes(s)) return res.status(400).json({ erro: "status inválido" });
      const r = await query(`UPDATE loja_pedido SET status=$2, atualizado_em=NOW() WHERE id=$1 RETURNING *`, [req.params.id, s]);
      if (!r.rows[0]) return res.status(404).json({ erro: "pedido não encontrado" });
      if (s === "enviado" && enviarEmail) {
        try { await enviarEmail({ para: r.rows[0].cliente_email, assunto: "Seu pedido foi enviado — Aqualife", html: emailEnviado(r.rows[0]) }); }
        catch (e) { console.warn("[loja] e-mail de envio (status) falhou:", e.message); }
      }
      res.json({ ok: true });
    } catch (err) { console.error("[admin/loja/status]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });

  // Gerar etiqueta + rastreio (carrinho → checkout → gerar → imprimir → rastreio)
  app.post("/api/admin/loja/pedidos/:id/etiqueta", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const ped = (await query(`SELECT * FROM loja_pedido WHERE id=$1`, [req.params.id])).rows[0];
      if (!ped) return res.status(404).json({ erro: "pedido não encontrado" });
      if (ped.etiqueta_url) return res.json({ ok: true, etiqueta_url: ped.etiqueta_url, rastreio: ped.rastreio_codigo, jaExistia: true });
      if (!["pago", "separando"].includes(ped.status)) return res.status(400).json({ erro: "Gere a etiqueta só depois do pagamento confirmado." });
      if (!ped.frete_servico_id) return res.status(400).json({ erro: "Este pedido não tem serviço de frete definido." });

      const remRaw = await getConfig("loja_remetente");
      const R = remRaw ? JSON.parse(remRaw) : null;
      if (!R || !R.nome || !R.documento || !R.cep || !R.rua || !R.numero || !R.bairro || !R.cidade || !R.uf)
        return res.status(400).json({ erro: "Preencha os Dados do remetente no admin antes de gerar a etiqueta." });

      const its = (await query(
        `SELECT i.qty, i.produto_nome, i.variacao_nome, i.preco_cents,
                p.peso_gramas, p.altura_cm, p.largura_cm, p.comprimento_cm
         FROM loja_pedido_item i LEFT JOIN loja_produto p ON p.id = i.produto_id WHERE i.pedido_id=$1`, [req.params.id])).rows;

      let pesoKg = 0, alt = 0, lar = 0, comp = 0;
      for (const it of its) {
        pesoKg += ((it.peso_gramas || 0) / 1000) * it.qty;
        alt = Math.max(alt, Number(it.altura_cm) || 0);
        lar = Math.max(lar, Number(it.largura_cm) || 0);
        comp = Math.max(comp, Number(it.comprimento_cm) || 0);
      }
      const volume = {
        height: Math.max(2, Math.round(alt)), width: Math.max(11, Math.round(lar)),
        length: Math.max(16, Math.round(comp)), weight: Math.max(0.3, Math.round(pesoKg * 100) / 100),
      };
      const produtos = its.map((it) => ({
        name: (it.produto_nome + (it.variacao_nome ? " - " + it.variacao_nome : "")).slice(0, 120),
        quantity: it.qty, unitary_value: +((it.preco_cents || 0) / 100).toFixed(2),
      }));
      const remDoc = soDigitos(R.documento, 14);
      const from = {
        name: R.nome, email: R.email, phone: R.telefone, state_register: R.inscricao || "ISENTO",
        address: R.rua, number: R.numero, complement: R.complemento || "", district: R.bairro,
        city: R.cidade, state_abbr: R.uf, postal_code: R.cep, country_id: "BR",
      };
      if (remDoc.length > 11) from.company_document = remDoc; else from.document = remDoc;
      const to = {
        name: ped.cliente_nome, email: ped.cliente_email, phone: soDigitos(ped.cliente_telefone, 15),
        document: soDigitos(ped.cliente_cpf, 11), address: ped.rua, number: ped.numero,
        complement: ped.complemento || "", district: ped.bairro, city: ped.cidade,
        state_abbr: ped.uf, postal_code: soDigitos(ped.cep, 8), country_id: "BR",
      };
      // Se já houver NF-e autorizada, a etiqueta viaja com a chave da nota (em vez de declaração)
      const temChave = ped.nfe_chave && ped.nfe_status === "autorizado";
      const opcoesEnvio = { insurance_value: +((ped.subtotal_cents || 0) / 100).toFixed(2), receipt: false, own_hand: false };
      if (temChave) opcoesEnvio.invoice = { key: ped.nfe_chave }; else opcoesEnvio.non_commercial = true;
      const cartBody = {
        service: Number(ped.frete_servico_id), from, to, products: produtos, volumes: [volume],
        options: opcoesEnvio,
      };

      const c1 = await meCall("/api/v2/me/cart", cartBody);
      const meId = c1.json && c1.json.id;
      if (!c1.ok || !meId) return res.status(502).json({ erro: "Falha ao inserir no carrinho do Melhor Envio.", detalhe: msgDe(c1) });
      const c2 = await meCall("/api/v2/me/shipment/checkout", { orders: [meId] });
      if (!c2.ok) return res.status(502).json({ erro: "Falha ao pagar o frete no Melhor Envio — verifique o saldo da conta.", detalhe: msgDe(c2), me_order_id: meId });
      const c3 = await meCall("/api/v2/me/shipment/generate", { orders: [meId] });
      if (!c3.ok) return res.status(502).json({ erro: "Falha ao gerar a etiqueta.", detalhe: msgDe(c3), me_order_id: meId });
      const c4 = await meCall("/api/v2/me/shipment/print", { mode: "public", orders: [meId] });
      const etiquetaUrl = (c4.ok && c4.json && c4.json.url) ? c4.json.url : null;
      let rastreio = null;
      const c5 = await meCall("/api/v2/me/shipment/tracking", { orders: [meId] });
      if (c5.ok && c5.json) { const t = c5.json[meId] || Object.values(c5.json)[0] || {}; rastreio = t.tracking || t.melhorenvio_tracking || null; }

      await query(`UPDATE loja_pedido SET me_order_id=$2, etiqueta_url=$3, rastreio_codigo=$4, status='separando', atualizado_em=NOW() WHERE id=$1`,
        [req.params.id, meId, etiquetaUrl, rastreio]);
      if (rastreio && enviarEmail) {
        try { await enviarEmail({ para: ped.cliente_email, assunto: "Seu pedido foi enviado — Aqualife", html: emailEnviado({ ...ped, rastreio_codigo: rastreio }) }); }
        catch (e) { console.warn("[loja] e-mail de envio falhou:", e.message); }
      }
      res.json({ ok: true, etiqueta_url: etiquetaUrl, rastreio, me_order_id: meId });
    } catch (err) {
      if (err.code === 400) return res.status(400).json({ erro: "Frete não configurado (token do Melhor Envio)." });
      console.error("[admin/loja/etiqueta]", err.message);
      res.status(500).json({ erro: "Erro ao gerar etiqueta: " + (err.message || "interno") });
    }
  });

  // ==========================================================
  // COMUNICAÇÕES — Newsletter + avisos de manutenção (Resend/SMTP)
  // ==========================================================
  const escHtml = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const nl2br = (s) => escHtml(s).replace(/\r?\n/g, "<br>");
  const ROLES_STAFF = "('admin','gestor','tecnico','aquarista')";

  // ---- Descadastro (opt-out) da newsletter: link assinado por HMAC ----
  async function unsubSecret() {
    let s = await getConfig("unsub_secret");
    if (!s) { s = crypto.randomBytes(32).toString("hex"); try { await setConfig("unsub_secret", s); } catch {} }
    return s;
  }
  async function unsubToken(email) {
    const s = await unsubSecret();
    return crypto.createHmac("sha256", s).update(String(email).toLowerCase()).digest("hex").slice(0, 32);
  }
  async function unsubValido(email, t) {
    if (!email || !t) return false;
    const esperado = await unsubToken(email);
    try {
      const a = Buffer.from(String(t)); const b = Buffer.from(esperado);
      return a.length === b.length && crypto.timingSafeEqual(a, b);
    } catch { return false; }
  }
  async function linkDescadastro(email) {
    const e = encodeURIComponent(String(email).toLowerCase());
    const t = await unsubToken(email);
    return `${baseUrl}/descadastro.html?e=${e}&t=${t}`;
  }

  function wrapEmail(titulo, corpoHtml, rodape) {
    return `<div style="font-family:Arial,sans-serif;color:#12333F;line-height:1.6;max-width:600px;margin:0 auto">
      <h2 style="color:#125265">${escHtml(titulo)}</h2>
      <div style="font-size:15px">${corpoHtml}</div>
      <hr style="border:none;border-top:1px solid #e3e8ea;margin:22px 0">
      <p style="font-size:12px;color:#7a8a90">${rodape || "Aqualife Aquarismo"}</p>
    </div>`;
  }
  const emailNewsletter = (assunto, corpo, dest, unsubUrl) => {
    const ola = dest && dest.nome ? `<p>Olá, ${escHtml(String(dest.nome).split(" ")[0])}!</p>` : "";
    const rodape = `Você recebeu este e-mail porque é cliente ou contato da Aqualife Aquarismo.` +
      (unsubUrl ? ` Se não deseja mais receber, <a href="${unsubUrl}" style="color:#7a8a90">clique aqui para se descadastrar</a>.` : "");
    return wrapEmail(assunto, ola + `<div>${nl2br(corpo)}</div>`, rodape);
  };
  function conteudoManutencao(quando, u, dataTxt, extra) {
    const nome = (u.name || "").split(" ")[0];
    if (quando === "agendada") {
      const titulo = "Manutenção agendada";
      const msg = `Sua manutenção está agendada${dataTxt ? " para " + dataTxt : ""}.` + (extra ? " " + extra : "");
      const html = wrapEmail("Manutenção agendada 🗓️",
        `<p>Olá, ${escHtml(nome)}.</p><p>Sua manutenção está <b>agendada</b>${dataTxt ? " para <b>" + escHtml(dataTxt) + "</b>" : ""}.</p>${extra ? `<p>${nl2br(extra)}</p>` : ""}<p>Qualquer imprevisto, é só falar com a gente.</p>`,
        "Aqualife Aquarismo — cuidando do seu aquário.");
      return { titulo, msg, assunto: "Manutenção agendada — Aqualife", html };
    }
    const titulo = "Manutenção concluída";
    const msg = `Sua manutenção foi concluída.` + (extra ? " " + extra : "");
    const html = wrapEmail("Manutenção concluída ✅",
      `<p>Olá, ${escHtml(nome)}.</p><p>Sua manutenção foi <b>concluída</b>.</p>${extra ? `<p>${nl2br(extra)}</p>` : ""}<p>Obrigado por confiar na Aqualife!</p>`,
      "Aqualife Aquarismo — cuidando do seu aquário.");
    return { titulo, msg, assunto: "Manutenção concluída — Aqualife", html };
  }

  // Contagem por público (prévia na tela)
  app.get("/api/admin/comunicacoes/contagem", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const c = await query(`SELECT count(DISTINCT lower(email)) n FROM app_user WHERE ativo=true AND email IS NOT NULL AND coalesce(role,'cliente') NOT IN ${ROLES_STAFF}`);
      let leads = 0;
      try { const l = await query(`SELECT count(DISTINCT lower(email)) n FROM lead WHERE email IS NOT NULL`); leads = Number(l.rows[0].n || 0); } catch {}
      res.json({ clientes: Number(c.rows[0].n || 0), leads });
    } catch (err) { console.error("[comunic/contagem]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });

  // Histórico dos últimos envios
  app.get("/api/admin/comunicacoes/historico", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const r = await query(`SELECT tipo, assunto, publico, total, enviados, falhas, criado_em FROM comunicacao_envio ORDER BY criado_em DESC LIMIT 30`);
      res.json(r.rows);
    } catch (err) { console.error("[comunic/historico]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });

  // Newsletter — clientes + leads (dedup por e-mail)
  app.post("/api/admin/comunicacoes/newsletter", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const assunto = txt(req.body && req.body.assunto, 160);
      const corpo = String((req.body && req.body.corpo) || "").slice(0, 20000);
      const publico = ["clientes", "leads", "ambos"].includes(req.body && req.body.publico) ? req.body.publico : "ambos";
      if (!assunto || !corpo.trim()) return res.status(400).json({ erro: "preencha o assunto e a mensagem" });
      if (!enviarEmail) return res.status(400).json({ erro: "Envio de e-mail não configurado (Resend/SMTP)." });

      const mapa = new Map();
      if (publico === "clientes" || publico === "ambos") {
        const r = await query(`SELECT lower(email) email, name FROM app_user WHERE ativo=true AND email IS NOT NULL AND coalesce(role,'cliente') NOT IN ${ROLES_STAFF}`);
        for (const u of r.rows) if (u.email) mapa.set(u.email, { email: u.email, nome: u.name });
      }
      if (publico === "leads" || publico === "ambos") {
        try {
          const r = await query(`SELECT lower(email) email, nome FROM lead WHERE email IS NOT NULL`);
          for (const u of r.rows) if (u.email && !mapa.has(u.email)) mapa.set(u.email, { email: u.email, nome: u.nome });
        } catch {}
      }
      // Remove quem se descadastrou (opt-out)
      try {
        const outs = await query(`SELECT email FROM email_optout`);
        for (const o of outs.rows) mapa.delete(String(o.email).toLowerCase());
      } catch {}

      const lista = [...mapa.values()];
      if (!lista.length) return res.status(400).json({ erro: "Nenhum destinatário disponível (todos descadastrados ou lista vazia)." });

      let enviados = 0, falhas = 0;
      for (let i = 0; i < lista.length; i++) {
        const d = lista[i];
        try {
          const unsubUrl = await linkDescadastro(d.email);
          const r = await enviarEmail({ para: d.email, assunto, html: emailNewsletter(assunto, corpo, d, unsubUrl) });
          if (r && r.ok === false) {
            if (i === 0 && r.motivo === "email_nao_configurado")
              return res.status(400).json({ erro: "Envio de e-mail não configurado (Resend/SMTP)." });
            falhas++;
          } else enviados++;
        } catch { falhas++; }
      }
      await query(`INSERT INTO comunicacao_envio (tipo, assunto, publico, total, enviados, falhas) VALUES ('newsletter',$1,$2,$3,$4,$5)`,
        [assunto, publico, lista.length, enviados, falhas]).catch(() => {});
      res.json({ ok: true, total: lista.length, enviados, falhas });
    } catch (err) { console.error("[comunic/newsletter]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });

  // Lista de clientes (para escolher no aviso de manutenção)
  app.get("/api/admin/comunicacoes/clientes", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const q = txt(req.query && req.query.q, 60).toLowerCase();
      const r = await query(
        `SELECT id, name, email FROM app_user
         WHERE ativo=true AND email IS NOT NULL AND coalesce(role,'cliente') NOT IN ${ROLES_STAFF}
           AND ($1='' OR lower(name) LIKE '%'||$1||'%' OR lower(email) LIKE '%'||$1||'%')
         ORDER BY name LIMIT 50`, [q]);
      res.json(r.rows);
    } catch (err) { console.error("[comunic/clientes]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });

  // Aviso de manutenção (agendada / concluída) para 1 cliente: e-mail + aviso no painel
  app.post("/api/admin/comunicacoes/manutencao", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const clienteId = txt(req.body && req.body.cliente_id, 60);
      const quando = ["agendada", "concluida"].includes(req.body && req.body.quando) ? req.body.quando : null;
      const dataTxt = txt(req.body && req.body.data, 60);
      const extra = String((req.body && req.body.mensagem) || "").slice(0, 4000);
      if (!clienteId || !quando) return res.status(400).json({ erro: "escolha o cliente e o tipo de aviso" });

      const u = (await query(`SELECT id, name, email, organization_id FROM app_user WHERE id=$1`, [clienteId])).rows[0];
      if (!u || !u.email) return res.status(404).json({ erro: "cliente não encontrado ou sem e-mail" });

      const { titulo, msg, assunto, html } = conteudoManutencao(quando, u, dataTxt, extra);

      // Aviso dentro do painel do cliente
      let avisoOk = false;
      try {
        await query(`INSERT INTO notificacao (organization_id, user_id, titulo, mensagem, tipo) VALUES ($1,$2,$3,$4,'manutencao')`,
          [u.organization_id, u.id, titulo, msg]);
        avisoOk = true;
      } catch (e) { console.warn("[comunic/manutencao] aviso painel:", e.message); }

      // E-mail
      let emailOk = false, motivo = null;
      if (enviarEmail) {
        try { const r = await enviarEmail({ para: u.email, assunto, html }); emailOk = !(r && r.ok === false); motivo = r && r.motivo; }
        catch (e) { motivo = e.message; }
      } else motivo = "email_nao_configurado";

      await query(`INSERT INTO comunicacao_envio (tipo, assunto, publico, total, enviados, falhas) VALUES ($1,$2,'cliente',1,$3,$4)`,
        ["manutencao_" + quando, assunto, emailOk ? 1 : 0, emailOk ? 0 : 1]).catch(() => {});

      res.json({ ok: true, email_enviado: emailOk, aviso_no_painel: avisoOk, motivo: emailOk ? null : motivo });
    } catch (err) { console.error("[comunic/manutencao]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });

  // ==========================================================
  // FASE 5 — NF-e (Focus NFe) · Simples Nacional · NF-e modelo 55
  // ==========================================================
  async function nfeConfig() {
    let cfg = {}; try { const raw = await getConfig("nfe_config"); if (raw) cfg = JSON.parse(raw); } catch {}
    return {
      emit: cfg.emit || {},
      cfop_dentro: cfg.cfop_dentro || "5102",
      cfop_fora: cfg.cfop_fora || "6102",
      csosn: cfg.csosn || "102",
      pis_cst: cfg.pis_cst || "07",
      cofins_cst: cfg.cofins_cst || "07",
      natureza: cfg.natureza || "Venda de mercadoria",
    };
  }
  async function focusCreds() {
    const token = String(await getConfig("focusnfe_token") || "").trim();
    const sandbox = (await getConfig("focusnfe_sandbox")) !== "false"; // padrão: homologação
    const base = sandbox ? "https://homologacao.focusnfe.com.br" : "https://api.focusnfe.com.br";
    return { token, base, sandbox };
  }
  async function focusCall(method, path, body) {
    const { token, base } = await focusCreds();
    if (!token) { const e = new Error("nfe_nao_configurada"); e.code = 400; throw e; }
    const r = await fetch(base + path, {
      method,
      headers: { "Authorization": "Basic " + Buffer.from(token + ":").toString("base64"), "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const raw = await r.text(); let j = null; try { j = JSON.parse(raw); } catch {}
    return { ok: r.ok, status: r.status, json: j, raw, base };
  }
  const cents = (c) => +(Number(c || 0) / 100).toFixed(2);
  function emitCompleto(emit) {
    return emit && emit.cnpj && emit.razao && emit.ie && emit.logradouro && emit.numero && emit.bairro && emit.municipio && emit.uf && emit.cep;
  }
  async function itensFiscais(pedidoId) {
    const r = await query(
      `SELECT i.produto_id, i.produto_nome, i.variacao_nome, i.preco_cents, i.qty, i.subtotal_cents,
              p.ncm, p.cest, p.origem_fiscal, p.unidade
       FROM loja_pedido_item i LEFT JOIN loja_produto p ON p.id = i.produto_id WHERE i.pedido_id=$1`, [pedidoId]);
    return r.rows;
  }
  function montarNFe(ped, itens, cfg) {
    const emit = cfg.emit;
    const dentro = String(emit.uf || "").toUpperCase() === String(ped.uf || "").toUpperCase();
    const cfop = dentro ? cfg.cfop_dentro : cfg.cfop_fora;
    return {
      natureza_operacao: cfg.natureza,
      data_emissao: new Date().toISOString(),
      tipo_documento: 1, finalidade_emissao: 1,
      cnpj_emitente: soDigitos(emit.cnpj, 14), nome_emitente: emit.razao, nome_fantasia_emitente: emit.fantasia || emit.razao,
      logradouro_emitente: emit.logradouro, numero_emitente: emit.numero, bairro_emitente: emit.bairro,
      municipio_emitente: emit.municipio, uf_emitente: emit.uf, cep_emitente: soDigitos(emit.cep, 8),
      inscricao_estadual_emitente: emit.ie, regime_tributario_emitente: 1,
      nome_destinatario: ped.cliente_nome,
      cpf_destinatario: soDigitos(ped.cliente_cpf, 11),
      indicador_inscricao_estadual_destinatario: 9,
      email_destinatario: ped.cliente_email,
      logradouro_destinatario: ped.rua, numero_destinatario: ped.numero,
      complemento_destinatario: ped.complemento || undefined,
      bairro_destinatario: ped.bairro, municipio_destinatario: ped.cidade, uf_destinatario: ped.uf,
      cep_destinatario: soDigitos(ped.cep, 8), pais_destinatario: "Brasil",
      valor_frete: cents(ped.frete_cents), valor_produtos: cents(ped.subtotal_cents), valor_total: cents(ped.total_cents),
      modalidade_frete: 0, consumidor_final: 1, presenca_comprador: 2,
      items: itens.map((it, i) => ({
        numero_item: i + 1,
        codigo_produto: (it.produto_id ? String(it.produto_id).slice(0, 20) : String(i + 1)),
        descricao: (it.produto_nome + (it.variacao_nome ? " - " + it.variacao_nome : "")).slice(0, 120),
        cfop, unidade_comercial: it.unidade || "UN", quantidade_comercial: it.qty,
        valor_unitario_comercial: cents(it.preco_cents), valor_bruto: cents(it.subtotal_cents),
        unidade_tributavel: it.unidade || "UN", quantidade_tributavel: it.qty, valor_unitario_tributavel: cents(it.preco_cents),
        ncm: soDigitos(it.ncm, 8) || "00000000",
        icms_origem: Number(it.origem_fiscal || 0),
        icms_situacao_tributaria: cfg.csosn,
        pis_situacao_tributaria: cfg.pis_cst,
        cofins_situacao_tributaria: cfg.cofins_cst,
      })),
    };
  }
  function aplicarRespostaNFe(id, ref, j, base) {
    const status = (j && j.status) || "desconhecido";
    const danfe = (j && j.caminho_danfe) ? base + j.caminho_danfe : null;
    const xml = (j && j.caminho_xml_nota_fiscal) ? base + j.caminho_xml_nota_fiscal : null;
    const msg = (j && (j.mensagem_sefaz || (j.erros && JSON.stringify(j.erros)) || j.mensagem)) || null;
    return query(
      `UPDATE loja_pedido SET nfe_ref=$2, nfe_status=$3, nfe_numero=$4, nfe_chave=$5, nfe_danfe_url=$6, nfe_xml_url=$7, nfe_mensagem=$8, atualizado_em=NOW() WHERE id=$1`,
      [id, ref, status, (j && j.numero) || null, (j && j.chave_nfe) || null, danfe, xml, msg ? String(msg).slice(0, 500) : null]
    ).then(() => ({ status, numero: (j && j.numero) || null, chave: (j && j.chave_nfe) || null, danfe_url: danfe, xml_url: xml, mensagem: msg }));
  }
  async function emitirNFe(pedidoId) {
    const ped = (await query(`SELECT * FROM loja_pedido WHERE id=$1`, [pedidoId])).rows[0];
    if (!ped) throw Object.assign(new Error("pedido_nao_encontrado"), { code: 404 });
    if (ped.nfe_status === "autorizado") return { status: "autorizado", jaExistia: true, danfe_url: ped.nfe_danfe_url, chave: ped.nfe_chave };
    const cfg = await nfeConfig();
    if (!emitCompleto(cfg.emit)) throw Object.assign(new Error("emitente_incompleto"), { code: 400 });
    const itens = await itensFiscais(pedidoId);
    if (!itens.length) throw Object.assign(new Error("pedido_sem_itens"), { code: 400 });
    const ref = "NFE-" + ped.id;
    const c1 = await focusCall("POST", "/v2/nfe?ref=" + encodeURIComponent(ref), montarNFe(ped, itens, cfg));
    // Focus processa de forma assíncrona; consulta até sair de "processando"
    let last = c1.json, base = c1.base;
    for (let i = 0; i < 4; i++) {
      const st = (last && last.status) || "";
      if (st && st !== "processando_autorizacao") break;
      await new Promise((r) => setTimeout(r, 1500));
      const c = await focusCall("GET", "/v2/nfe/" + encodeURIComponent(ref), null);
      last = c.json; base = c.base;
    }
    return aplicarRespostaNFe(ped.id, ref, last || {}, base);
  }

  // Config NF-e (admin)
  app.get("/api/admin/integracoes/nfe", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const token = String(await getConfig("focusnfe_token") || "");
      const cfg = await nfeConfig();
      res.json({
        token_definido: Boolean(token), token_mascarado: mascarar(token),
        sandbox: (await getConfig("focusnfe_sandbox")) !== "false",
        auto: (await getConfig("nfe_auto")) === "true",
        emit: cfg.emit, cfop_dentro: cfg.cfop_dentro, cfop_fora: cfg.cfop_fora,
        csosn: cfg.csosn, pis_cst: cfg.pis_cst, cofins_cst: cfg.cofins_cst, natureza: cfg.natureza,
      });
    } catch (err) { console.error("[admin/nfe:get]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });
  app.put("/api/admin/integracoes/nfe", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const b = req.body || {};
      if (b.token !== undefined && b.token !== "") await setConfig("focusnfe_token", String(b.token).trim());
      if (b.sandbox !== undefined) await setConfig("focusnfe_sandbox", b.sandbox ? "true" : "false");
      if (b.auto !== undefined) await setConfig("nfe_auto", b.auto ? "true" : "false");
      const e = b.emit || {};
      const cfg = {
        emit: {
          cnpj: soDigitos(e.cnpj, 14), razao: txt(e.razao, 120), fantasia: txt(e.fantasia, 120),
          ie: txt(e.ie, 20), cep: soDigitos(e.cep, 8), logradouro: txt(e.logradouro, 160), numero: txt(e.numero, 20),
          bairro: txt(e.bairro, 120), municipio: txt(e.municipio, 120), uf: txt(e.uf, 2).toUpperCase(),
        },
        cfop_dentro: soDigitos(b.cfop_dentro, 4) || "5102",
        cfop_fora: soDigitos(b.cfop_fora, 4) || "6102",
        csosn: soDigitos(b.csosn, 4) || "102",
        pis_cst: soDigitos(b.pis_cst, 2) || "07",
        cofins_cst: soDigitos(b.cofins_cst, 2) || "07",
        natureza: txt(b.natureza, 60) || "Venda de mercadoria",
      };
      await setConfig("nfe_config", JSON.stringify(cfg));
      res.json({ ok: true });
    } catch (err) { console.error("[admin/nfe:put]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });
  // Emitir NF-e (manual) e consultar status
  app.post("/api/admin/loja/pedidos/:id/nfe", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const ped = (await query(`SELECT status FROM loja_pedido WHERE id=$1`, [req.params.id])).rows[0];
      if (!ped) return res.status(404).json({ erro: "pedido não encontrado" });
      if (!["pago", "separando", "enviado", "entregue"].includes(ped.status))
        return res.status(400).json({ erro: "Emita a NF-e só depois do pagamento confirmado." });
      const out = await emitirNFe(req.params.id);
      res.json({ ok: true, ...out });
    } catch (err) {
      if (err.code === 400) return res.status(400).json({ erro: err.message === "emitente_incompleto" ? "Preencha os dados fiscais do emitente (Integrações → Focus NFe)." : "NF-e não configurada (token da Focus)." });
      console.error("[admin/loja/nfe:post]", err.message);
      res.status(500).json({ erro: "Erro ao emitir NF-e: " + (err.message || "interno") });
    }
  });
  app.get("/api/admin/loja/pedidos/:id/nfe", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const ped = (await query(`SELECT nfe_ref FROM loja_pedido WHERE id=$1`, [req.params.id])).rows[0];
      if (!ped || !ped.nfe_ref) return res.status(404).json({ erro: "NF-e ainda não emitida para este pedido" });
      const c = await focusCall("GET", "/v2/nfe/" + encodeURIComponent(ped.nfe_ref), null);
      const out = await aplicarRespostaNFe(req.params.id, ped.nfe_ref, c.json || {}, c.base);
      res.json({ ok: true, ...out });
    } catch (err) {
      if (err.code === 400) return res.status(400).json({ erro: "NF-e não configurada." });
      console.error("[admin/loja/nfe:get]", err.message); res.status(500).json({ erro: "erro interno" });
    }
  });

  // ==========================================================
  // FASE 6 — MERCADO LIVRE · Fundação (OAuth 2.0 + conexão)
  // ==========================================================
  const ML_AUTH = "https://auth.mercadolivre.com.br";
  const ML_API = "https://api.mercadolibre.com";
  const mlRedirect = () => baseUrl + "/api/ml/callback";
  async function mlCreds() {
    return { app_id: String(await getConfig("ml_app_id") || "").trim(), secret: String(await getConfig("ml_secret") || "").trim() };
  }
  async function mlTrocarToken(params) {
    const body = new URLSearchParams(params).toString();
    const r = await fetch(ML_API + "/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json" },
      body,
    });
    const raw = await r.text(); let j = null; try { j = JSON.parse(raw); } catch {}
    return { ok: r.ok, status: r.status, json: j, raw };
  }
  async function mlSalvarTokens(j) {
    if (!j || !j.access_token) return false;
    await setConfig("ml_access_token", j.access_token);
    if (j.refresh_token) await setConfig("ml_refresh_token", j.refresh_token);
    if (j.user_id != null) await setConfig("ml_user_id", String(j.user_id));
    await setConfig("ml_expira", String(Date.now() + (Number(j.expires_in || 21600) * 1000)));
    return true;
  }
  // Retorna um access_token válido, renovando pelo refresh_token quando necessário
  async function mlAccessToken() {
    const at = String(await getConfig("ml_access_token") || "");
    const exp = Number(await getConfig("ml_expira") || 0);
    if (at && Date.now() < exp - 60000) return at;
    const rt = String(await getConfig("ml_refresh_token") || "");
    if (!rt) return at || null;
    const { app_id, secret } = await mlCreds();
    if (!app_id || !secret) return at || null;
    const r = await mlTrocarToken({ grant_type: "refresh_token", client_id: app_id, client_secret: secret, refresh_token: rt });
    if (r.ok && await mlSalvarTokens(r.json)) return r.json.access_token;
    return at || null;
  }
  async function mlCall(method, path, body) {
    const token = await mlAccessToken();
    if (!token) { const e = new Error("ml_nao_conectado"); e.code = 401; throw e; }
    const r = await fetch(ML_API + path, {
      method, headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json", "Accept": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const raw = await r.text(); let j = null; try { j = JSON.parse(raw); } catch {}
    return { ok: r.ok, status: r.status, json: j, raw };
  }

  app.get("/api/admin/integracoes/ml", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const { app_id, secret } = await mlCreds();
      const userId = await getConfig("ml_user_id");
      const at = await getConfig("ml_access_token");
      res.json({
        app_id: app_id || "", secret_definido: Boolean(secret), secret_mascarado: mascarar(secret),
        redirect_uri: mlRedirect(),
        conectado: Boolean(at && userId), user_id: userId || null,
        expira_em: Number(await getConfig("ml_expira") || 0) || null,
      });
    } catch (err) { console.error("[admin/ml:get]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });
  app.put("/api/admin/integracoes/ml", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const b = req.body || {};
      if (b.app_id !== undefined) await setConfig("ml_app_id", String(b.app_id).trim());
      if (b.secret !== undefined && b.secret !== "") await setConfig("ml_secret", String(b.secret).trim());
      res.json({ ok: true, redirect_uri: mlRedirect() });
    } catch (err) { console.error("[admin/ml:put]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });
  // Gera a URL de autorização do Mercado Livre (admin clica e faz login como vendedor)
  app.get("/api/admin/integracoes/ml/conectar", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const { app_id, secret } = await mlCreds();
      if (!app_id || !secret) return res.status(400).json({ erro: "Preencha o App ID e o Secret primeiro." });
      const state = crypto.randomBytes(16).toString("hex");
      await setConfig("ml_state", state);
      const url = ML_AUTH + "/authorization?response_type=code&client_id=" + encodeURIComponent(app_id) +
        "&redirect_uri=" + encodeURIComponent(mlRedirect()) + "&state=" + state;
      res.json({ url });
    } catch (err) { console.error("[admin/ml:conectar]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });
  // Callback público do OAuth (o navegador do vendedor é redirecionado para cá pelo ML)
  app.get("/api/ml/callback", async (req, res) => {
    try {
      const code = String(req.query.code || ""), state = String(req.query.state || "");
      const esperado = String(await getConfig("ml_state") || "");
      if (!code || !state || !esperado || state !== esperado) return res.redirect("/admin.html?ml=erro");
      const { app_id, secret } = await mlCreds();
      const r = await mlTrocarToken({ grant_type: "authorization_code", client_id: app_id, client_secret: secret, code, redirect_uri: mlRedirect() });
      const okv = r.ok && await mlSalvarTokens(r.json);
      await setConfig("ml_state", "");
      res.redirect(okv ? "/admin.html?ml=ok" : "/admin.html?ml=erro");
    } catch (err) { console.error("[ml/callback]", err.message); res.redirect("/admin.html?ml=erro"); }
  });
  app.post("/api/admin/integracoes/ml/teste", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const c = await mlCall("GET", "/users/me", null);
      if (!c.ok) return res.status(400).json({ erro: "Não conectado ou token inválido. Reconecte.", detalhe: (c.json && c.json.message) || null });
      res.json({ ok: true, nickname: c.json.nickname, id: c.json.id, site: c.json.site_id });
    } catch (err) {
      if (err.code === 401) return res.status(400).json({ erro: "Conta do Mercado Livre não conectada." });
      console.error("[admin/ml:teste]", err.message); res.status(500).json({ erro: "erro interno" });
    }
  });
  app.post("/api/admin/integracoes/ml/desconectar", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      for (const k of ["ml_access_token", "ml_refresh_token", "ml_user_id", "ml_expira", "ml_state"]) await setConfig(k, "");
      res.json({ ok: true });
    } catch (err) { console.error("[admin/ml:desconectar]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });

  // ---- Mercado Livre: publicação de anúncios ----
  const absUrl = (u) => /^https?:\/\//i.test(u || "") ? u : (baseUrl + u);
  // URL de foto para o ML: força JPG (o ML não aceita WebP). No Cloudinary usa a transformação f_jpg.
  const mlPicUrl = (u) => {
    const abs = absUrl(u);
    if (/res\.cloudinary\.com\/.+\/image\/upload\//.test(abs)) return abs.replace(/\/image\/upload\//, "/image/upload/f_jpg,q_82/");
    return abs;
  };
  // Preditor de categoria (ML sugere pela descrição/título)
  async function preverCategoriaML(titulo) {
    const c = await mlCall("GET", "/sites/MLB/domain_discovery/search?limit=1&q=" + encodeURIComponent(titulo || ""), null);
    if (c.ok && Array.isArray(c.json) && c.json[0]) return { category_id: c.json[0].category_id, category_name: c.json[0].category_name };
    return null;
  }
  app.get("/api/admin/loja/ml/prever-categoria", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const q = txt(req.query.q, 120);
      if (!q) return res.status(400).json({ erro: "informe o título/termo" });
      const cat = await preverCategoriaML(q);
      if (!cat) return res.status(404).json({ erro: "não foi possível prever a categoria" });
      res.json(cat);
    } catch (err) {
      if (err.code === 401) return res.status(400).json({ erro: "Conta do Mercado Livre não conectada." });
      console.error("[admin/ml/prever]", err.message); res.status(500).json({ erro: "erro interno" });
    }
  });
  // Status do anúncio de um produto
  app.get("/api/admin/loja/produtos/:id/ml", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const r = await query(`SELECT ml_item_id, permalink, status, ultimo_erro, atualizado_em FROM loja_ml_anuncio WHERE produto_id=$1`, [req.params.id]);
      res.json(r.rows[0] || null);
    } catch (err) { console.error("[admin/ml/status]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });
  async function dadosParaAnuncio(produtoId) {
    const prod = (await query(`SELECT * FROM loja_produto WHERE id=$1`, [produtoId])).rows[0];
    if (!prod) throw Object.assign(new Error("produto_nao_encontrado"), { code: 404 });
    const vs = (await query(`SELECT * FROM loja_variacao WHERE produto_id=$1 AND ativo=true ORDER BY ordem, nome`, [produtoId])).rows;
    const imgs = (await query(`SELECT url FROM loja_imagem WHERE produto_id=$1 ORDER BY capa DESC, ordem`, [produtoId])).rows;
    const precos = vs.map((v) => v.preco_cents).filter((x) => x > 0);
    const preco = precos.length ? Math.min(...precos) : 0;
    const qty = vs.reduce((s, v) => s + (Number(v.estoque) || 0), 0);
    const ean = (vs.find((v) => v.ean) || {}).ean || null;
    return { prod, vs, imgs, preco, qty, ean };
  }
  app.post("/api/admin/loja/produtos/:id/ml/publicar", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const { prod, imgs, preco, qty, ean } = await dadosParaAnuncio(req.params.id);
      if (!imgs.length) return res.status(400).json({ erro: "Adicione ao menos uma foto ao produto antes de publicar." });
      if (preco <= 0) return res.status(400).json({ erro: "Defina o preço do produto." });
      if (qty <= 0) return res.status(400).json({ erro: "Produto sem estoque — não é possível anunciar." });
      let categoria = prod.ml_categoria_id;
      if (!categoria) { const p = await preverCategoriaML(prod.nome); categoria = p && p.category_id; }
      if (!categoria) return res.status(400).json({ erro: "Defina a categoria do Mercado Livre (ou use o preditor)." });

      // GTIN válido = 8, 12, 13 ou 14 dígitos com dígito verificador correto
      const gtinValido = (v) => {
        const s = String(v || "").replace(/\D/g, "");
        if (![8, 12, 13, 14].includes(s.length)) return false;
        const d = s.split("").map(Number);
        const chk = d.pop();
        let soma = 0;
        d.reverse().forEach((n, i) => { soma += n * (i % 2 === 0 ? 3 : 1); });
        return ((10 - (soma % 10)) % 10) === chk;
      };
      const eanOk = gtinValido(ean) ? String(ean).replace(/\D/g, "") : null;
      const attrs = [];
      const temAttr = (id) => attrs.some((a) => a.id === id);
      attrs.push({ id: "BRAND", value_name: prod.marca || "Genérica" });
      if (prod.modelo) attrs.push({ id: "MODEL", value_name: prod.modelo });
      if (eanOk) attrs.push({ id: "GTIN", value_name: eanOk });
      // Consulta atributos obrigatórios da categoria e preenche os que dá, avisa os que faltam
      let faltando = [];
      try {
        const ca = await mlCall("GET", "/categories/" + encodeURIComponent(categoria) + "/attributes", null);
        if (ca.ok && Array.isArray(ca.json)) {
          for (const a of ca.json) {
            const req = a && a.tags && (a.tags.required || a.tags.catalog_required);
            if (!req || temAttr(a.id)) continue;
            if (a.id === "EMPTY_GTIN_REASON" && !eanOk) {
              attrs.push({ id: "EMPTY_GTIN_REASON", value_name: "Produto sem código de barras" });
            } else if (!eanOk && a.id === "GTIN") {
              // resolvido pelo EMPTY_GTIN_REASON acima
            } else {
              faltando.push(a.name || a.id);
            }
          }
        }
      } catch (e) { /* segue sem bloquear; ML devolverá o erro se faltar algo */ }
      if (faltando.length) {
        const msg = "Atributos obrigatórios da categoria: " + faltando.join(", ");
        await query(`INSERT INTO loja_ml_anuncio (produto_id, status, ultimo_erro) VALUES ($1,'erro',$2)
                     ON CONFLICT (produto_id) DO UPDATE SET status='erro', ultimo_erro=$2, atualizado_em=NOW()`, [req.params.id, msg.slice(0, 500)]);
        return res.status(400).json({ erro: "Faltam dados obrigatórios para esta categoria.", detalhe: faltando.join(", ") });
      }
      const nome = txt(prod.nome, 60);
      const baseItem = {
        category_id: categoria, price: +(preco / 100).toFixed(2),
        currency_id: "BRL", available_quantity: qty, buying_mode: "buy_it_now",
        condition: prod.condicao === "usado" ? "used" : "new", listing_type_id: "gold_special",
        pictures: imgs.slice(0, 10).map((i) => ({ source: mlPicUrl(i.url) })),
        attributes: attrs,
        shipping: { mode: "me2", local_pick_up: false, free_shipping: false },
      };
      const causeTxt = (arr) => Array.isArray(arr) ? arr.map((x) => (x && (x.message || x.description || x.code)) || JSON.stringify(x)).filter(Boolean).join("; ") : (arr ? JSON.stringify(arr) : "");
      const detalheDe = (j) => j ? [j.message, causeTxt(j.cause), causeTxt(j.errors)].filter(Boolean).join(" — ") : "";
      // Tenta formato padrão (title). Se o ML exigir family_name, republica no formato de catálogo (family_name sem title).
      let c = await mlCall("POST", "/items", { title: nome, ...baseItem });
      if ((!c.ok || !c.json || !c.json.id) && /family_name/i.test(detalheDe(c.json))) {
        c = await mlCall("POST", "/items", { family_name: nome, ...baseItem });
      }
      if (!c.ok || !c.json || !c.json.id) {
        const detalhe = detalheDe(c.json);
        const msg = detalhe || ("HTTP " + c.status);
        await query(`INSERT INTO loja_ml_anuncio (produto_id, status, ultimo_erro) VALUES ($1,'erro',$2)
                     ON CONFLICT (produto_id) DO UPDATE SET status='erro', ultimo_erro=$2, atualizado_em=NOW()`, [req.params.id, String(msg).slice(0, 500)]);
        return res.status(502).json({ erro: "O Mercado Livre recusou o anúncio.", detalhe: msg });
      }
      const it = c.json;
      // descrição (endpoint separado)
      if (prod.descricao) { try { await mlCall("POST", "/items/" + it.id + "/description", { plain_text: prod.descricao }); } catch {} }
      // Se veio sem foto (ML não conseguiu baixar), avisa; se veio pausado com foto, tenta ativar.
      const semFoto = !Array.isArray(it.pictures) || it.pictures.length === 0;
      let status = it.status || "active";
      if (!semFoto && status !== "active") {
        try { const a = await mlCall("PUT", "/items/" + it.id, { status: "active" }); if (a.ok && a.json && a.json.status) status = a.json.status; } catch {}
      }
      await query(`INSERT INTO loja_ml_anuncio (produto_id, ml_item_id, permalink, status, ultimo_erro) VALUES ($1,$2,$3,$4,$5)
                   ON CONFLICT (produto_id) DO UPDATE SET ml_item_id=$2, permalink=$3, status=$4, ultimo_erro=$5, atualizado_em=NOW()`,
        [req.params.id, it.id, it.permalink || null, status, semFoto ? "Anúncio criado sem foto: o ML não conseguiu baixar a imagem (reenvie a foto em JPG/PNG)." : null]);
      res.json({ ok: true, ml_item_id: it.id, permalink: it.permalink, status, sem_foto: semFoto });
    } catch (err) {
      if (err.code === 401) return res.status(400).json({ erro: "Conta do Mercado Livre não conectada." });
      if (err.code === 404) return res.status(404).json({ erro: "produto não encontrado" });
      console.error("[admin/ml/publicar]", err.message); res.status(500).json({ erro: "Erro ao publicar: " + (err.message || "interno") });
    }
  });
  // Sincronizar preço + estoque do anúncio já publicado
  app.post("/api/admin/loja/produtos/:id/ml/sincronizar", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const map = (await query(`SELECT ml_item_id FROM loja_ml_anuncio WHERE produto_id=$1`, [req.params.id])).rows[0];
      if (!map || !map.ml_item_id) return res.status(404).json({ erro: "Este produto ainda não tem anúncio no ML." });
      const { preco, qty } = await dadosParaAnuncio(req.params.id);
      const c = await mlCall("PUT", "/items/" + map.ml_item_id, { price: +(preco / 100).toFixed(2), available_quantity: qty });
      if (!c.ok) return res.status(502).json({ erro: "Falha ao sincronizar.", detalhe: (c.json && c.json.message) || null });
      await query(`UPDATE loja_ml_anuncio SET status=$2, atualizado_em=NOW() WHERE produto_id=$1`, [req.params.id, (c.json && c.json.status) || "active"]);
      res.json({ ok: true, price: +(preco / 100).toFixed(2), available_quantity: qty });
    } catch (err) {
      if (err.code === 401) return res.status(400).json({ erro: "Conta do Mercado Livre não conectada." });
      console.error("[admin/ml/sincronizar]", err.message); res.status(500).json({ erro: "erro interno" });
    }
  });
  // Encerrar anúncio
  app.post("/api/admin/loja/produtos/:id/ml/encerrar", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const map = (await query(`SELECT ml_item_id FROM loja_ml_anuncio WHERE produto_id=$1`, [req.params.id])).rows[0];
      if (!map || !map.ml_item_id) return res.status(404).json({ erro: "Sem anúncio para encerrar." });
      const c = await mlCall("PUT", "/items/" + map.ml_item_id, { status: "closed" });
      if (!c.ok) return res.status(502).json({ erro: "Falha ao encerrar.", detalhe: (c.json && c.json.message) || null });
      await query(`UPDATE loja_ml_anuncio SET status='closed', atualizado_em=NOW() WHERE produto_id=$1`, [req.params.id]);
      res.json({ ok: true });
    } catch (err) {
      if (err.code === 401) return res.status(400).json({ erro: "Conta do Mercado Livre não conectada." });
      console.error("[admin/ml/encerrar]", err.message); res.status(500).json({ erro: "erro interno" });
    }
  });

  // ---- Mercado Livre: importação de pedidos (webhook + puxada manual) ----
  // Importa 1 pedido do ML pelo id; cria loja_pedido (origem=mercadolivre) e baixa estoque. Idempotente por ml_order_id.
  async function importarPedidoML(orderId) {
    const ja = await query(`SELECT id FROM loja_pedido WHERE ml_order_id=$1`, [String(orderId)]);
    if (ja.rows[0]) return { jaExistia: true, id: ja.rows[0].id };
    const c = await mlCall("GET", "/orders/" + orderId, null);
    if (!c.ok || !c.json) throw Object.assign(new Error("order_nao_encontrado"), { code: 404 });
    const o = c.json;
    const pago = (o.status === "paid") || (Array.isArray(o.payments) && o.payments.some((p) => p.status === "approved"));
    const buyer = o.buyer || {};
    const nome = [buyer.first_name, buyer.last_name].filter(Boolean).join(" ") || buyer.nickname || "Comprador ML";
    const itens = Array.isArray(o.order_items) ? o.order_items : [];
    const subtotalCents = Math.round(Number(o.total_amount || itens.reduce((s, it) => s + (it.unit_price || 0) * (it.quantity || 0), 0)) * 100);
    const ped = await withTransaction(async (cx) => {
      const pr = await cx.query(
        `INSERT INTO loja_pedido (cliente_nome, cliente_email, subtotal_cents, frete_cents, total_cents,
           status, status_pagamento, origem, ml_order_id, frete_servico)
         VALUES ($1,$2,$3,0,$4,$5,$6,'mercadolivre',$7,'Mercado Envios') RETURNING *`,
        [nome, buyer.email || null, subtotalCents, subtotalCents, pago ? "pago" : "pendente", pago ? "approved" : "pending", String(o.id)]);
      const pedido = pr.rows[0];
      for (const it of itens) {
        const mlItemId = it.item && it.item.id;
        const nomeItem = (it.item && it.item.title) || "Item ML";
        const qtd = Number(it.quantity || 1);
        const precoCents = Math.round(Number(it.unit_price || 0) * 100);
        // tenta mapear o anúncio → produto → 1ª variação em estoque, para baixar estoque
        let variacaoId = null, produtoId = null;
        if (mlItemId) {
          const mp = await cx.query(`SELECT produto_id FROM loja_ml_anuncio WHERE ml_item_id=$1`, [mlItemId]);
          if (mp.rows[0]) {
            produtoId = mp.rows[0].produto_id;
            const v = await cx.query(`SELECT id FROM loja_variacao WHERE produto_id=$1 AND ativo=true ORDER BY estoque DESC NULLS LAST LIMIT 1`, [produtoId]);
            if (v.rows[0]) variacaoId = v.rows[0].id;
          }
        }
        await cx.query(
          `INSERT INTO loja_pedido_item (pedido_id, variacao_id, produto_id, produto_nome, variacao_nome, preco_cents, qty, subtotal_cents)
           VALUES ($1,$2,$3,$4,NULL,$5,$6,$7)`,
          [pedido.id, variacaoId, produtoId, nomeItem, precoCents, qtd, precoCents * qtd]);
        if (pago && variacaoId) {
          try { await movimentarEstoque((t,p)=>cx.query(t,p), { variacao_id: variacaoId, tipo: "venda", qty: -Math.abs(qtd), motivo: "Venda Mercado Livre", ref_tipo: "ml_order", ref_id: String(o.id), permitirNegativo: true }); }
          catch (e) { console.warn("[ml] baixa estoque:", e.message); }
        }
      }
      return pedido;
    });
    return { ok: true, id: ped.id, pago };
  }
  // Webhook público do Mercado Livre (cadastrado no app). Responde rápido e processa em segundo plano.
  app.post("/api/ml/webhook", async (req, res) => {
    res.sendStatus(200);
    try {
      const n = req.body || {};
      const topic = n.topic || n.type || "";
      const resource = n.resource || "";
      if (/order/.test(topic) || /\/orders\//.test(resource)) {
        const id = String(resource).split("/").filter(Boolean).pop();
        if (id) importarPedidoML(id).catch((e) => console.warn("[ml/webhook] import:", e.message));
      }
    } catch (e) { console.warn("[ml/webhook]", e.message); }
  });
  // Puxada manual dos pedidos pagos recentes
  app.post("/api/admin/loja/ml/importar-pedidos", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const userId = String(await getConfig("ml_user_id") || "");
      if (!userId) return res.status(400).json({ erro: "Conta do Mercado Livre não conectada." });
      const c = await mlCall("GET", "/orders/search?seller=" + userId + "&order.status=paid&sort=date_desc", null);
      if (!c.ok || !c.json) return res.status(502).json({ erro: "Falha ao consultar pedidos.", detalhe: (c.json && c.json.message) || null });
      const results = Array.isArray(c.json.results) ? c.json.results : [];
      let novos = 0, existentes = 0;
      for (const o of results.slice(0, 50)) {
        try { const r = await importarPedidoML(o.id); if (r.jaExistia) existentes++; else novos++; } catch (e) { console.warn("[ml/import]", e.message); }
      }
      res.json({ ok: true, novos, existentes, total: results.length });
    } catch (err) {
      if (err.code === 401) return res.status(400).json({ erro: "Conta do Mercado Livre não conectada." });
      console.error("[admin/ml/importar]", err.message); res.status(500).json({ erro: "erro interno" });
    }
  });

  // Descadastro (público, via link assinado) — a página faz POST (evita opt-out por prefetch)
  app.get("/api/loja/descadastro/status", async (req, res) => {
    try {
      const email = txt(req.query && req.query.e, 120).toLowerCase();
      const t = txt(req.query && req.query.t, 64);
      if (!(await unsubValido(email, t))) return res.status(400).json({ erro: "link inválido" });
      const r = await query(`SELECT 1 FROM email_optout WHERE email=$1`, [email]);
      res.json({ email, optout: !!r.rows[0] });
    } catch (err) { console.error("[loja/descadastro:status]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });
  app.post("/api/loja/descadastro", async (req, res) => {
    try {
      const email = txt(req.body && req.body.e, 120).toLowerCase();
      const t = txt(req.body && req.body.t, 64);
      if (!(await unsubValido(email, t))) return res.status(400).json({ erro: "link inválido ou expirado" });
      await query(`INSERT INTO email_optout (email) VALUES ($1) ON CONFLICT (email) DO NOTHING`, [email]);
      res.json({ ok: true, email, optout: true });
    } catch (err) { console.error("[loja/descadastro:post]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });
  app.post("/api/loja/reinscrever", async (req, res) => {
    try {
      const email = txt(req.body && req.body.e, 120).toLowerCase();
      const t = txt(req.body && req.body.t, 64);
      if (!(await unsubValido(email, t))) return res.status(400).json({ erro: "link inválido" });
      await query(`DELETE FROM email_optout WHERE email=$1`, [email]);
      res.json({ ok: true, email, optout: false });
    } catch (err) { console.error("[loja/reinscrever]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });

  return { processarPagamentoMP };
}

// Schema da loja — CREATE (instalação nova) + ALTER idempotente (banco existente)
export const LOJA_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS loja_categoria (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(), nome TEXT NOT NULL, slug TEXT, ordem INT DEFAULT 0,
     ativo BOOLEAN DEFAULT true, criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_loja_cat_slug ON loja_categoria (slug)`,
  `CREATE TABLE IF NOT EXISTS loja_produto (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(), nome TEXT NOT NULL, slug TEXT, descricao TEXT,
     categoria_id UUID REFERENCES loja_categoria(id) ON DELETE SET NULL,
     marca TEXT, modelo TEXT, condicao TEXT DEFAULT 'novo', garantia_meses INT DEFAULT 0,
     ncm TEXT, cest TEXT, origem_fiscal TEXT DEFAULT '0', unidade TEXT DEFAULT 'UN', ml_categoria_id TEXT,
     peso_gramas INT DEFAULT 0, altura_cm NUMERIC(6,1) DEFAULT 0, largura_cm NUMERIC(6,1) DEFAULT 0, comprimento_cm NUMERIC(6,1) DEFAULT 0,
     ativo BOOLEAN DEFAULT true, destaque BOOLEAN DEFAULT false,
     criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(), atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  `ALTER TABLE loja_produto ADD COLUMN IF NOT EXISTS modelo TEXT`,
  `ALTER TABLE loja_produto ADD COLUMN IF NOT EXISTS condicao TEXT DEFAULT 'novo'`,
  `ALTER TABLE loja_produto ADD COLUMN IF NOT EXISTS garantia_meses INT DEFAULT 0`,
  `ALTER TABLE loja_produto ADD COLUMN IF NOT EXISTS ncm TEXT`,
  `ALTER TABLE loja_produto ADD COLUMN IF NOT EXISTS cest TEXT`,
  `ALTER TABLE loja_produto ADD COLUMN IF NOT EXISTS origem_fiscal TEXT DEFAULT '0'`,
  `ALTER TABLE loja_produto ADD COLUMN IF NOT EXISTS unidade TEXT DEFAULT 'UN'`,
  `ALTER TABLE loja_produto ADD COLUMN IF NOT EXISTS ml_categoria_id TEXT`,
  `ALTER TABLE loja_produto ADD COLUMN IF NOT EXISTS litragem_min INT`,
  `ALTER TABLE loja_produto ADD COLUMN IF NOT EXISTS litragem_max INT`,
  `ALTER TABLE loja_produto ADD COLUMN IF NOT EXISTS vazao_lh INT`,
  `ALTER TABLE loja_produto ADD COLUMN IF NOT EXISTS sistema TEXT`,
  `ALTER TABLE loja_produto ADD COLUMN IF NOT EXISTS dica_tecnica TEXT`,
  `CREATE INDEX IF NOT EXISTS idx_loja_prod_cat ON loja_produto (categoria_id)`,
  `CREATE INDEX IF NOT EXISTS idx_loja_prod_slug ON loja_produto (slug)`,
  `CREATE TABLE IF NOT EXISTS loja_variacao (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(), produto_id UUID NOT NULL REFERENCES loja_produto(id) ON DELETE CASCADE,
     nome TEXT, sku TEXT, ean TEXT, preco_cents INT NOT NULL DEFAULT 0, preco_promo_cents INT, estoque INT NOT NULL DEFAULT 0,
     ordem INT DEFAULT 0, ativo BOOLEAN DEFAULT true)`,
  `ALTER TABLE loja_variacao ADD COLUMN IF NOT EXISTS ean TEXT`,
  `ALTER TABLE loja_variacao ADD COLUMN IF NOT EXISTS custo_cents INT DEFAULT 0`,
  `ALTER TABLE loja_variacao ADD COLUMN IF NOT EXISTS estoque_minimo INT DEFAULT 0`,
  `CREATE INDEX IF NOT EXISTS idx_loja_var_prod ON loja_variacao (produto_id)`,
  // ERP — livro-razão de estoque (toda alteração de saldo é um lançamento auditável)
  `CREATE TABLE IF NOT EXISTS estoque_mov (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     variacao_id UUID NOT NULL REFERENCES loja_variacao(id) ON DELETE CASCADE,
     tipo TEXT NOT NULL,
     qty INT NOT NULL,
     custo_unit_cents INT,
     saldo_after INT NOT NULL,
     motivo TEXT, ref_tipo TEXT, ref_id TEXT, usuario_id UUID,
     criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  `CREATE INDEX IF NOT EXISTS idx_estoque_mov_var ON estoque_mov (variacao_id, criado_em DESC)`,
  // Migração idempotente: cria o "saldo inicial" de quem já tem estoque e ainda não tem lançamento
  `INSERT INTO estoque_mov (variacao_id, tipo, qty, saldo_after, motivo)
     SELECT v.id, 'inicial', v.estoque, v.estoque, 'Saldo inicial (migração)'
     FROM loja_variacao v
     WHERE v.estoque <> 0 AND NOT EXISTS (SELECT 1 FROM estoque_mov m WHERE m.variacao_id = v.id)`,
  `CREATE TABLE IF NOT EXISTS loja_imagem (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(), produto_id UUID NOT NULL REFERENCES loja_produto(id) ON DELETE CASCADE,
     url TEXT NOT NULL, public_id TEXT, ordem INT DEFAULT 0, capa BOOLEAN DEFAULT false, criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  `ALTER TABLE loja_imagem ADD COLUMN IF NOT EXISTS public_id TEXT`,
  `CREATE INDEX IF NOT EXISTS idx_loja_img_prod ON loja_imagem (produto_id)`,
  `CREATE TABLE IF NOT EXISTS loja_pedido (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     cliente_nome TEXT, cliente_email TEXT, cliente_cpf TEXT, cliente_telefone TEXT,
     cep TEXT, rua TEXT, numero TEXT, complemento TEXT, bairro TEXT, cidade TEXT, uf TEXT,
     subtotal_cents INT NOT NULL DEFAULT 0, frete_servico TEXT, frete_cents INT NOT NULL DEFAULT 0,
     total_cents INT NOT NULL DEFAULT 0,
     status TEXT NOT NULL DEFAULT 'pendente', status_pagamento TEXT,
     mp_preference_id TEXT, mp_payment_id TEXT,
     criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(), atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  `ALTER TABLE loja_pedido ADD COLUMN IF NOT EXISTS frete_servico_id TEXT`,
  `ALTER TABLE loja_pedido ADD COLUMN IF NOT EXISTS me_order_id TEXT`,
  `ALTER TABLE loja_pedido ADD COLUMN IF NOT EXISTS etiqueta_url TEXT`,
  `ALTER TABLE loja_pedido ADD COLUMN IF NOT EXISTS rastreio_codigo TEXT`,
  // NF-e (Focus NFe)
  `ALTER TABLE loja_pedido ADD COLUMN IF NOT EXISTS origem TEXT DEFAULT 'loja'`,
  `ALTER TABLE loja_pedido ADD COLUMN IF NOT EXISTS ml_order_id TEXT`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_loja_pedido_mlorder ON loja_pedido (ml_order_id) WHERE ml_order_id IS NOT NULL`,
  `ALTER TABLE loja_pedido ADD COLUMN IF NOT EXISTS nfe_ref TEXT`,
  `ALTER TABLE loja_pedido ADD COLUMN IF NOT EXISTS nfe_status TEXT`,
  `ALTER TABLE loja_pedido ADD COLUMN IF NOT EXISTS nfe_numero TEXT`,
  `ALTER TABLE loja_pedido ADD COLUMN IF NOT EXISTS nfe_chave TEXT`,
  `ALTER TABLE loja_pedido ADD COLUMN IF NOT EXISTS nfe_danfe_url TEXT`,
  `ALTER TABLE loja_pedido ADD COLUMN IF NOT EXISTS nfe_xml_url TEXT`,
  `ALTER TABLE loja_pedido ADD COLUMN IF NOT EXISTS nfe_mensagem TEXT`,
  `CREATE INDEX IF NOT EXISTS idx_loja_pedido_status ON loja_pedido (status)`,
  `CREATE INDEX IF NOT EXISTS idx_loja_pedido_criado ON loja_pedido (criado_em DESC)`,
  `CREATE TABLE IF NOT EXISTS loja_pedido_item (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     pedido_id UUID NOT NULL REFERENCES loja_pedido(id) ON DELETE CASCADE,
     variacao_id UUID, produto_id UUID, produto_nome TEXT, variacao_nome TEXT,
     preco_cents INT NOT NULL DEFAULT 0, qty INT NOT NULL DEFAULT 1, subtotal_cents INT NOT NULL DEFAULT 0)`,
  `CREATE INDEX IF NOT EXISTS idx_loja_pedidoitem_ped ON loja_pedido_item (pedido_id)`,
  // Comunicações (newsletter / avisos) — histórico de envios
  `CREATE TABLE IF NOT EXISTS comunicacao_envio (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     tipo TEXT, assunto TEXT, publico TEXT,
     total INT DEFAULT 0, enviados INT DEFAULT 0, falhas INT DEFAULT 0,
     criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  `CREATE INDEX IF NOT EXISTS idx_comunicacao_criado ON comunicacao_envio (criado_em DESC)`,
  // Banners rotativos da Home
  `CREATE TABLE IF NOT EXISTS loja_banner (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     titulo TEXT, subtitulo TEXT, imagem_url TEXT, link TEXT, cta_label TEXT,
     ordem INT DEFAULT 0, ativo BOOLEAN DEFAULT true,
     criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  `CREATE INDEX IF NOT EXISTS idx_loja_banner_ordem ON loja_banner (ativo, ordem)`,
  // Mercado Livre — mapeamento produto ↔ anúncio
  `CREATE TABLE IF NOT EXISTS loja_ml_anuncio (
     produto_id UUID PRIMARY KEY REFERENCES loja_produto(id) ON DELETE CASCADE,
     ml_item_id TEXT, permalink TEXT, status TEXT, ultimo_erro TEXT,
     criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(), atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  // Favoritos (wishlist) por usuário
  `CREATE TABLE IF NOT EXISTS loja_favorito (
     user_id UUID NOT NULL,
     produto_id UUID NOT NULL REFERENCES loja_produto(id) ON DELETE CASCADE,
     criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     PRIMARY KEY (user_id, produto_id))`,
  `CREATE INDEX IF NOT EXISTS idx_loja_favorito_user ON loja_favorito (user_id)`,
  // Endereços salvos por usuário (agenda de entrega)
  `CREATE TABLE IF NOT EXISTS loja_endereco (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID NOT NULL,
     apelido TEXT, cep TEXT, rua TEXT, numero TEXT, complemento TEXT, bairro TEXT, cidade TEXT, uf TEXT,
     principal BOOLEAN DEFAULT false,
     criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  `CREATE INDEX IF NOT EXISTS idx_loja_endereco_user ON loja_endereco (user_id, principal DESC)`,
  // Descadastro (opt-out) da newsletter — por e-mail
  `CREATE TABLE IF NOT EXISTS email_optout (
     email TEXT PRIMARY KEY,
     criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
];