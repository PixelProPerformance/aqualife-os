// ============================================================
// Aqualife OS — Módulo de SERVIÇOS (oportunidades de manutenção)
// Comunicação e aceite de serviço entre técnico e Aqualife.
//
// Registre em server.js:
//   import { registrarServicos, SERVICOS_SCHEMA } from "./servicos.js";
//   const servicos = registrarServicos({ app, query, withTransaction, exigeLogin, exigeAdmin, enviarEmail, baseUrl, upload });
//   // em garantirSchema: ...SERVICOS_SCHEMA
//   // agendador diário: servicos.enviarLembretes()
// ============================================================

export function registrarServicos(deps) {
  const { app, query, withTransaction, exigeLogin, exigeAdmin, enviarEmail, baseUrl, upload, getConfig } = deps;
  if (!app || !query) throw new Error("registrarServicos: app e query são obrigatórios");

  // ---------- helpers ----------
  const txt = (x, max = 300) => String(x == null ? "" : x).trim().slice(0, max);
  const intNaoNeg = (x) => { const n = Math.trunc(Number(x)); return Number.isFinite(n) && n >= 0 ? n : 0; };
  const reais = (c) => "R$ " + (Number(c || 0) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const ehAdmin = (req) => ["admin", "gestor"].includes(req.usuario.role);
  const ehTecnico = (req) => ["tecnico", "aquarista"].includes(req.usuario.role);
  // Guard: só técnicos (equipe de campo). Admin/gestor também passam para testes.
  const exigeTecnico = (req, res, next) => {
    if (["tecnico", "aquarista", "admin", "gestor"].includes(req.usuario.role)) return next();
    return res.status(403).json({ erro: "acesso restrito à equipe técnica" });
  };
  const emailInterno = async () => {
    try { if (getConfig) { const e = await getConfig("email_vendas"); if (e) return e; } } catch {}
    return "br.aqualife@gmail.com";
  };
  const uuidOk = (v) => (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v || "")) ? String(v) : null);
  const CONTRATOS = ["servico", "diaria", "fixo"];
  const CONTRATO_LABEL = { servico: "Por serviço", diaria: "Por diária", fixo: "Fixo mensal" };

  // ---- datas / dias úteis ----
  function ehDiaUtil(d) { const g = d.getDay(); return g !== 0 && g !== 6; }
  function addDiasUteis(date, n) {
    const d = new Date(date); let add = 0;
    while (add < n) { d.setDate(d.getDate() + 1); if (ehDiaUtil(d)) add++; }
    return d;
  }
  // Primeira segunda-feira estritamente após a data
  function proximaSegunda(date) {
    const d = new Date(date); const g = d.getDay();
    const diff = ((8 - g) % 7) || 7; // se já for segunda, vai para a próxima
    d.setDate(d.getDate() + diff); return d;
  }
  function soData(d) { const x = new Date(d); return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0"); }
  // Regra: toda segunda soma-se a semana anterior e adiciona 7 dias úteis
  function previsaoPagamento(dataConclusao) {
    const seg = proximaSegunda(new Date(dataConclusao));
    return soData(addDiasUteis(seg, 7));
  }

  // ---------- CONTRATOS DOS TÉCNICOS (admin) ----------
  app.get("/api/admin/tecnicos", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const r = await query(
        `SELECT id, name, email, role, cidade,
                COALESCE(contrato_tipo,'servico') AS contrato_tipo,
                COALESCE(contrato_valor_cents,0) AS contrato_valor_cents,
                pix_chave, pix_tipo, pix_titular
         FROM app_user
         WHERE ativo=true AND role IN ('tecnico','aquarista')
         ORDER BY name`);
      res.json(r.rows.map((t) => ({ ...t, contrato_valor_cents: Number(t.contrato_valor_cents) || 0 })));
    } catch (err) { console.error("[servicos/tecnicos]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });
  app.patch("/api/admin/tecnicos/:id/contrato", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const b = req.body || {};
      const tipo = CONTRATOS.includes(b.contrato_tipo) ? b.contrato_tipo : "servico";
      const valor = intNaoNeg(b.contrato_valor_cents);
      const cidade = txt(b.cidade, 80);
      // estado anterior p/ saber se a tarifa mudou
      const antes = (await query(`SELECT name, email, COALESCE(contrato_tipo,'servico') AS contrato_tipo, COALESCE(contrato_valor_cents,0) AS contrato_valor_cents FROM app_user WHERE id=$1`, [req.params.id])).rows[0];
      const r = await query(
        `UPDATE app_user SET contrato_tipo=$2, contrato_valor_cents=$3, cidade=$4 WHERE id=$1 AND role IN ('tecnico','aquarista')
         RETURNING id, name, email, cidade, contrato_tipo, contrato_valor_cents`, [req.params.id, tipo, valor, cidade]);
      if (!r.rows[0]) return res.status(404).json({ erro: "técnico não encontrado" });
      // Notifica o técnico se a forma de pagamento OU o valor mudou
      const mudou = antes && (antes.contrato_tipo !== tipo || Number(antes.contrato_valor_cents) !== valor);
      if (mudou && req.body.notificar !== false) notificarTarifa(r.rows[0]).catch(() => {});
      res.json({ ok: true, ...r.rows[0], notificado: !!mudou });
    } catch (err) { console.error("[servicos/contrato]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });

  // ---------- PIX do técnico (o próprio cadastra) ----------
  app.get("/api/tecnico/pix", exigeLogin, async (req, res) => {
    try {
      const r = await query(`SELECT pix_chave, pix_tipo, pix_titular, COALESCE(contrato_tipo,'servico') AS contrato_tipo, COALESCE(contrato_valor_cents,0) AS contrato_valor_cents FROM app_user WHERE id=$1`, [req.usuario.id]);
      const u = r.rows[0] || {};
      res.json({ pix_chave: u.pix_chave || "", pix_tipo: u.pix_tipo || "", pix_titular: u.pix_titular || "",
        contrato_tipo: u.contrato_tipo, contrato_label: CONTRATO_LABEL[u.contrato_tipo] || u.contrato_tipo,
        contrato_valor_cents: Number(u.contrato_valor_cents) || 0 });
    } catch (err) { console.error("[servicos/pix:get]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });
  app.put("/api/tecnico/pix", exigeLogin, async (req, res) => {
    try {
      const b = req.body || {};
      const tipos = ["cpf", "cnpj", "email", "telefone", "aleatoria"];
      const tipo = tipos.includes(b.pix_tipo) ? b.pix_tipo : "aleatoria";
      await query(`UPDATE app_user SET pix_chave=$2, pix_tipo=$3, pix_titular=$4 WHERE id=$1`,
        [req.usuario.id, txt(b.pix_chave, 160), tipo, txt(b.pix_titular, 160)]);
      res.json({ ok: true });
    } catch (err) { console.error("[servicos/pix:put]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });
  app.get("/api/tecnico/contrato", exigeLogin, async (req, res) => {
    try {
      const r = await query(`SELECT COALESCE(contrato_tipo,'servico') AS contrato_tipo, COALESCE(contrato_valor_cents,0) AS contrato_valor_cents FROM app_user WHERE id=$1`, [req.usuario.id]);
      const u = r.rows[0] || {};
      res.json({ contrato_tipo: u.contrato_tipo, contrato_label: CONTRATO_LABEL[u.contrato_tipo] || u.contrato_tipo, contrato_valor_cents: Number(u.contrato_valor_cents) || 0 });
    } catch (err) { console.error("[servicos/contrato:tec]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });

  // ---------- UPLOAD de fotos (admin e técnico) ----------
  if (upload) {
    app.post("/api/servicos/upload", exigeLogin, upload.array("fotos", 8), async (req, res) => {
      try {
        const urls = (req.files || []).map((f) => `/uploads/${f.filename}`);
        res.json({ ok: true, urls });
      } catch (err) { console.error("[servicos/upload]", err.message); res.status(500).json({ erro: "falha no upload" }); }
    });
  }

  // ---------- OPORTUNIDADES — admin ----------
  function montarOportunidade(b) {
    const fotos = Array.isArray(b.fotos) ? b.fotos.filter((u) => typeof u === "string").slice(0, 8) : [];
    let data_servico = null;
    if (b.data_servico) { const d = new Date(b.data_servico); if (!isNaN(d.getTime())) data_servico = soData(d); }
    const publico = ["todos", "cidade", "selecionados"].includes(b.publico) ? b.publico : "todos";
    const cidades = Array.isArray(b.cidades) ? b.cidades.map((c) => txt(c, 80)).filter(Boolean).slice(0, 30) : [];
    const tecnicos_alvo = Array.isArray(b.tecnicos_alvo) ? b.tecnicos_alvo.map((x) => uuidOk(x)).filter(Boolean).slice(0, 50) : [];
    return {
      titulo: txt(b.titulo, 160), regiao: txt(b.regiao, 160), descricao: txt(b.descricao, 4000),
      data_servico, hora: txt(b.hora, 20), necessita_retorno: b.necessita_retorno === true,
      valor_cents: intNaoNeg(b.valor_cents), deslocamento_cents: intNaoNeg(b.deslocamento_cents), fotos,
      publico, cidades, tecnicos_alvo,
    };
  }

  app.post("/api/admin/oportunidades", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const d = montarOportunidade(req.body);
      if (!d.titulo) return res.status(400).json({ erro: "informe o título" });
      const publicar = (req.body && req.body.publicar) === true;
      const r = await query(
        `INSERT INTO oportunidade (titulo, regiao, descricao, data_servico, hora, necessita_retorno, valor_cents, deslocamento_cents, fotos, publico, cidades, tecnicos_alvo, status, criado_por, publicada_em)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11::jsonb,$12::jsonb,$13,$14,$15) RETURNING *`,
        [d.titulo, d.regiao, d.descricao, d.data_servico, d.hora, d.necessita_retorno, d.valor_cents, d.deslocamento_cents,
         JSON.stringify(d.fotos), d.publico, JSON.stringify(d.cidades), JSON.stringify(d.tecnicos_alvo),
         publicar ? "aberta" : "rascunho", req.usuario.id, publicar ? new Date().toISOString() : null]);
      const op = r.rows[0];
      if (publicar) notificarTecnicosNova(op).catch(() => {});
      res.json(op);
    } catch (err) { console.error("[oportunidades:post]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });

  app.put("/api/admin/oportunidades/:id", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const d = montarOportunidade(req.body);
      if (!d.titulo) return res.status(400).json({ erro: "informe o título" });
      const r = await query(
        `UPDATE oportunidade SET titulo=$2, regiao=$3, descricao=$4, data_servico=$5, hora=$6, necessita_retorno=$7,
           valor_cents=$8, deslocamento_cents=$9, fotos=$10::jsonb, publico=$11, cidades=$12::jsonb, tecnicos_alvo=$13::jsonb, atualizado_em=NOW()
         WHERE id=$1 AND status IN ('rascunho','aberta') RETURNING *`,
        [req.params.id, d.titulo, d.regiao, d.descricao, d.data_servico, d.hora, d.necessita_retorno, d.valor_cents, d.deslocamento_cents,
         JSON.stringify(d.fotos), d.publico, JSON.stringify(d.cidades), JSON.stringify(d.tecnicos_alvo)]);
      if (!r.rows[0]) return res.status(409).json({ erro: "só é possível editar oportunidades em rascunho ou abertas (ainda não aceitas)" });
      res.json(r.rows[0]);
    } catch (err) { console.error("[oportunidades:put]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });

  app.post("/api/admin/oportunidades/:id/publicar", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const r = await query(`UPDATE oportunidade SET status='aberta', publicada_em=NOW(), atualizado_em=NOW() WHERE id=$1 AND status='rascunho' RETURNING *`, [req.params.id]);
      if (!r.rows[0]) return res.status(409).json({ erro: "oportunidade não está em rascunho" });
      notificarTecnicosNova(r.rows[0]).catch(() => {});
      res.json({ ok: true });
    } catch (err) { console.error("[oportunidades:publicar]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });

  // Editar valor com observação obrigatória (gera log)
  app.post("/api/admin/oportunidades/:id/valor", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const b = req.body || {};
      const novo = intNaoNeg(b.valor_cents);
      const motivo = txt(b.motivo, 500);
      if (!motivo) return res.status(400).json({ erro: "descreva o motivo da alteração de valor" });
      const at = await query(`SELECT valor_cents, valor_final_cents, status FROM oportunidade WHERE id=$1`, [req.params.id]);
      const op = at.rows[0]; if (!op) return res.status(404).json({ erro: "não encontrada" });
      const de = (op.valor_final_cents != null ? op.valor_final_cents : op.valor_cents) || 0;
      await withTransaction(async (cx) => {
        // Se já concluída, mexe no valor_final; senão no valor base
        if (op.status === "concluida") await cx.query(`UPDATE oportunidade SET valor_final_cents=$2, atualizado_em=NOW() WHERE id=$1`, [req.params.id, novo]);
        else await cx.query(`UPDATE oportunidade SET valor_cents=$2, atualizado_em=NOW() WHERE id=$1`, [req.params.id, novo]);
        await cx.query(`INSERT INTO oportunidade_valor_log (oportunidade_id, de_cents, para_cents, motivo, usuario_id) VALUES ($1,$2,$3,$4,$5)`,
          [req.params.id, de, novo, motivo, req.usuario.id]);
      });
      res.json({ ok: true, de_cents: de, para_cents: novo });
    } catch (err) { console.error("[oportunidades:valor]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });

  // Cálculo sugerido do valor conforme contrato
  async function sugerirValor(op, tecnico) {
    const tipo = tecnico.contrato_tipo || "servico";
    if (tipo === "fixo") return { valor: 0, meia_diaria: false, nota: "Contrato fixo mensal — dia de trabalho normal (sem valor avulso)." };
    if (tipo === "servico") return { valor: op.valor_cents || 0, meia_diaria: false, nota: "Pagamento por serviço resolvido." };
    // diária
    const diaria = tecnico.contrato_valor_cents || 0;
    if (!op.is_retorno) return { valor: diaria, meia_diaria: false, nota: "Diária cheia." };
    // retorno: meia diária se NÃO houver manutenção concomitante (não-retorno) no mesmo dia.
    // Usa a data do serviço; se o retorno não tiver data, usa o dia da conclusão como referência.
    const dia = op.data_servico || soData(new Date());
    const r = await query(
      `SELECT 1 FROM oportunidade WHERE tecnico_id=$1 AND data_servico=$2 AND is_retorno=false
         AND id<>$3 AND status IN ('aceita','relatorio_enviado','concluida') LIMIT 1`,
      [op.tecnico_id, dia, op.id]);
    const concomitante = !!r.rows[0];
    if (concomitante) return { valor: 0, meia_diaria: false, nota: "Retorno no mesmo dia de outra manutenção paga — sem valor adicional." };
    return { valor: Math.floor(diaria / 2), meia_diaria: true, nota: "Meia diária (retorno sem manutenção no mesmo dia)." };
  }

  // Finalizar: admin decide concluída ou precisa de retorno
  app.post("/api/admin/oportunidades/:id/finalizar", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const resultado = req.body && req.body.resultado === "retorno" ? "retorno" : "concluida";
      const obs = txt(req.body && req.body.obs, 1000);
      const r = await query(`SELECT * FROM oportunidade WHERE id=$1`, [req.params.id]);
      const op = r.rows[0]; if (!op) return res.status(404).json({ erro: "não encontrada" });
      if (op.status !== "relatorio_enviado") return res.status(409).json({ erro: "o técnico precisa enviar o relatório antes de finalizar" });
      const tec = (await query(`SELECT id, name, email, COALESCE(contrato_tipo,'servico') AS contrato_tipo, COALESCE(contrato_valor_cents,0) AS contrato_valor_cents FROM app_user WHERE id=$1`, [op.tecnico_id])).rows[0] || {};

      if (resultado === "retorno") {
        // cria oportunidade de retorno vinculada, já atribuída ao mesmo técnico, aberta para aceite
        const nova = await withTransaction(async (cx) => {
          await cx.query(`UPDATE oportunidade SET status='retorno', obs_admin=$2, atualizado_em=NOW() WHERE id=$1`, [op.id, obs]);
          const ins = await cx.query(
            `INSERT INTO oportunidade (titulo, regiao, descricao, necessita_retorno, is_retorno, retorno_de, valor_cents, status, tecnico_id, criado_por, publicada_em)
             VALUES ($1,$2,$3,false,true,$4,$5,'aberta',$6,$7,NOW()) RETURNING *`,
            ["[RETORNO] " + op.titulo, op.regiao, "Retorno da manutenção anterior. " + obs, op.id, 0, op.tecnico_id, req.usuario.id]);
          return ins.rows[0];
        });
        notificarRetorno(nova, tec).catch(() => {});
        return res.json({ ok: true, resultado: "retorno", retorno_id: nova.id });
      }

      // concluída → calcula valor (serviço/diária + deslocamento) e previsão de pagamento
      const sug = await sugerirValor(op, tec);
      const desloc = intNaoNeg(op.deslocamento_cents);
      const valorFinal = sug.valor + desloc;
      const prev = previsaoPagamento(new Date());
      await query(
        `UPDATE oportunidade SET status='concluida', concluida_em=NOW(), obs_admin=$2,
           valor_final_cents=$3, meia_diaria=$4, previsao_pagamento=$5, atualizado_em=NOW() WHERE id=$1`,
        [op.id, obs, valorFinal, sug.meia_diaria, prev]);
      const notaFull = sug.nota + (desloc ? ` + deslocamento ${reais(desloc)}.` : "");
      notificarConcluida({ ...op, valor_final_cents: valorFinal, previsao_pagamento: prev }, tec, { ...sug, nota: notaFull }).catch(() => {});
      res.json({ ok: true, resultado: "concluida", valor_cents: valorFinal, servico_cents: sug.valor, deslocamento_cents: desloc, previsao_pagamento: prev, nota: notaFull });
    } catch (err) { console.error("[oportunidades:finalizar]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });

  app.post("/api/admin/oportunidades/:id/cancelar", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const r = await query(`UPDATE oportunidade SET status='cancelada', atualizado_em=NOW() WHERE id=$1 AND status NOT IN ('concluida') RETURNING id`, [req.params.id]);
      if (!r.rows[0]) return res.status(409).json({ erro: "não é possível cancelar" });
      res.json({ ok: true });
    } catch (err) { console.error("[oportunidades:cancelar]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });

  // Reembolso: aprovar/recusar (admin)
  app.patch("/api/admin/oportunidades/reembolso/:rid", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const st = ["aprovado", "recusado"].includes(req.body && req.body.status) ? req.body.status : null;
      if (!st) return res.status(400).json({ erro: "status inválido" });
      const r = await query(`UPDATE oportunidade_reembolso SET status=$2 WHERE id=$1 RETURNING *`, [req.params.rid, st]);
      if (!r.rows[0]) return res.status(404).json({ erro: "não encontrado" });
      res.json({ ok: true });
    } catch (err) { console.error("[reembolso:patch]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });

  // Lista admin (com filtro de status)
  app.get("/api/admin/oportunidades", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const status = txt(req.query.status, 20);
      const cond = []; const par = [];
      if (status) { par.push(status); cond.push(`o.status=$${par.length}`); }
      const where = cond.length ? "WHERE " + cond.join(" AND ") : "";
      const r = await query(
        `SELECT o.*, u.name AS tecnico_nome
         FROM oportunidade o LEFT JOIN app_user u ON u.id=o.tecnico_id
         ${where} ORDER BY o.criado_em DESC LIMIT 300`, par);
      res.json(r.rows);
    } catch (err) { console.error("[oportunidades:list]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });
  app.get("/api/admin/oportunidades/:id", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const op = (await query(`SELECT o.*, u.name AS tecnico_nome, u.email AS tecnico_email FROM oportunidade o LEFT JOIN app_user u ON u.id=o.tecnico_id WHERE o.id=$1`, [req.params.id])).rows[0];
      if (!op) return res.status(404).json({ erro: "não encontrada" });
      const [rel, reemb, log] = await Promise.all([
        query(`SELECT * FROM oportunidade_relatorio WHERE oportunidade_id=$1 ORDER BY criado_em DESC`, [req.params.id]),
        query(`SELECT * FROM oportunidade_reembolso WHERE oportunidade_id=$1 ORDER BY criado_em`, [req.params.id]),
        query(`SELECT l.*, u.name AS usuario_nome FROM oportunidade_valor_log l LEFT JOIN app_user u ON u.id=l.usuario_id WHERE oportunidade_id=$1 ORDER BY l.criado_em`, [req.params.id]),
      ]);
      res.json({ ...op, relatorios: rel.rows, reembolsos: reemb.rows, valor_log: log.rows });
    } catch (err) { console.error("[oportunidades:detalhe]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });

  // ---------- OPORTUNIDADES — técnico ----------
  // Abertas (sem técnico) + as minhas
  app.get("/api/tecnico/oportunidades", exigeLogin, exigeTecnico, async (req, res) => {
    try {
      const uid = req.usuario.id;
      const minhaCidade = ((await query(`SELECT cidade FROM app_user WHERE id=$1`, [uid])).rows[0] || {}).cidade || "";
      const abertas = (await query(
        `SELECT * FROM oportunidade o WHERE o.status='aberta' AND (o.tecnico_id IS NULL OR o.tecnico_id=$1)
           AND NOT EXISTS (SELECT 1 FROM oportunidade_recusa r WHERE r.oportunidade_id=o.id AND r.tecnico_id=$1)
           AND (
             COALESCE(o.publico,'todos')='todos'
             OR o.tecnico_id=$1
             OR (o.publico='cidade' AND $2<>'' AND EXISTS (SELECT 1 FROM jsonb_array_elements_text(COALESCE(o.cidades,'[]'::jsonb)) c WHERE lower(c)=lower($2)))
             OR (o.publico='selecionados' AND o.tecnicos_alvo @> to_jsonb($1::text))
           )
         ORDER BY o.data_servico NULLS LAST, o.criado_em DESC`, [uid, minhaCidade])).rows;
      const minhas = (await query(
        `SELECT * FROM oportunidade WHERE tecnico_id=$1 AND status IN ('aceita','relatorio_enviado','concluida','retorno') ORDER BY criado_em DESC LIMIT 100`, [uid])).rows;
      res.json({ abertas, minhas });
    } catch (err) { console.error("[tec/oportunidades]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });

  app.post("/api/tecnico/oportunidades/:id/aceitar", exigeLogin, exigeTecnico, async (req, res) => {
    try {
      if (!(req.body && req.body.termos === true)) return res.status(400).json({ erro: "é necessário aceitar os termos" });
      const uid = req.usuario.id;
      // Data/horário proposto pelo técnico (usado principalmente em retornos sem data)
      let dataProposta = null;
      if (req.body && req.body.data_servico) { const d = new Date(req.body.data_servico); if (!isNaN(d.getTime())) dataProposta = soData(d); }
      const hora = txt(req.body && req.body.hora, 20);
      const r = await query(
        `UPDATE oportunidade SET status='aceita', tecnico_id=$2, aceito_em=NOW(), termos_aceitos=true,
           data_servico = COALESCE(data_servico, $3), hora = CASE WHEN $4<>'' THEN $4 ELSE hora END,
           lembrete_enviado=false, atualizado_em=NOW()
         WHERE id=$1 AND status='aberta' AND (tecnico_id IS NULL OR tecnico_id=$2) RETURNING *`,
        [req.params.id, uid, dataProposta, hora]);
      if (!r.rows[0]) return res.status(409).json({ erro: "esta oportunidade não está mais disponível" });
      res.json({ ok: true });
    } catch (err) { console.error("[tec/aceitar]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });

  app.post("/api/tecnico/oportunidades/:id/recusar", exigeLogin, exigeTecnico, async (req, res) => {
    try {
      const uid = req.usuario.id;
      const motivo = txt(req.body && req.body.motivo, 500);
      const op = (await query(`SELECT * FROM oportunidade WHERE id=$1`, [req.params.id])).rows[0];
      if (!op) return res.status(404).json({ erro: "não encontrada" });
      if (op.tecnico_id && op.tecnico_id === uid && op.status === "aberta") {
        // Retorno atribuído a este técnico: recusa marca a oportunidade como recusada
        await query(`UPDATE oportunidade SET status='recusada', recusado_motivo=$2, atualizado_em=NOW() WHERE id=$1`, [req.params.id, motivo]);
      } else {
        // Oportunidade aberta geral: registra dispensa pessoal (some da lista só deste técnico)
        await query(`INSERT INTO oportunidade_recusa (oportunidade_id, tecnico_id, motivo) VALUES ($1,$2,$3)
                     ON CONFLICT (oportunidade_id, tecnico_id) DO NOTHING`, [req.params.id, uid, motivo]);
      }
      res.json({ ok: true });
    } catch (err) { console.error("[tec/recusar]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });

  // Relatório da manutenção + reembolsos
  app.post("/api/tecnico/oportunidades/:id/relatorio", exigeLogin, exigeTecnico, async (req, res) => {
    try {
      const uid = req.usuario.id;
      const b = req.body || {};
      const op = (await query(`SELECT * FROM oportunidade WHERE id=$1 AND tecnico_id=$2`, [req.params.id, uid])).rows[0];
      if (!op) return res.status(404).json({ erro: "oportunidade não encontrada" });
      if (!["aceita", "relatorio_enviado"].includes(op.status)) return res.status(409).json({ erro: "não é possível enviar relatório agora" });
      const observacao = txt(b.observacao, 4000);
      if (!observacao) return res.status(400).json({ erro: "descreva o que foi feito na manutenção" });
      const fotos = Array.isArray(b.fotos) ? b.fotos.filter((u) => typeof u === "string").slice(0, 8) : [];
      const resolvido = b.resolvido !== false; // técnico indica se resolveu
      const reembolsos = Array.isArray(b.reembolsos) ? b.reembolsos.slice(0, 20) : [];
      await withTransaction(async (cx) => {
        await cx.query(
          `INSERT INTO oportunidade_relatorio (oportunidade_id, tecnico_id, resolvido, observacao, fotos)
           VALUES ($1,$2,$3,$4,$5::jsonb)`, [op.id, uid, resolvido, observacao, JSON.stringify(fotos)]);
        // reembolsos: até R$100 no total = pré-aprovado; acima disso aguarda admin
        let acumulado = 0;
        for (const it of reembolsos) {
          const v = intNaoNeg(it && it.valor_cents);
          const desc = txt(it && it.descricao, 200);
          if (!v || !desc) continue;
          acumulado += v;
          const st = acumulado <= 10000 ? "pre_aprovado" : "aguardando";
          await cx.query(`INSERT INTO oportunidade_reembolso (oportunidade_id, tecnico_id, descricao, valor_cents, status, comprovante_url)
             VALUES ($1,$2,$3,$4,$5,$6)`, [op.id, uid, desc, v, st, txt(it && it.comprovante_url, 400) || null]);
        }
        await cx.query(`UPDATE oportunidade SET status='relatorio_enviado', atualizado_em=NOW() WHERE id=$1`, [op.id]);
      });
      notificarRelatorioAdmin(op).catch(() => {});
      res.json({ ok: true });
    } catch (err) { console.error("[tec/relatorio]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });

  // Recebimentos previstos do técnico
  app.get("/api/tecnico/recebimentos", exigeLogin, async (req, res) => {
    try {
      const uid = req.usuario.id;
      const r = await query(
        `SELECT id, titulo, is_retorno, concluida_em, previsao_pagamento, meia_diaria,
                COALESCE(valor_final_cents,0) AS valor_cents, (pago_em IS NOT NULL) AS pago, pago_em
         FROM oportunidade WHERE tecnico_id=$1 AND status='concluida' ORDER BY previsao_pagamento DESC, concluida_em DESC LIMIT 200`, [uid]);
      const reemb = await query(
        `SELECT descricao, valor_cents, status, criado_em FROM oportunidade_reembolso
         WHERE tecnico_id=$1 AND status IN ('pre_aprovado','aprovado') ORDER BY criado_em DESC LIMIT 100`, [uid]);
      const total = r.rows.reduce((a, x) => a + (Number(x.valor_cents) || 0), 0);
      const totalReemb = reemb.rows.reduce((a, x) => a + (Number(x.valor_cents) || 0), 0);
      res.json({ servicos: r.rows, reembolsos: reemb.rows, total_servicos_cents: total, total_reembolsos_cents: totalReemb });
    } catch (err) { console.error("[tec/recebimentos]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });

  // Detalhe de uma oportunidade (técnico) — inclui relatórios e reembolsos dele
  app.get("/api/tecnico/oportunidades/:id", exigeLogin, async (req, res) => {
    try {
      const uid = req.usuario.id;
      const op = (await query(`SELECT * FROM oportunidade WHERE id=$1 AND (tecnico_id=$2 OR status='aberta')`, [req.params.id, uid])).rows[0];
      if (!op) return res.status(404).json({ erro: "não encontrada" });
      const rel = (await query(`SELECT * FROM oportunidade_relatorio WHERE oportunidade_id=$1 ORDER BY criado_em DESC`, [req.params.id])).rows;
      const reemb = (await query(`SELECT * FROM oportunidade_reembolso WHERE oportunidade_id=$1 ORDER BY criado_em`, [req.params.id])).rows;
      res.json({ ...op, relatorios: rel, reembolsos: reemb });
    } catch (err) { console.error("[tec/op:detalhe]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });

  // ---------- INDICADORES DE SERVIÇOS (admin) ----------
  app.get("/api/admin/servicos/indicadores", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const de = txt(req.query.de, 10), ate = txt(req.query.ate, 10);
      // janela aplicada a concluida_em (financeiro/tempo); status é snapshot atual
      const cond = ["status='concluida'"]; const par = [];
      if (de) { par.push(de); cond.push(`concluida_em >= $${par.length}::date`); }
      if (ate) { par.push(ate); cond.push(`concluida_em < ($${par.length}::date + INTERVAL '1 day')`); }
      const whereC = cond.join(" AND ");

      const porStatus = (await query(`SELECT status, COUNT(*)::int AS n FROM oportunidade GROUP BY status`)).rows;
      const resumo = (await query(
        `SELECT COUNT(*)::int AS concluidas,
                COALESCE(SUM(COALESCE(valor_final_cents,0)),0) AS custo_cents,
                COALESCE(AVG(COALESCE(valor_final_cents,0)),0) AS ticket_cents,
                COALESCE(AVG(EXTRACT(EPOCH FROM (concluida_em - aceito_em))/86400.0) FILTER (WHERE aceito_em IS NOT NULL),0) AS dias_medio,
                COUNT(*) FILTER (WHERE is_retorno)::int AS retornos
         FROM oportunidade WHERE ${whereC}`, par)).rows[0];
      const custoPorTecnico = (await query(
        `SELECT u.name AS tecnico, COUNT(*)::int AS servicos,
                COALESCE(SUM(COALESCE(o.valor_final_cents,0)),0) AS custo_cents
         FROM oportunidade o JOIN app_user u ON u.id=o.tecnico_id
         WHERE ${whereC} GROUP BY u.name ORDER BY custo_cents DESC LIMIT 20`, par)).rows;
      // reembolsos aprovados no período (por criado_em)
      const condR = ["status IN ('pre_aprovado','aprovado')"]; const parR = [];
      if (de) { parR.push(de); condR.push(`criado_em >= $${parR.length}::date`); }
      if (ate) { parR.push(ate); condR.push(`criado_em < ($${parR.length}::date + INTERVAL '1 day')`); }
      const reemb = (await query(`SELECT COALESCE(SUM(valor_cents),0) AS total, COUNT(*)::int AS n FROM oportunidade_reembolso WHERE ${condR.join(" AND ")}`, parR)).rows[0];

      const n = (x) => Number(x) || 0;
      const concluidas = n(resumo.concluidas);
      res.json({
        periodo: { de: de || null, ate: ate || null },
        por_status: porStatus.map((s) => ({ status: s.status, n: n(s.n) })),
        concluidas,
        custo_cents: n(resumo.custo_cents),
        ticket_medio_cents: Math.round(n(resumo.ticket_cents)),
        dias_medio: Math.round(n(resumo.dias_medio) * 10) / 10,
        retornos: n(resumo.retornos),
        taxa_retorno: concluidas ? Math.round((n(resumo.retornos) / concluidas) * 100) : 0,
        custo_por_tecnico: custoPorTecnico.map((t) => ({ tecnico: t.tecnico, servicos: n(t.servicos), custo_cents: n(t.custo_cents) })),
        reembolsos_cents: n(reemb.total), reembolsos_n: n(reemb.n),
      });
    } catch (err) { console.error("[servicos/indicadores]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });

  // ---------- FECHAMENTO SEMANAL DE PAGAMENTOS (admin) ----------
  // Lista o que está pendente de pagamento, agrupado por técnico.
  async function pendentesPorTecnico() {
    const servicos = (await query(
      `SELECT o.id, o.titulo, o.is_retorno, o.meia_diaria, o.concluida_em, o.previsao_pagamento,
              COALESCE(o.valor_final_cents,0) AS valor_cents,
              o.tecnico_id, u.name AS tecnico_nome, u.email AS tecnico_email,
              u.pix_chave, u.pix_tipo, u.pix_titular
       FROM oportunidade o JOIN app_user u ON u.id=o.tecnico_id
       WHERE o.status='concluida' AND o.pago_em IS NULL
       ORDER BY u.name, o.previsao_pagamento`)).rows;
    const reembolsos = (await query(
      `SELECT r.id, r.oportunidade_id, r.descricao, r.valor_cents, r.tecnico_id
       FROM oportunidade_reembolso r
       WHERE r.status IN ('pre_aprovado','aprovado') AND r.pago_em IS NULL
       ORDER BY r.criado_em`)).rows;
    const mapa = new Map();
    const get = (tid, base) => {
      if (!mapa.has(tid)) mapa.set(tid, { tecnico_id: tid, tecnico_nome: base.tecnico_nome, tecnico_email: base.tecnico_email,
        pix_chave: base.pix_chave, pix_tipo: base.pix_tipo, pix_titular: base.pix_titular,
        servicos: [], reembolsos: [], total_servicos_cents: 0, total_reembolsos_cents: 0, total_cents: 0, previsao: null });
      return mapa.get(tid);
    };
    for (const s of servicos) {
      const g = get(s.tecnico_id, s);
      g.servicos.push({ id: s.id, titulo: s.titulo, is_retorno: s.is_retorno, meia_diaria: s.meia_diaria, valor_cents: Number(s.valor_cents) || 0, previsao_pagamento: s.previsao_pagamento, concluida_em: s.concluida_em });
      g.total_servicos_cents += Number(s.valor_cents) || 0;
      if (s.previsao_pagamento && (!g.previsao || s.previsao_pagamento > g.previsao)) g.previsao = s.previsao_pagamento;
    }
    for (const r of reembolsos) {
      if (!mapa.has(r.tecnico_id)) continue; // só mostra reembolso de quem tem serviço pendente; senão fica para o próximo
      const g = mapa.get(r.tecnico_id);
      g.reembolsos.push({ id: r.id, descricao: r.descricao, valor_cents: Number(r.valor_cents) || 0 });
      g.total_reembolsos_cents += Number(r.valor_cents) || 0;
    }
    const lista = [...mapa.values()];
    lista.forEach((g) => { g.total_cents = g.total_servicos_cents + g.total_reembolsos_cents; });
    return lista;
  }

  app.get("/api/admin/pagamentos/pendentes", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const lista = await pendentesPorTecnico();
      const total = lista.reduce((a, g) => a + g.total_cents, 0);
      res.json({ tecnicos: lista, total_geral_cents: total, gerado_em: new Date().toISOString() });
    } catch (err) { console.error("[pagamentos/pendentes]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });

  // Fecha o pagamento de um técnico: marca itens como pagos, cria lote e envia comprovante.
  app.post("/api/admin/pagamentos/pagar", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const tid = uuidOk(req.body && req.body.tecnico_id);
      if (!tid) return res.status(400).json({ erro: "técnico inválido" });
      const referencia = txt(req.body && req.body.referencia, 40) || soData(new Date());
      const observacao = txt(req.body && req.body.observacao, 500);
      const lista = await pendentesPorTecnico();
      const g = lista.find((x) => x.tecnico_id === tid);
      if (!g || g.total_cents <= 0) return res.status(409).json({ erro: "nada pendente para este técnico" });

      const lote = await withTransaction(async (cx) => {
        const l = (await cx.query(
          `INSERT INTO pagamento_lote (tecnico_id, referencia, total_servicos_cents, total_reembolsos_cents, total_cents, observacao, criado_por)
           VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
          [tid, referencia, g.total_servicos_cents, g.total_reembolsos_cents, g.total_cents, observacao, req.usuario.id])).rows[0];
        const sIds = g.servicos.map((s) => s.id);
        const rIds = g.reembolsos.map((r) => r.id);
        if (sIds.length) await cx.query(`UPDATE oportunidade SET pago_em=NOW(), lote_id=$2 WHERE id = ANY($1::uuid[])`, [sIds, l.id]);
        if (rIds.length) await cx.query(`UPDATE oportunidade_reembolso SET pago_em=NOW(), lote_id=$2, status='aprovado' WHERE id = ANY($1::uuid[])`, [rIds, l.id]);
        return l;
      });
      enviarComprovante(g, lote).catch(() => {});
      res.json({ ok: true, lote_id: lote.id, total_cents: g.total_cents });
    } catch (err) { console.error("[pagamentos/pagar]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });

  app.get("/api/admin/pagamentos/lotes", exigeLogin, exigeAdmin, async (req, res) => {
    try {
      const r = await query(
        `SELECT l.*, u.name AS tecnico_nome FROM pagamento_lote l LEFT JOIN app_user u ON u.id=l.tecnico_id
         ORDER BY l.criado_em DESC LIMIT 200`);
      res.json(r.rows);
    } catch (err) { console.error("[pagamentos/lotes]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });

  // Detalhe de um lote de pagamento (admin ou o técnico dono) — base do recibo
  app.get("/api/pagamentos/lote/:id", exigeLogin, async (req, res) => {
    try {
      const lote = (await query(
        `SELECT l.*, u.name AS tecnico_nome, u.email AS tecnico_email, u.pix_chave, u.pix_tipo, u.pix_titular
         FROM pagamento_lote l LEFT JOIN app_user u ON u.id=l.tecnico_id WHERE l.id=$1`, [req.params.id])).rows[0];
      if (!lote) return res.status(404).json({ erro: "não encontrado" });
      if (!ehAdmin(req) && req.usuario.id !== lote.tecnico_id) return res.status(403).json({ erro: "sem acesso" });
      const servicos = (await query(
        `SELECT titulo, is_retorno, meia_diaria, concluida_em, COALESCE(valor_final_cents,0) AS valor_cents
         FROM oportunidade WHERE lote_id=$1 ORDER BY concluida_em`, [req.params.id])).rows;
      const reembolsos = (await query(
        `SELECT descricao, valor_cents, comprovante_url FROM oportunidade_reembolso WHERE lote_id=$1 ORDER BY criado_em`, [req.params.id])).rows;
      res.json({ ...lote, servicos, reembolsos });
    } catch (err) { console.error("[pagamentos/lote]", err.message); res.status(500).json({ erro: "erro interno" }); }
  });

  async function enviarComprovante(g, lote) {
    if (!enviarEmail || !g.tecnico_email) return;
    const linhasS = g.servicos.map((s) => `<tr><td style="padding:6px 10px;border-top:1px solid #e5edf0">${s.titulo}${s.is_retorno ? " 🔁" : ""}${s.meia_diaria ? " (meia diária)" : ""}</td><td style="padding:6px 10px;border-top:1px solid #e5edf0;text-align:right">${reais(s.valor_cents)}</td></tr>`).join("");
    const linhasR = g.reembolsos.map((r) => `<tr><td style="padding:6px 10px;border-top:1px solid #e5edf0">Reembolso: ${r.descricao}</td><td style="padding:6px 10px;border-top:1px solid #e5edf0;text-align:right">${reais(r.valor_cents)}</td></tr>`).join("");
    const corpo = `<p>Olá, ${(g.tecnico_nome || "").split(" ")[0]}! Segue o comprovante do fechamento <b>${lote.referencia}</b>.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin:12px 0">
        ${linhasS}${linhasR}
        <tr><td style="padding:8px 10px;border-top:2px solid #cfe0e5;font-weight:700">Total</td><td style="padding:8px 10px;border-top:2px solid #cfe0e5;font-weight:700;text-align:right">${reais(lote.total_cents)}</td></tr>
      </table>
      <p><b>PIX:</b> ${g.pix_chave ? g.pix_chave + " (" + (g.pix_tipo || "") + ")" : "não cadastrado"}</p>
      ${lote.observacao ? `<p style="font-size:13px;color:#557">${lote.observacao}</p>` : ""}
      <p><a href="${baseUrl}/recibo.html?lote=${lote.id}" style="display:inline-block;background:#125265;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px">Ver / baixar recibo (PDF)</a></p>
      <p style="font-size:13px;color:#557">O pagamento é realizado em dias úteis conforme o cronograma acordado.</p>`;
    try { await enviarEmail({ para: g.tecnico_email, assunto: "Comprovante de pagamento — Aqualife", html: wrap("Comprovante de pagamento 💸", corpo) }); } catch {}
  }

  // Aviso de fechamento ao admin (segunda-feira) — idempotente por semana via config
  async function avisoFechamentoSemanal() {
    if (!enviarEmail) return { enviado: false };
    const hoje = new Date();
    if (hoje.getDay() !== 1) return { enviado: false }; // só segunda
    const marca = "fechamento_aviso_" + soData(hoje);
    try {
      if (getConfig) { const ja = await getConfig(marca); if (ja === "1") return { enviado: false }; }
      const lista = await pendentesPorTecnico();
      if (!lista.length) { if (deps.setConfig) await deps.setConfig(marca, "1"); return { enviado: false }; }
      const total = lista.reduce((a, g) => a + g.total_cents, 0);
      const linhas = lista.map((g) => `<tr><td style="padding:6px 10px;border-top:1px solid #e5edf0">${g.tecnico_nome || "—"}</td><td style="padding:6px 10px;border-top:1px solid #e5edf0;text-align:right">${reais(g.total_cents)}</td></tr>`).join("");
      const corpo = `<p>Fechamento semanal: há <b>${reais(total)}</b> pendente de pagamento para ${lista.length} técnico(s).</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin:10px 0">${linhas}</table>
        <p><a href="${baseUrl}/admin.html" style="display:inline-block;background:#125265;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px">Abrir fechamento no admin</a></p>`;
      await enviarEmail({ para: await emailInterno(), assunto: "Fechamento semanal de técnicos — Aqualife", html: wrap("Fechamento semanal 🗓️", corpo) });
      if (deps.setConfig) await deps.setConfig(marca, "1");
      return { enviado: true };
    } catch (e) { console.warn("[servicos] aviso fechamento:", e.message); return { enviado: false }; }
  }

  // ---------- E-MAILS ----------
  function wrap(titulo, corpo) {
    return `<div style="font-family:Arial,sans-serif;color:#12333F;line-height:1.6;max-width:600px;margin:0 auto">
      <h2 style="color:#125265">${titulo}</h2>${corpo}
      <hr style="border:none;border-top:1px solid #e3e8ea;margin:22px 0">
      <p style="font-size:12px;color:#7a8a90">Aqualife Aquarismo — portal do técnico</p></div>`;
  }
  const linkPortal = () => `${baseUrl}/servicos.html`;
  async function notificarTecnicosNova(op) {
    if (!enviarEmail) return;
    // Destinatários conforme o público-alvo da oportunidade
    let where = "ativo=true AND role IN ('tecnico','aquarista') AND email IS NOT NULL AND email<>''";
    const par = [];
    const publico = op.publico || "todos";
    if (publico === "cidade") {
      const cidades = Array.isArray(op.cidades) ? op.cidades : [];
      if (!cidades.length) return;
      par.push(cidades.map((c) => String(c).toLowerCase()));
      where += ` AND lower(COALESCE(cidade,'')) = ANY($${par.length}::text[])`;
    } else if (publico === "selecionados") {
      const ids = Array.isArray(op.tecnicos_alvo) ? op.tecnicos_alvo : [];
      if (!ids.length) return;
      par.push(ids);
      where += ` AND id = ANY($${par.length}::uuid[])`;
    }
    const tecs = (await query(`SELECT email, name FROM app_user WHERE ${where}`, par)).rows;
    const corpo = `<p>Há uma nova oportunidade de manutenção disponível no portal.</p>
      <p><b>${op.titulo}</b>${op.regiao ? " — " + op.regiao : ""}${op.data_servico ? "<br>Data: " + op.data_servico : ""}</p>
      <p>Acesse o portal para ver os detalhes e aceitar os termos:</p>
      <p><a href="${linkPortal()}" style="display:inline-block;background:#125265;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px">Ver no portal</a></p>`;
    for (const t of tecs) {
      try { await enviarEmail({ para: t.email, assunto: "Nova manutenção disponível — Aqualife", html: wrap("Nova manutenção disponível 🔧", corpo) }); } catch {}
    }
  }
  async function notificarTarifa(tec) {
    if (!enviarEmail || !tec || !tec.email) return;
    const lbl = CONTRATO_LABEL[tec.contrato_tipo] || tec.contrato_tipo;
    const corpo = `<p>Olá, ${(tec.name || "").split(" ")[0]}! Sua forma de pagamento acordada com a Aqualife foi atualizada.</p>
      <p><b>Modelo:</b> ${lbl}<br>${tec.contrato_valor_cents ? `<b>Valor de referência:</b> ${reais(tec.contrato_valor_cents)}` : ""}</p>
      <p style="font-size:13px;color:#557">Em caso de dúvida sobre a alteração, fale com a Aqualife.</p>
      <p><a href="${linkPortal()}" style="display:inline-block;background:#125265;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px">Abrir portal</a></p>`;
    try { await enviarEmail({ para: tec.email, assunto: "Atualização da sua forma de pagamento — Aqualife", html: wrap("Forma de pagamento atualizada 💼", corpo) }); } catch {}
  }
  async function notificarRetorno(op, tec) {
    if (!enviarEmail || !tec || !tec.email) return;
    const corpo = `<p>Foi aberto um <b>retorno</b> para você no portal referente à manutenção anterior.</p>
      <p><b>${op.titulo}</b>${op.regiao ? " — " + op.regiao : ""}</p>
      <p><a href="${linkPortal()}" style="display:inline-block;background:#125265;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px">Ver no portal</a></p>`;
    try { await enviarEmail({ para: tec.email, assunto: "Retorno de manutenção — Aqualife", html: wrap("Retorno de manutenção 🔁", corpo) }); } catch {}
  }
  async function notificarRelatorioAdmin(op) {
    if (!enviarEmail) return;
    const dest = await emailInterno();
    const corpo = `<p>O técnico enviou o relatório da manutenção <b>${op.titulo}</b>. Avalie no admin se foi concluída ou precisa de retorno.</p>`;
    try { await enviarEmail({ para: dest, assunto: "Relatório de manutenção recebido", html: wrap("Relatório recebido 📝", corpo) }); } catch {}
  }
  async function notificarConcluida(op, tec, sug) {
    if (!enviarEmail || !tec || !tec.email) return;
    const corpo = `<p>Sua manutenção <b>${op.titulo}</b> foi marcada como <b>concluída</b>. ✅</p>
      <p><b>Valor:</b> ${reais(op.valor_final_cents)}${sug && sug.meia_diaria ? " (meia diária)" : ""}<br>
         <b>Previsão de recebimento:</b> ${op.previsao_pagamento}</p>
      <p style="font-size:13px;color:#557">${sug ? sug.nota : ""}</p>
      <p><a href="${linkPortal()}" style="display:inline-block;background:#125265;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px">Ver recebimentos</a></p>`;
    try { await enviarEmail({ para: tec.email, assunto: "Manutenção concluída — Aqualife", html: wrap("Manutenção concluída ✅", corpo) }); } catch {}
  }

  // Lembrete 1 dia antes (chamar diariamente a partir do server.js)
  async function enviarLembretes() {
    if (!enviarEmail) return { enviados: 0 };
    const _am = new Date(); _am.setDate(_am.getDate() + 1);
    const amanha = soData(_am);
    let enviados = 0;
    try {
      const r = await query(
        `SELECT o.id, o.titulo, o.regiao, o.data_servico, o.hora, u.email, u.name
         FROM oportunidade o JOIN app_user u ON u.id=o.tecnico_id
         WHERE o.status='aceita' AND o.data_servico=$1 AND COALESCE(o.lembrete_enviado,false)=false`, [amanha]);
      for (const op of r.rows) {
        try {
          const corpo = `<p>Lembrete: você tem uma manutenção <b>amanhã</b>${op.hora ? " às " + op.hora : ""}.</p>
            <p><b>${op.titulo}</b>${op.regiao ? " — " + op.regiao : ""}<br>Data: ${op.data_servico}</p>
            <p><a href="${linkPortal()}" style="display:inline-block;background:#125265;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px">Abrir portal</a></p>`;
          await enviarEmail({ para: op.email, assunto: "Lembrete: manutenção amanhã — Aqualife", html: wrap("Manutenção amanhã 📅", corpo) });
          await query(`UPDATE oportunidade SET lembrete_enviado=true WHERE id=$1`, [op.id]);
          enviados++;
        } catch {}
      }
    } catch (e) { console.warn("[servicos] lembretes:", e.message); }
    return { enviados };
  }

  return { enviarLembretes, avisoFechamentoSemanal };
}

export const SERVICOS_SCHEMA = [
  // Contrato e PIX no usuário (técnico)
  `ALTER TABLE app_user ADD COLUMN IF NOT EXISTS contrato_tipo TEXT DEFAULT 'servico'`,
  `ALTER TABLE app_user ADD COLUMN IF NOT EXISTS contrato_valor_cents INT DEFAULT 0`,
  `ALTER TABLE app_user ADD COLUMN IF NOT EXISTS pix_chave TEXT`,
  `ALTER TABLE app_user ADD COLUMN IF NOT EXISTS pix_tipo TEXT`,
  `ALTER TABLE app_user ADD COLUMN IF NOT EXISTS pix_titular TEXT`,
  `ALTER TABLE app_user ADD COLUMN IF NOT EXISTS cidade TEXT`,
  // Oportunidades de manutenção
  `CREATE TABLE IF NOT EXISTS oportunidade (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     titulo TEXT NOT NULL,
     regiao TEXT,
     descricao TEXT,
     data_servico DATE,
     hora TEXT,
     necessita_retorno BOOLEAN DEFAULT false,
     is_retorno BOOLEAN DEFAULT false,
     retorno_de UUID,
     valor_cents INT NOT NULL DEFAULT 0,
     valor_final_cents INT,
     meia_diaria BOOLEAN DEFAULT false,
     fotos JSONB DEFAULT '[]'::jsonb,
     status TEXT NOT NULL DEFAULT 'rascunho',
     tecnico_id UUID,
     termos_aceitos BOOLEAN DEFAULT false,
     recusado_motivo TEXT,
     obs_admin TEXT,
     lembrete_enviado BOOLEAN DEFAULT false,
     publicada_em TIMESTAMPTZ,
     aceito_em TIMESTAMPTZ,
     concluida_em TIMESTAMPTZ,
     previsao_pagamento DATE,
     criado_por UUID,
     criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  `CREATE INDEX IF NOT EXISTS idx_oportunidade_status ON oportunidade (status, criado_em DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_oportunidade_tecnico ON oportunidade (tecnico_id)`,
  // Público-alvo da oportunidade + deslocamento
  `ALTER TABLE oportunidade ADD COLUMN IF NOT EXISTS publico TEXT DEFAULT 'todos'`,
  `ALTER TABLE oportunidade ADD COLUMN IF NOT EXISTS cidades JSONB DEFAULT '[]'::jsonb`,
  `ALTER TABLE oportunidade ADD COLUMN IF NOT EXISTS tecnicos_alvo JSONB DEFAULT '[]'::jsonb`,
  `ALTER TABLE oportunidade ADD COLUMN IF NOT EXISTS deslocamento_cents INT NOT NULL DEFAULT 0`,
  `CREATE TABLE IF NOT EXISTS oportunidade_relatorio (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     oportunidade_id UUID NOT NULL REFERENCES oportunidade(id) ON DELETE CASCADE,
     tecnico_id UUID,
     resolvido BOOLEAN DEFAULT true,
     observacao TEXT,
     fotos JSONB DEFAULT '[]'::jsonb,
     criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  `CREATE INDEX IF NOT EXISTS idx_op_relatorio ON oportunidade_relatorio (oportunidade_id)`,
  `CREATE TABLE IF NOT EXISTS oportunidade_reembolso (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     oportunidade_id UUID NOT NULL REFERENCES oportunidade(id) ON DELETE CASCADE,
     tecnico_id UUID,
     descricao TEXT,
     valor_cents INT NOT NULL DEFAULT 0,
     status TEXT NOT NULL DEFAULT 'aguardando',
     comprovante_url TEXT,
     criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  `CREATE INDEX IF NOT EXISTS idx_op_reembolso ON oportunidade_reembolso (oportunidade_id)`,
  `CREATE TABLE IF NOT EXISTS oportunidade_valor_log (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     oportunidade_id UUID NOT NULL REFERENCES oportunidade(id) ON DELETE CASCADE,
     de_cents INT, para_cents INT, motivo TEXT, usuario_id UUID,
     criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  `CREATE INDEX IF NOT EXISTS idx_op_valorlog ON oportunidade_valor_log (oportunidade_id)`,
  // Dispensa pessoal de oportunidade (técnico "recusa" uma oportunidade aberta geral)
  `CREATE TABLE IF NOT EXISTS oportunidade_recusa (
     oportunidade_id UUID NOT NULL REFERENCES oportunidade(id) ON DELETE CASCADE,
     tecnico_id UUID NOT NULL,
     motivo TEXT,
     criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     PRIMARY KEY (oportunidade_id, tecnico_id))`,
  // Fechamento semanal de pagamentos
  `ALTER TABLE oportunidade ADD COLUMN IF NOT EXISTS pago_em TIMESTAMPTZ`,
  `ALTER TABLE oportunidade ADD COLUMN IF NOT EXISTS lote_id UUID`,
  `ALTER TABLE oportunidade_reembolso ADD COLUMN IF NOT EXISTS pago_em TIMESTAMPTZ`,
  `ALTER TABLE oportunidade_reembolso ADD COLUMN IF NOT EXISTS lote_id UUID`,
  `CREATE TABLE IF NOT EXISTS pagamento_lote (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     tecnico_id UUID NOT NULL,
     referencia TEXT,
     total_servicos_cents INT NOT NULL DEFAULT 0,
     total_reembolsos_cents INT NOT NULL DEFAULT 0,
     total_cents INT NOT NULL DEFAULT 0,
     observacao TEXT,
     criado_por UUID,
     criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  `CREATE INDEX IF NOT EXISTS idx_pag_lote_tec ON pagamento_lote (tecnico_id, criado_em DESC)`,
];
