// Marketplace Fase 2: onboarding privado. Nenhuma alteração ao checkout legado.
import { criarAutorizacaoSeller, sellerIdValido } from './authorization.js';

export function registrarOnboarding({app,query,withTransaction,exigeLogin,exigeAdmin}) {
 const {exigeVendedor}=criarAutorizacaoSeller(query);
 const admin=[exigeLogin,exigeAdmin];
 const texto=(v,max)=>typeof v==='string'?v.trim().slice(0,max):'';
 // Valida estrutura e dígitos verificadores; não confirma situação fiscal na Receita Federal.
 function cnpjValido(input){
  const s=String(input||'').replace(/\D/g,'');
  if(!/^\d{14}$/.test(s)||/^(\d)\1{13}$/.test(s))return false;
  for(const n of [12,13]){
   let weight=n===12?5:6,sum=0;
   for(let i=0;i<n;i++){sum+=Number(s[i])*weight;weight=weight===2?9:weight-1;}
   const rem=sum%11,d=rem<2?0:11-rem;
   if(Number(s[n])!==d)return false;
  }
  return true;
 }
 app.post('/api/marketplace/sellers/apply',exigeLogin,async(req,res)=>{
  const legal=texto(req.body?.legal_name,180),trade=texto(req.body?.trade_name,160);
  const cnpj=String(req.body?.cnpj||'').replace(/\D/g,'');
  if(!legal||!trade||!cnpjValido(cnpj))return res.status(400).json({erro:'Empresa ou CNPJ inválido'});
  try{
   const result=await withTransaction(async c=>{
    const seller=(await c.query(`INSERT INTO marketplace_seller(legal_name,trade_name,cnpj,status)
       VALUES($1,$2,$3,'pending') RETURNING id,status,trade_name`,[legal,trade,cnpj])).rows[0];
    await c.query(`INSERT INTO marketplace_seller_user(seller_id,user_id,role)
       VALUES($1,$2,'owner')`,[seller.id,req.usuario.id]);
    await c.query(`INSERT INTO marketplace_seller_settings(seller_id,accepting_orders)
       VALUES($1,false)`,[seller.id]);
    await c.query(`INSERT INTO marketplace_audit_log(seller_id,actor_user_id,action,resource_type,resource_id)
       VALUES($1,$2,'seller_applied','seller',$1)`,[seller.id,req.usuario.id]);
    return seller;
   });
   res.status(201).json(result);
  }catch(err){if(err.code==='23505')return res.status(409).json({erro:'CNPJ já cadastrado'});console.error('[marketplace/apply]',err.code||'erro');res.status(500).json({erro:'Falha ao cadastrar loja'});}
 });
 app.get('/api/marketplace/my-sellers',exigeLogin,async(req,res)=>{
  try{
   const rows=(await query(`SELECT s.id,s.trade_name,s.status,su.role
      FROM marketplace_seller_user su JOIN marketplace_seller s ON s.id=su.seller_id
      WHERE su.user_id=$1 AND su.active=true ORDER BY s.created_at DESC`,[req.usuario.id])).rows;
   res.json(rows);
  }catch{res.status(500).json({erro:'Erro ao listar lojas'});}
 });
 app.get('/api/admin/marketplace/sellers',...admin,async(req,res)=>{
  try{
   const rows=(await query(`SELECT id,trade_name,legal_name,cnpj,status,created_at
     FROM marketplace_seller ORDER BY created_at DESC LIMIT 300`)).rows;
   res.json(rows);
  }catch{res.status(500).json({erro:'Erro ao listar cadastros'});}
 });
 app.patch('/api/admin/marketplace/sellers/:sellerId/status',...admin,async(req,res)=>{
  const status=req.body?.status;
  if(!['approved','rejected','suspended'].includes(status))return res.status(400).json({erro:'Estado inválido'});
  if(!sellerIdValido(req.params.sellerId))return res.status(400).json({erro:'Loja inválida'});
  try{
   const data=await withTransaction(async c=>{
    const r=await c.query(`UPDATE marketplace_seller SET status=$2,updated_at=NOW()
       WHERE id=$1 AND is_platform_owned=false RETURNING id,status`,[req.params.sellerId,status]);
    const seller=r.rows[0];if(!seller)return null;
    await c.query(`UPDATE marketplace_seller_settings SET accepting_orders=false,updated_at=NOW()
       WHERE seller_id=$1`,[seller.id]);
    await c.query(`INSERT INTO marketplace_audit_log(seller_id,actor_user_id,action,resource_type,resource_id,metadata)
       VALUES($1,$2,'seller_status_changed','seller',$1,jsonb_build_object('status',$3::text))`,
       [seller.id,req.usuario.id,status]);
    return seller;
   });
   if(!data)return res.status(404).json({erro:'Loja não encontrada'});
   res.json(data);
  }catch{res.status(500).json({erro:'Erro ao atualizar loja'});}
 });
 app.get('/api/marketplace/sellers/:sellerId/dashboard',exigeLogin,exigeVendedor(),async(req,res)=>{
  try{
   const sellerId=req.marketplaceSellerId;
   const [offers,orders]=await Promise.all([
    query('SELECT COUNT(*)::int AS n FROM marketplace_offer WHERE seller_id=$1',[sellerId]),
    query('SELECT COUNT(*)::int AS n FROM marketplace_seller_order WHERE seller_id=$1',[sellerId])
   ]);
   res.json({seller_id:sellerId,offers:Number(offers.rows[0].n),orders:Number(orders.rows[0].n),payment_connection:'not_configured',logistics_connection:'not_configured'});
  }catch{res.status(500).json({erro:'Erro no painel'});}
 });
}
