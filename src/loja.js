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

const UPLOADS_DIR = "./public/uploads";
try { mkdirSync(UPLOADS_DIR, { recursive: true }); } catch {}

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
  const { app, query, withTransaction, exigeLogin, exigeAdmin, getConfig, setConfig } = deps;
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
  function salvarNoDisco(buffer, originalname) {
    const ext = (originalname || "img.jpg").split(".").pop().replace(/[^a-z0-9]/gi, "").slice(0, 5) || "jpg";
    const nome = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
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
        let url, publicId = null;
        if (cfg) {
          const up = await enviarCloudinary(fa.buffer, cfg); url = up.url; publicId = up.publicId;
        } else {
          url = salvarNoDisco(fa.buffer, fa.originalname);
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
];