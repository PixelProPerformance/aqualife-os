/**
 * AQUALIFE OS — SERVIDOR RAILWAY
 * ================================================================
 * Versão Railway: sem Supabase, sem RLS. Segurança feita via
 * middleware + queries com filtro por organization_id.
 * A REGRA DE OURO se mantém: o motor DECIDE, a IA só escreve.
 * ================================================================
 */

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { testarConexao, query } from "./db.js";
import { hashSenha, verificarSenha, gerarToken, exigeLogin, exigeAdmin } from "./auth.js";
import { diagnosticar, RULESET_VERSION } from "./motor/engine.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const IA_KEY = process.env.ANTHROPIC_API_KEY?.trim();
import multer from "multer";
import { mkdirSync } from "fs";

// Pasta de uploads (criada automaticamente)
const UPLOADS_DIR = "./public/uploads";
mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = file.originalname.split(".").pop();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 10 }, // 10MB, 10 fotos
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Apenas imagens são permitidas"));
  },
});



app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "../public")));

// ============================================================
// SAÚDE
// ============================================================
app.get("/api/saude", (_, res) =>
  res.json({ ok: true, ruleset: RULESET_VERSION, ia: Boolean(IA_KEY), db: "railway-pg" })
);

// ============================================================
// LOGIN
// ============================================================
app.post("/api/login", async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) return res.status(400).json({ erro: "e-mail e senha obrigatórios" });

  try {
    const r = await query(
      `SELECT u.id, u.name, u.email, u.role, u.organization_id, u.senha_hash,
              o.name as org_nome
       FROM app_user u
       JOIN organization o ON o.id = u.organization_id
       WHERE u.email = $1 AND u.ativo = true`,
      [email.toLowerCase().trim()]
    );
    const u = r.rows[0];
    if (!u) return res.status(401).json({ erro: "e-mail ou senha incorretos" });

    const ok = await verificarSenha(senha, u.senha_hash);
    if (!ok) return res.status(401).json({ erro: "e-mail ou senha incorretos" });

    const token = gerarToken({ id: u.id, role: u.role, org: u.organization_id });
    res.json({
      token,
      usuario: {
        id: u.id, name: u.name, email: u.email, role: u.role,
        organization_id: u.organization_id,
        organization: { name: u.org_nome },
      },
    });
  } catch (err) {
    console.error("[login]", err.message);
    res.status(500).json({ erro: "erro interno" });
  }
});

app.get("/api/eu", exigeLogin, async (req, res) => {
  const r = await query(
    `SELECT u.id, u.name, u.email, u.role, u.organization_id, o.name as org_nome
     FROM app_user u JOIN organization o ON o.id=u.organization_id WHERE u.id=$1`,
    [req.usuario.id]
  );
  const u = r.rows[0];
  res.json({ ...u, organization: { name: u.org_nome } });
});

// ============================================================
// TÉCNICO — lista aquários que pode atender
// ============================================================
app.get("/api/tecnico/aquarios", exigeLogin, async (req, res) => {
  if (!["tecnico", "admin", "gestor", "aquarista"].includes(req.usuario.role))
    return res.status(403).json({ erro: "acesso restrito" });

  try {
    // Admin/gestor vê tudo; técnico vê pelos clientes da sua organização
    const r = await query(
      `SELECT a.id, a.label, a.water_type, a.volume_liters,
              o.name as org_nome, l.city
       FROM asset a
       JOIN organization o ON o.id = a.organization_id
       LEFT JOIN location l ON l.id = a.location_id
       ORDER BY o.name, a.label`,
      []
    );
    res.json(r.rows.map(row => ({
      id: row.id, label: row.label, water_type: row.water_type,
      volume_liters: row.volume_liters,
      organization: { name: row.org_nome },
      city: row.city,
    })));
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ============================================================
// TÉCNICO — registrar visita (★ MOTOR RECALCULA NO SERVIDOR)
// ============================================================
app.post("/api/visita", exigeLogin, async (req, res) => {
  if (!["tecnico", "admin", "gestor", "aquarista"].includes(req.usuario.role))
    return res.status(403).json({ erro: "acesso restrito" });

  const { asset_id, valores, observacao, client_id, service_order_id } = req.body;
  if (!asset_id || !valores)
    return res.status(400).json({ erro: "asset_id e valores são obrigatórios" });

  try {
    const aRes = await query(
      "SELECT id, water_type, organization_id, label FROM asset WHERE id=$1",
      [asset_id]
    );
    const asset = aRes.rows[0];
    if (!asset) return res.status(404).json({ erro: "aquário não encontrado" });

    // ★ o servidor decide — ignora qualquer nota que viesse do app
    let diag;
    try {
      diag = diagnosticar(valores, asset.water_type);
    } catch (e) {
      return res.status(400).json({ erro: "medição inválida: " + e.message });
    }

    // client_id é UUID do cliente para evitar duplicata offline
    const r = await query(
      `INSERT INTO reading
         (asset_id, organization_id, service_order_id, technician_id,
          source, values, health_score, urgency, confidence, diagnostico,
          ruleset_version, client_id, observacao)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (client_id) DO NOTHING
       RETURNING *`,
      [
        asset_id, asset.organization_id, service_order_id || null,
        req.usuario.id,
        req.usuario.role === "aquarista" ? "aquarista" : "tecnico",
        JSON.stringify(valores),
        diag.nota, diag.urgencia, diag.confianca,
        JSON.stringify({ alertas: diag.alertas, acoes: diag.acoes, parametros: diag.parametros }),
        diag.ruleset_version,
        // client_id pode vir como "visita-UUID" do frontend — guardar só o UUID
        client_id ? client_id.replace(/^visita-/, '') : null,
        observacao || null,
      ]
    );

    if (!r.rows[0])
      return res.json({ ok: true, duplicado: true, mensagem: "visita já registrada" });

    res.json({ ok: true, laudo: r.rows[0], diagnostico: diag });
  } catch (err) {
    console.error("[visita]", err.message);
    res.status(500).json({ erro: err.message });
  }
});

// ============================================================
// CLIENTE — painel
// ============================================================
app.get("/api/cliente/painel", exigeLogin, async (req, res) => {
  try {
    // Encontra a org do cliente via app_user
    const orgId = req.usuario.organization_id;

    const assetsRes = await query(
      "SELECT id, label, water_type, volume_liters FROM asset WHERE organization_id=$1 ORDER BY label",
      [orgId]
    );

    const assets = assetsRes.rows;
    for (const a of assets) {
      const lRes = await query(
        `SELECT id, values, health_score, urgency, confidence, diagnostico, created_at, ruleset_version
         FROM reading WHERE asset_id=$1 ORDER BY created_at DESC LIMIT 8`,
        [a.id]
      );
      a.serie  = (lRes.rows || []).map(l => ({ d: l.created_at, nota: l.health_score, urg: l.urgency }));
      a.ultimo = lRes.rows[0] || null;
    }

    res.json({ ambientes: assets });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ============================================================
// CLIENTE — laudo (texto simples, IA opcional)
// ============================================================
app.get("/api/laudo/:id/cliente", exigeLogin, async (req, res) => {
  try {
    const r = await query(
      `SELECT rd.*, a.label as asset_label, a.water_type
       FROM reading rd JOIN asset a ON a.id = rd.asset_id
       WHERE rd.id=$1`,
      [req.params.id]
    );
    const l = r.rows[0];
    if (!l) return res.status(404).json({ erro: "laudo não encontrado" });

    // isolamento: cliente só vê o próprio
    if (req.usuario.role === "cliente") {
      const check = await query(
        "SELECT 1 FROM asset WHERE id=$1 AND organization_id=$2",
        [l.asset_id, req.usuario.organization_id]
      );
      if (!check.rows[0]) return res.status(403).json({ erro: "acesso negado" });
    }

    const diag  = l.diagnostico || {};
    const acoes = diag.acoes || [];

    if (!IA_KEY) {
      const texto = acoes.map(a => (a.hobby && a.hobby !== "—" ? a.hobby : a.tecnico))
                         .filter(Boolean).join(" ");
      return res.json({
        nota: l.health_score, urgencia: l.urgency,
        texto: texto || "Está tudo dentro do esperado. Seguimos a rotina.",
        fonte: "planilha",
      });
    }

    // Com IA — ela só redige, não decide
    try {
      const contexto = {
        nota: l.health_score, urgencia: l.urgency,
        aquario: l.asset_label,
        problemas: (diag.alertas || []).map(a => a.explicacao),
        acoes_tecnicas: acoes.map(a => a.tecnico).filter(Boolean),
      };
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": IA_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 400,
          system:
            "Você escreve o laudo do aquário para o CLIENTE leigo. Não decida nada: " +
            "use SOMENTE a nota, os problemas e as ações que já foram calculados. " +
            "Explique em português simples, acolhedor, sem jargão. 2 a 4 frases. " +
            "Não invente números nem parâmetros que não estão no contexto.",
          messages: [{ role: "user", content: "Contexto:\n" + JSON.stringify(contexto, null, 2) }],
        }),
      });
      const j    = await resp.json();
      const texto = j?.content?.map(c => c.text).filter(Boolean).join(" ").trim();
      res.json({ nota: l.health_score, urgencia: l.urgency, texto, fonte: "ia" });
    } catch {
      const texto = acoes.map(a => a.hobby || a.tecnico).filter(Boolean).join(" ");
      res.json({ nota: l.health_score, urgencia: l.urgency, texto, fonte: "planilha-fallback" });
    }
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ============================================================
// ESCLARECIMENTO
// ============================================================
app.post("/api/esclarecimento", exigeLogin, async (req, res) => {
  const { reading_id, pergunta } = req.body;
  if (!pergunta?.trim()) return res.status(400).json({ erro: "escreva sua dúvida" });

  try {
    const r = await query(
      `INSERT INTO esclarecimento (reading_id, organization_id, autor_id, pergunta)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [reading_id || null, req.usuario.organization_id, req.usuario.id, pergunta.trim()]
    );
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ============================================================
// ADMIN — pessoas
// ============================================================
app.get("/api/admin/pessoas", exigeLogin, exigeAdmin, async (req, res) => {
  const r = await query(
    `SELECT u.id, u.name, u.email, u.role, u.organization_id, u.ativo,
            o.name as org_nome
     FROM app_user u JOIN organization o ON o.id=u.organization_id
     ORDER BY u.name`,
    []
  );
  res.json(r.rows.map(u => ({ ...u, organization: { name: u.org_nome } })));
});

app.post("/api/admin/pessoas", exigeLogin, exigeAdmin, async (req, res) => {
  const { nome, email, senha, papel, organization_id } = req.body;
  if (!nome || !email || !senha) return res.status(400).json({ erro: "nome, e-mail e senha são obrigatórios" });
  if (senha.length < 8) return res.status(400).json({ erro: "senha precisa de ao menos 8 caracteres" });
  if (!["admin","gestor","tecnico","cliente","aquarista"].includes(papel))
    return res.status(400).json({ erro: "papel inválido" });

  const hash = await hashSenha(senha);
  const orgId = organization_id || req.usuario.organization_id;

  try {
    const r = await query(
      `INSERT INTO app_user (name, email, senha_hash, role, organization_id)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, name, email, role, organization_id`,
      [nome, email.toLowerCase().trim(), hash, papel, orgId]
    );
    res.json(r.rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ erro: "e-mail já cadastrado" });
    res.status(500).json({ erro: err.message });
  }
});

app.delete("/api/admin/pessoas/:id", exigeLogin, exigeAdmin, async (req, res) => {
  if (req.params.id === req.usuario.id)
    return res.status(400).json({ erro: "você não pode excluir a si mesmo" });
  await query("UPDATE app_user SET ativo=false WHERE id=$1", [req.params.id]);
  res.json({ ok: true });
});

// ============================================================
// ADMIN — clientes (organizações)
// ============================================================
app.get("/api/admin/clientes", exigeLogin, exigeAdmin, async (req, res) => {
  const r = await query(
    "SELECT id, name, type, country FROM organization WHERE type != 'provider' ORDER BY name",
    []
  );
  const orgs = r.rows;
  for (const o of orgs) {
    const a = await query(
      "SELECT id, label, water_type, volume_liters FROM asset WHERE organization_id=$1",
      [o.id]
    );
    o.aquarios = a.rows;
  }
  res.json(orgs);
});

app.post("/api/admin/clientes", exigeLogin, exigeAdmin, async (req, res) => {
  const { nome, tipo, pais, cidade, aquario } = req.body;
  if (!nome) return res.status(400).json({ erro: "nome do cliente é obrigatório" });

  try {
    const orgR = await query(
      "INSERT INTO organization (name, type, country) VALUES ($1,$2,$3) RETURNING *",
      [nome, tipo || "residential", pais || "BR"]
    );
    const org = orgR.rows[0];

    const locR = await query(
      "INSERT INTO location (organization_id, label, city) VALUES ($1,$2,$3) RETURNING id",
      [org.id, nome, cidade || null]
    );
    const locId = locR.rows[0].id;

    if (aquario?.water_type && aquario?.volume_liters) {
      await query(
        "INSERT INTO asset (organization_id, location_id, label, water_type, volume_liters) VALUES ($1,$2,$3,$4,$5)",
        [org.id, locId, aquario.label || "Aquário", aquario.water_type, aquario.volume_liters]
      );
    }
    res.json(org);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.post("/api/admin/aquario", exigeLogin, exigeAdmin, async (req, res) => {
  const { organization_id, label, water_type, volume_liters } = req.body;
  if (!organization_id || !water_type)
    return res.status(400).json({ erro: "cliente e tipo de água são obrigatórios" });

  try {
    const r = await query(
      "INSERT INTO asset (organization_id, label, water_type, volume_liters) VALUES ($1,$2,$3,$4) RETURNING *",
      [organization_id, label || "Aquário", water_type, volume_liters || null]
    );
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.get("/api/admin/laudos", exigeLogin, exigeAdmin, async (req, res) => {
  const r = await query(
    `SELECT rd.id, rd.health_score, rd.urgency, rd.created_at, rd.ruleset_version,
            a.label as asset_label, a.water_type, o.name as org_nome
     FROM reading rd
     JOIN asset a ON a.id = rd.asset_id
     JOIN organization o ON o.id = rd.organization_id
     ORDER BY rd.created_at DESC LIMIT 100`,
    []
  );
  res.json(r.rows.map(rd => ({
    id: rd.id, health_score: rd.health_score, urgency: rd.urgency,
    created_at: rd.created_at, ruleset_version: rd.ruleset_version,
    asset: { label: rd.asset_label, water_type: rd.water_type, organization: { name: rd.org_nome } },
  })));
});

app.get("/api/admin/esclarecimentos", exigeLogin, exigeAdmin, async (req, res) => {
  const r = await query(
    `SELECT e.*, u.name as autor_nome, u.email as autor_email
     FROM esclarecimento e JOIN app_user u ON u.id=e.autor_id
     ORDER BY e.created_at DESC`,
    []
  );
  res.json(r.rows);
});

app.patch("/api/admin/esclarecimentos/:id", exigeLogin, exigeAdmin, async (req, res) => {
  const { resposta } = req.body;
  await query(
    "UPDATE esclarecimento SET resposta=$1, respondido=true, respondido_em=NOW() WHERE id=$2",
    [resposta, req.params.id]
  );
  res.json({ ok: true });
});


// ============================================================
// UPLOAD DE FOTOS POR VISITA
// ============================================================
app.post("/api/visita/:id/fotos", exigeLogin, upload.array("fotos", 10), async (req, res) => {
  if (!["tecnico","admin","gestor","aquarista"].includes(req.usuario.role))
    return res.status(403).json({ erro: "acesso restrito" });

  const arquivos = (req.files || []).map(f => `/uploads/${f.filename}`);
  if (!arquivos.length) return res.status(400).json({ erro: "nenhuma imagem enviada" });

  try {
    // Guardar URLs das fotos no JSON do reading
    await query(
      `UPDATE reading SET diagnostico = jsonb_set(
        COALESCE(diagnostico, '{}'),
        '{fotos}',
        $1::jsonb
      ) WHERE id = $2`,
      [JSON.stringify(arquivos), req.params.id]
    );
    res.json({ ok: true, fotos: arquivos });
  } catch (err) {
    console.error("[fotos]", err.message);
    res.status(500).json({ erro: err.message });
  }
});

// ============================================================
// FALLBACK SPA
// ============================================================
app.get("*", (req, res) => {
  if (req.path.startsWith("/api")) return res.status(404).json({ erro: "rota não encontrada" });
  res.sendFile(path.join(__dirname, "../public/entrar.html"));
});

// ============================================================
// START
// ============================================================
const PORT = process.env.PORT || 3000;

async function start() {
  const ok = await testarConexao();
  if (!ok) {
    console.error("[FATAL] sem conexão com o banco. Verifique DATABASE_URL.");
    process.exit(1);
  }
  app.listen(PORT, "0.0.0.0", () =>
    console.log(`🌊 Aqualife OS — Railway — porta ${PORT} — IA: ${Boolean(IA_KEY)}`)
  );
}

start();
