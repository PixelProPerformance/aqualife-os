// Calendário de manutenção: API isolada, sem modificar o fluxo de cobrança existente.
export const CALENDAR_SCHEMA = [
`CREATE TABLE IF NOT EXISTS manutencao_pacote (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id UUID NOT NULL REFERENCES organization(id),
 user_id UUID NOT NULL REFERENCES app_user(id),
 descricao TEXT NOT NULL,
 total_visitas INT NOT NULL CHECK (total_visitas > 0),
 status_pagamento TEXT NOT NULL DEFAULT 'pendente' CHECK (status_pagamento IN ('pendente','em_dia','atrasado')),
 ativo BOOLEAN NOT NULL DEFAULT true,
 criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`,
`CREATE INDEX IF NOT EXISTS idx_manutencao_pacote_user ON manutencao_pacote (user_id,ativo)`,
`CREATE TABLE IF NOT EXISTS manutencao_agenda (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id UUID NOT NULL REFERENCES organization(id),
 user_id UUID NOT NULL REFERENCES app_user(id),
 pacote_id UUID REFERENCES manutencao_pacote(id),
 inicio TIMESTAMPTZ NOT NULL,
 estado TEXT NOT NULL DEFAULT 'pre_agendada' CHECK (estado IN ('pre_agendada','confirmada','realizada','cancelada')),
 leitura_id UUID UNIQUE REFERENCES reading(id),
 troca_solicitada TIMESTAMPTZ,
 troca_motivo TEXT,
 criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`,
`CREATE INDEX IF NOT EXISTS idx_manutencao_agenda_user ON manutencao_agenda(user_id,inicio)`
];
const VALORES = ['pre_agendada','confirmada','realizada','cancelada'];
const uid = x => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(x||''));
const okDate = x => {const d=new Date(x);return Number.isFinite(d.getTime())?d:null;};
const escapeHtml = s => String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function registrarCalendario({app,query,withTransaction,exigeLogin,exigeAdmin,enviarEmail}) {
 const admin = [exigeLogin,exigeAdmin];
 app.get('/api/manutencao/resumo',exigeLogin,async(req,res)=>{
  try {
   const packs=(await query(`SELECT p.id,p.descricao,p.total_visitas,p.status_pagamento,
      (SELECT COUNT(*)::int FROM manutencao_agenda a WHERE a.pacote_id=p.id AND a.estado='realizada' AND a.leitura_id IS NOT NULL) AS gastas
      FROM manutencao_pacote p WHERE p.user_id=$1 AND p.organization_id=$2 AND p.ativo=true ORDER BY p.criado_em DESC`,[req.usuario.id,req.usuario.organization_id])).rows;
   const agenda=(await query(`SELECT a.id,a.inicio,a.estado,a.troca_solicitada,a.troca_motivo,p.descricao AS pacote
      FROM manutencao_agenda a LEFT JOIN manutencao_pacote p ON p.id=a.pacote_id
      WHERE a.user_id=$1 AND a.organization_id=$2 ORDER BY a.inicio ASC LIMIT 120`,[req.usuario.id,req.usuario.organization_id])).rows;
   res.json({pacotes:packs.map(p=>({...p,gastas:Number(p.gastas),restantes:Math.max(0,p.total_visitas-p.gastas)})),agenda});
  }catch(e){console.error('[calendario/resumo]',e.message);res.status(500).json({erro:'Erro ao carregar manutenções'});}
 });
 app.get('/api/admin/manutencao/clientes',...admin,async(req,res)=>{
  try{const r=await query(`SELECT id,name,email,organization_id FROM app_user WHERE ativo=true AND role IN ('cliente','aquarista') ORDER BY name LIMIT 1000`);res.json(r.rows);}
  catch(e){res.status(500).json({erro:'Erro ao carregar clientes'});}
 });
 app.get('/api/admin/manutencao/agenda',...admin,async(req,res)=>{
  try{const r=await query(`SELECT a.*,u.name AS cliente_nome,u.email AS cliente_email,p.descricao AS pacote,p.status_pagamento
       FROM manutencao_agenda a JOIN app_user u ON u.id=a.user_id LEFT JOIN manutencao_pacote p ON p.id=a.pacote_id
       ORDER BY a.inicio DESC LIMIT 500`);res.json(r.rows);}
  catch(e){res.status(500).json({erro:'Erro ao carregar calendário'});}
 });
 app.get('/api/admin/manutencao/pacotes',...admin,async(req,res)=>{
  try{const r=await query(`SELECT p.*,u.name AS cliente_nome,
     (SELECT COUNT(*)::int FROM manutencao_agenda a WHERE a.pacote_id=p.id AND a.estado='realizada' AND a.leitura_id IS NOT NULL) AS gastas
     FROM manutencao_pacote p JOIN app_user u ON u.id=p.user_id WHERE p.ativo=true ORDER BY p.criado_em DESC LIMIT 500`);res.json(r.rows);}
  catch(e){res.status(500).json({erro:'Erro ao carregar pacotes'});}
 });
 app.post('/api/admin/manutencao/pacotes',...admin,async(req,res)=>{
  const {user_id,descricao,total_visitas,status_pagamento}=req.body||{};
  const total=Number(total_visitas);
  if(!uid(user_id)||!String(descricao||'').trim()||!Number.isInteger(total)||total<1||total>100||!['pendente','em_dia','atrasado'].includes(status_pagamento))
   return res.status(400).json({erro:'Dados do pacote inválidos'});
  try{
   const r=await query(`INSERT INTO manutencao_pacote(organization_id,user_id,descricao,total_visitas,status_pagamento)
     SELECT organization_id,id,$2,$3,$4 FROM app_user WHERE id=$1 AND ativo=true AND role IN ('cliente','aquarista') RETURNING *`,
     [user_id,String(descricao).trim().slice(0,160),total,status_pagamento]);
   if(!r.rows[0])return res.status(404).json({erro:'Cliente não encontrado'});
   res.status(201).json(r.rows[0]);
  }catch(e){res.status(500).json({erro:'Erro ao criar pacote'});}
 });
 app.patch('/api/admin/manutencao/pacotes/:id',...admin,async(req,res)=>{
  const {status_pagamento}=req.body||{};
  if(!['pendente','em_dia','atrasado'].includes(status_pagamento))return res.status(400).json({erro:'Estado de pagamento inválido'});
  try{const r=await query('UPDATE manutencao_pacote SET status_pagamento=$2 WHERE id=$1 RETURNING *',[req.params.id,status_pagamento]);if(!r.rows[0])return res.status(404).json({erro:'Pacote não encontrado'});res.json(r.rows[0]);}
  catch(e){res.status(500).json({erro:'Erro ao atualizar pagamento'});}
 });
 app.post('/api/admin/manutencao/agenda',...admin,async(req,res)=>{
  const {user_id,pacote_id,inicio}=req.body||{};const d=okDate(inicio);
  if(!uid(user_id)||!d||d<=new Date()||(pacote_id&&!uid(pacote_id)))return res.status(400).json({erro:'Cliente, pacote ou data inválidos'});
  try {
   const r=await withTransaction(async c=>{
    const u=(await c.query('SELECT organization_id FROM app_user WHERE id=$1 AND ativo=true',[user_id])).rows[0];
    if(!u)return null;
    if(pacote_id){const p=(await c.query('SELECT id FROM manutencao_pacote WHERE id=$1 AND user_id=$2 AND organization_id=$3 AND ativo=true',[pacote_id,user_id,u.organization_id])).rows[0];if(!p)throw Object.assign(new Error('Pacote não pertence ao cliente'),{status:400});}
    return (await c.query(`INSERT INTO manutencao_agenda (organization_id,user_id,pacote_id,inicio) VALUES ($1,$2,$3,$4) RETURNING *`,
      [u.organization_id,user_id,pacote_id||null,d])).rows[0];
   });
   if(!r)return res.status(404).json({erro:'Cliente não encontrado'});
   res.status(201).json(r);
  }catch(e){res.status(e.status||500).json({erro:e.status?e.message:'Erro ao pré-agendar'});}
 });
 app.post('/api/manutencao/agenda/:id/troca',exigeLogin,async(req,res)=>{
  const d=okDate(req.body?.nova_data);
  if(!d||d<=new Date())return res.status(400).json({erro:'Escolha uma nova data futura'});
  try{
   const r=await query(`UPDATE manutencao_agenda SET troca_solicitada=$4,troca_motivo=$5,atualizado_em=NOW()
    WHERE id=$1 AND user_id=$2 AND organization_id=$3 AND estado IN ('pre_agendada','confirmada')
    AND inicio >= NOW()+INTERVAL '7 days'
    RETURNING id,inicio,troca_solicitada`,[req.params.id,req.usuario.id,req.usuario.organization_id,d,String(req.body?.motivo||'').slice(0,400)]);
   if(!r.rows[0])return res.status(409).json({erro:'Troca indisponível: solicite pelo menos 7 dias antes da visita'});
   res.json({ok:true,solicitacao:r.rows[0]});
  }catch(e){res.status(500).json({erro:'Erro ao pedir troca'});}
 });
 app.patch('/api/admin/manutencao/agenda/:id',...admin,async(req,res)=>{
  const {estado,inicio,leitura_id}=req.body||{};
  if(!VALORES.includes(estado))return res.status(400).json({erro:'Estado inválido'});
  const d=inicio?okDate(inicio):null;if(inicio&&!d)return res.status(400).json({erro:'Data inválida'});
  try{
   const r=await withTransaction(async c=>{
    const a=(await c.query('SELECT * FROM manutencao_agenda WHERE id=$1 FOR UPDATE',[req.params.id])).rows[0];if(!a)return null;
    if(estado==='confirmada'&&a.pacote_id){
     const p=(await c.query('SELECT status_pagamento FROM manutencao_pacote WHERE id=$1',[a.pacote_id])).rows[0];
     if(p?.status_pagamento!=='em_dia')throw Object.assign(new Error('Pagamento pendente: não pode confirmar'),{status:409});
    }
    if(estado==='realizada'){
      if(!uid(leitura_id))throw Object.assign(new Error('Informe o ID do laudo/visita realizada'),{status:400});
      const l=(await c.query('SELECT id FROM reading WHERE id=$1 AND organization_id=$2 AND asset_id IN (SELECT id FROM asset WHERE organization_id=$2)',[leitura_id,a.organization_id])).rows[0];
      if(!l)throw Object.assign(new Error('Laudo não pertence à organização'),{status:400});
      if(a.pacote_id){const p=(await c.query(`SELECT total_visitas FROM manutencao_pacote WHERE id=$1 FOR UPDATE`,[a.pacote_id])).rows[0];
       const used=(await c.query(`SELECT COUNT(*)::int AS n FROM manutencao_agenda WHERE pacote_id=$1 AND estado='realizada' AND leitura_id IS NOT NULL AND id<>$2`,[a.pacote_id,a.id])).rows[0].n;
       if(used>=p.total_visitas)throw Object.assign(new Error('Pacote sem visitas disponíveis'),{status:409});
      }
    }
    return (await c.query(`UPDATE manutencao_agenda SET estado=$2,inicio=COALESCE($3,inicio),leitura_id=$4,
     troca_solicitada=NULL,troca_motivo=NULL,atualizado_em=NOW() WHERE id=$1 RETURNING *`,
      [a.id,estado,d,estado==='realizada'?leitura_id:null])).rows[0];
   });
   if(!r)return res.status(404).json({erro:'Visita não encontrada'});res.json(r);
  }catch(e){res.status(e.status||500).json({erro:e.status?e.message:'Erro ao atualizar visita'});}
 });
 app.post('/api/admin/manutencao/agenda/:id/lembrete',...admin,async(req,res)=>{
  try{
   const r=(await query(`SELECT a.inicio,a.estado,u.name,u.email FROM manutencao_agenda a JOIN app_user u ON u.id=a.user_id WHERE a.id=$1`,[req.params.id])).rows[0];
   if(!r)return res.status(404).json({erro:'Visita não encontrada'});
   if(!['pre_agendada','confirmada'].includes(r.estado))return res.status(409).json({erro:'Visita sem agendamento ativo'});
   const quando=new Date(r.inicio).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'});
   const msg=await enviarEmail({para:r.email,assunto:'Aqualife — lembrete de visita pré-agendada',
    html:`<p>Olá, ${escapeHtml(r.name)}!</p><p>Tem uma visita <strong>pré-agendada</strong> para <strong>${escapeHtml(quando)} (horário de Brasília)</strong>.</p><p>O agendamento só será confirmado se o pagamento estiver em dia. Pode solicitar alteração pelo painel até 7 dias antes.</p>`});
   if(!msg?.ok)return res.status(502).json({erro:'E-mail não enviado. Verifique as integrações de e-mail'});
   res.json({ok:true});
  }catch(e){res.status(500).json({erro:'Erro ao enviar lembrete'});}
 });
}
