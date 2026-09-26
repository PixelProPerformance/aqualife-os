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
      .webp({ quality: 80 }).toBuffer();
    return { buffer: out, ext: "webp" };
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
  });

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
        `SELECT p.id, p.nome, p.slug, p.marca, p.destaque, c.nome AS categoria, c.slug AS categoria_slug,
                (SELECT url FROM loja_imagem i WHERE i.produto_id = p.id ORDER BY i.capa DESC, i.ordem LIMIT 1) AS capa,
                (SELECT MIN(COALESCE(NULLIF(v.preco_promo_cents,0), v.preco_cents)) FROM loja_variacao v WHERE v.produto_id = p.id AND v.ativo = true) AS preco_a_partir,
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
    const base = sandbox ? "https://sandbox.melhorenvio.com.br" : "https://www.melhorenvio.com.br";
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
             ncm, cest, origem_fiscal, unidade, ml_categoria_id, peso_gramas, altura_cm, largura_cm, comprimento_cm, ativo, destaque)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING *`,
          [f.nome, slugify(f.nome), f.descricao, f.categoria_id, f.marca, f.modelo, f.condicao, f.garantia_meses,
           f.ncm, f.cest, f.origem_fiscal, f.unidade, f.ml_categoria_id, f.peso_gramas, f.altura_cm, f.largura_cm, f.comprimento_cm, f.ativo, f.destaque]);
        const prod = pr.rows[0]; let ordem = 0;
        for (const vIn of variacoesIn) {
          const v = normVariacao(vIn, ordem++);
          await c.query(`INSERT INTO loja_variacao (produto_id, nome, sku, ean, preco_cents, preco_promo_cents, estoque, ordem, ativo) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
            [prod.id, v.nome, v.sku, v.ean, v.preco_cents, v.preco_promo_cents, v.estoque, v.ordem, v.ativo]);
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
             peso_gramas=$15, altura_cm=$16, largura_cm=$17, comprimento_cm=$18, ativo=$19, destaque=$20, atualizado_em=NOW()
           WHERE id=$1 RETURNING id`,
          [req.params.id, f.nome, slugify(f.nome), f.descricao, f.categoria_id, f.marca, f.modelo, f.condicao,
           f.garantia_meses, f.ncm, f.cest, f.origem_fiscal, f.unidade, f.ml_categoria_id, f.peso_gramas, f.altura_cm, f.largura_cm, f.comprimento_cm, f.ativo, f.destaque]);
        if (!upd.rows[0]) { const e = new Error("nao_encontrado"); e.code404 = true; throw e; }
        const variacoesIn = Array.isArray(b.variacoes) ? b.variacoes : [];
        const manter = []; let ordem = 0;
        for (const vIn of variacoesIn) {
          const v = normVariacao(vIn, ordem++);
          if (v.id) {
            const r = await c.query(`UPDATE loja_variacao SET nome=$2, sku=$3, ean=$4, preco_cents=$5, preco_promo_cents=$6, estoque=$7, ordem=$8, ativo=$9 WHERE id=$1 AND produto_id=$10 RETURNING id`,
              [v.id, v.nome, v.sku, v.ean, v.preco_cents, v.preco_promo_cents, v.estoque, v.ordem, v.ativo, req.params.id]);
            if (r.rows[0]) manter.push(r.rows[0].id);
          } else {
            const r = await c.query(`INSERT INTO loja_variacao (produto_id, nome, sku, ean, preco_cents, preco_promo_cents, estoque, ordem, ativo) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
              [req.params.id, v.nome, v.sku, v.ean, v.preco_cents, v.preco_promo_cents, v.estoque, v.ordem, v.ativo]);
            manter.push(r.rows[0].id);
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
      if (token !== undefined && token !== "") await setConfig("melhorenvio_token", txt(token, 400));
      if (cep_origem !== undefined) await setConfig("melhorenvio_cep_origem", soDigitos(cep_origem, 8));
      if (sandbox !== undefined) await setConfig("melhorenvio_sandbox", sandbox ? "true" : "false");
      res.json({ ok: true });
    } catch (err) { console.error("[admin/melhorenvio:put]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });
  // Teste de conexão do frete — calcula um envio de exemplo e devolve o erro real do Melhor Envio
  app.post("/api/admin/integracoes/melhorenvio/teste", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const itens = [{ preco_cents: 5000, peso_gramas: 500, altura_cm: 5, largura_cm: 15, comprimento_cm: 20, qty: 1 }];
      const opcoes = await calcularFreteME("01310100", itens);
      res.json({ ok: true, n: opcoes.length, exemplo: opcoes.slice(0, 3) });
    } catch (err) {
      if (err.code === 400) return res.status(400).json({ erro: "Configure o token e o CEP de origem primeiro." });
      res.json({ ok: false, status: err.message, detalhe: err.detalhe || null });
    }
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
      <p>Em breve você recebe o código de rastreio. Obrigado por comprar com a gente!</p>
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
             subtotal_cents, frete_servico, frete_cents, total_cents, status, status_pagamento)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'pendente','pending') RETURNING *`,
          [f.nome, f.email, f.cpf, f.telefone, f.cep, f.rua, f.numero, f.complemento, f.bairro, f.cidade, f.uf,
           carrinho.subtotal_cents, freteServico, freteCents, total]);
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
              if (it.variacao_id) await cx.query(`UPDATE loja_variacao SET estoque = GREATEST(0, estoque - $2) WHERE id=$1`, [it.variacao_id, it.qty]);
          }
        });
        if (!jaPago && enviarEmail) {
          try { await enviarEmail({ para: ped.cliente_email, assunto: "Pedido confirmado — Aqualife", html: emailPedido(ped) }); }
          catch (e) { console.warn("[loja] e-mail de pedido falhou:", e.message); }
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
        `SELECT id, cliente_nome, cliente_email, total_cents, frete_servico, status, status_pagamento, criado_em
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
  `CREATE INDEX IF NOT EXISTS idx_loja_prod_cat ON loja_produto (categoria_id)`,
  `CREATE INDEX IF NOT EXISTS idx_loja_prod_slug ON loja_produto (slug)`,
  `CREATE TABLE IF NOT EXISTS loja_variacao (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(), produto_id UUID NOT NULL REFERENCES loja_produto(id) ON DELETE CASCADE,
     nome TEXT, sku TEXT, ean TEXT, preco_cents INT NOT NULL DEFAULT 0, preco_promo_cents INT, estoque INT NOT NULL DEFAULT 0,
     ordem INT DEFAULT 0, ativo BOOLEAN DEFAULT true)`,
  `ALTER TABLE loja_variacao ADD COLUMN IF NOT EXISTS ean TEXT`,
  `CREATE INDEX IF NOT EXISTS idx_loja_var_prod ON loja_variacao (produto_id)`,
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
  `CREATE INDEX IF NOT EXISTS idx_loja_pedido_status ON loja_pedido (status)`,
  `CREATE INDEX IF NOT EXISTS idx_loja_pedido_criado ON loja_pedido (criado_em DESC)`,
  `CREATE TABLE IF NOT EXISTS loja_pedido_item (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     pedido_id UUID NOT NULL REFERENCES loja_pedido(id) ON DELETE CASCADE,
     variacao_id UUID, produto_id UUID, produto_nome TEXT, variacao_nome TEXT,
     preco_cents INT NOT NULL DEFAULT 0, qty INT NOT NULL DEFAULT 1, subtotal_cents INT NOT NULL DEFAULT 0)`,
  `CREATE INDEX IF NOT EXISTS idx_loja_pedidoitem_ped ON loja_pedido_item (pedido_id)`,
];