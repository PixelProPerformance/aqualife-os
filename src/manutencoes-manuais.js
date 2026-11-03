// Pacotes manuais: não contabiliza agendamentos nem debita por leituras automáticas.
const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const uuid=v=>typeof v==='string'&&UUID_RE.test(v);
const txt=(v,max=250)=>typeof v==='string'?v.trim().slice(0,max):'';
const dataValida=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v+'T12:00:00Z'))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;
function linkValido(v){
 if(typeof v!=='string'||v.length>2048||!v.trim())return false;
 const link=v.trim();
 if(link.startsWith('/')&&!link.startsWith('//')&&!link.includes('\\')) return true;
 try {const u=new URL(link);return u.protocol==='https:'&&!!u.hostname&&!u.username&&!u.password;}
 catch{return false;}
}
export function registrarManutencoesManuais({app,query,withTransaction,exigeLogin,exigeAdmin}){
 const admin=[exigeLogin,exigeAdmin];
 async function resumo(orgId){
  const pacotes=(await query(`SELECT p.id,p.organization_id,p.descricao,p.total_visitas,p.criado_em,
     (SELECT COUNT(*)::int FROM manutencao_uso_manual u WHERE u.pacote_id=p.id AND u.anulado_em IS NULL) AS utilizadas
     FROM manutencao_pacote_manual p WHERE p.organization_id=$1 AND p.ativo=true
     ORDER BY p.criado_em DESC`,[orgId])).rows.map(p=>({...p,utilizadas:Number(p.utilizadas),restantes:Math.max(0,p.total_visitas-Number(p.utilizadas))}));
  const usos=(await query(`SELECT u.id,u.pacote_id,u.data_visita,u.relatorio_url,u.observacao
     FROM manutencao_uso_manual u JOIN manutencao_pacote_manual p ON p.id=u.pacote_id
     WHERE u.organization_id=$1 AND p.organization_id=$1 AND p.ativo=true AND u.anulado_em IS NULL
     ORDER BY u.data_visita DESC,u.criado_em DESC LIMIT 300`,[orgId])).rows;
  return {tipo:pacotes.length?'pacote':'avulsa',pacotes,usos};
 }
 app.get('/api/cliente/manutencoes',exigeLogin,async(req,res)=>{
  try{res.json(await resumo(req.usuario.organization_id));}
  catch(e){console.error('[manutencoes/cliente]',e.code||e.message);res.status(500).json({erro:'Não foi possível carregar o pacote'});}
 });
 app.get('/api/admin/clientes/:orgId/manutencoes',...admin,async(req,res)=>{
  if(!uuid(req.params.orgId))return res.status(400).json({erro:'Cliente inválido'});
  try{res.json(await resumo(req.params.orgId));}
  catch(e){res.status(500).json({erro:'Não foi possível carregar as manutenções'});}
 });
 app.post('/api/admin/clientes/:orgId/manutencoes/pacotes',...admin,async(req,res)=>{
  const org=req.params.orgId,total=Number(req.body?.total_visitas),descricao=txt(req.body?.descricao,160)||'Pacote de manutenção';
  if(!uuid(org)||!Number.isInteger(total)||total<1||total>10000)return res.status(400).json({erro:'Informe um total de visitas válido'});
  try{
   const result=await withTransaction(async c=>{
    const exists=(await c.query("SELECT id FROM organization WHERE id=$1 AND type!='provider'",[org])).rows[0];
    if(!exists)return null;
    return (await c.query(`INSERT INTO manutencao_pacote_manual(organization_id,descricao,total_visitas,criado_por)
      VALUES($1,$2,$3,$4) RETURNING id,descricao,total_visitas`,[org,descricao,total,req.usuario.id])).rows[0];
   });
   if(!result)return res.status(404).json({erro:'Cliente não encontrado'});
   res.status(201).json(result);
  }catch(e){res.status(500).json({erro:'Erro ao criar pacote'});}
 });
 app.patch('/api/admin/clientes/:orgId/manutencoes/pacotes/:pacoteId',...admin,async(req,res)=>{
  const total=Number(req.body?.total_visitas),org=req.params.orgId,pid=req.params.pacoteId;
  if(!uuid(org)||!uuid(pid)||!Number.isInteger(total)||total<1||total>10000)return res.status(400).json({erro:'Total inválido'});
  try{
   const result=await withTransaction(async c=>{
    const p=(await c.query('SELECT id,total_visitas FROM manutencao_pacote_manual WHERE id=$1 AND organization_id=$2 AND ativo=true FOR UPDATE',[pid,org])).rows[0];
    if(!p)return {erro:'Pacote não encontrado',code:404};
    const used=Number((await c.query('SELECT COUNT(*)::int AS n FROM manutencao_uso_manual WHERE pacote_id=$1 AND anulado_em IS NULL',[pid])).rows[0].n);
    if(total<used)return {erro:'Total não pode ser inferior às visitas utilizadas',code:409};
    return (await c.query('UPDATE manutencao_pacote_manual SET total_visitas=$3 WHERE id=$1 AND organization_id=$2 RETURNING id,total_visitas',[pid,org,total])).rows[0];
   });
   if(result.code)return res.status(result.code).json({erro:result.erro});
   res.json(result);
  }catch{res.status(500).json({erro:'Erro ao ajustar o pacote'});}
 });
 app.post('/api/admin/clientes/:orgId/manutencoes/pacotes/:pacoteId/usos',...admin,async(req,res)=>{
  const org=req.params.orgId,pid=req.params.pacoteId,date=req.body?.data_visita,url=txt(req.body?.relatorio_url,2048),note=txt(req.body?.observacao,500);
  if(!uuid(org)||!uuid(pid)||!dataValida(date)||!linkValido(url))return res.status(400).json({erro:'Informe data válida e link HTTPS ou caminho interno do relatório'});
  try{
   const result=await withTransaction(async c=>{
    const p=(await c.query('SELECT id,total_visitas FROM manutencao_pacote_manual WHERE id=$1 AND organization_id=$2 AND ativo=true FOR UPDATE',[pid,org])).rows[0];
    if(!p)return {erro:'Pacote não encontrado',code:404};
    const n=Number((await c.query('SELECT COUNT(*)::int AS n FROM manutencao_uso_manual WHERE pacote_id=$1 AND anulado_em IS NULL',[pid])).rows[0].n);
    if(n>=p.total_visitas)return {erro:'Pacote sem visitas disponíveis',code:409};
    return (await c.query(`INSERT INTO manutencao_uso_manual
     (pacote_id,organization_id,data_visita,relatorio_url,observacao,criado_por)
     VALUES($1,$2,$3,$4,$5,$6) RETURNING id,data_visita,relatorio_url`,[pid,org,date,url,note||null,req.usuario.id])).rows[0];
   });
   if(result.code)return res.status(result.code).json({erro:result.erro});
   res.status(201).json(result);
  }catch(e){res.status(500).json({erro:'Erro ao lançar manutenção'});}
 });
 app.delete('/api/admin/clientes/:orgId/manutencoes/pacotes/:pacoteId/usos/:usoId',...admin,async(req,res)=>{
  const {orgId,pacoteId,usoId}=req.params;
  if(![orgId,pacoteId,usoId].every(uuid))return res.status(400).json({erro:'Identificador inválido'});
  try{
   const r=await query(`UPDATE manutencao_uso_manual u SET anulado_em=NOW(),anulado_por=$4
     WHERE u.id=$1 AND u.pacote_id=$2 AND u.organization_id=$3 AND u.anulado_em IS NULL
       AND EXISTS(SELECT 1 FROM manutencao_pacote_manual p WHERE p.id=u.pacote_id AND p.organization_id=$3)
     RETURNING u.id`,[usoId,pacoteId,orgId,req.usuario.id]);
   if(!r.rows[0])return res.status(404).json({erro:'Lançamento não encontrado'});
   res.json({ok:true});
  }catch{res.status(500).json({erro:'Erro ao anular lançamento'});}
 });
}
