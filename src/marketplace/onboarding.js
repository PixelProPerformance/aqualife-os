import { sellerIdValido } from './authorization.js';
import { cnpjValido, perfilValido, TERMS_VERSION } from './validation.js';

const fail=(status,message)=>{const e=new Error(message);e.status=status;throw e;};
export function registrarOnboarding({app,query,withTransaction,exigeLogin,exigeAdmin}) {
 const wrap=fn=>async(req,res)=>{res.set('Cache-Control','no-store');try{await fn(req,res);}catch(e){
  if(e.code==='23505')return res.status(409).json({erro:'Cadastro já existente'});
  if(e.status)return res.status(e.status).json({erro:e.message});
  console.error('[marketplace]',e.code||'internal');res.status(500).json({erro:'Não foi possível concluir a operação'});
 }};
 // A autorização ocorre novamente dentro da transação, sob lock, antes de qualquer escrita.
 async function scope(c,req,{owner=false,write=false}={}) {
  const id=req.params.sellerId;
  if(!sellerIdValido(id))fail(400,'Loja inválida');
  const {rows}=await c.query(`SELECT s.*,su.role FROM marketplace_seller s
   JOIN marketplace_seller_user su ON su.seller_id=s.id
   WHERE s.id=$1 AND su.user_id=$2 AND su.active=true
   ${write?'FOR UPDATE OF s,su':''}`,[id,req.usuario.id]);
  const s=rows[0];if(!s||(owner&&s.role!=='owner'))fail(403,'Acesso restrito à loja');
  if(write&&(s.is_platform_owned||s.status==='suspended'))fail(403,'Loja bloqueada para alterações');
  return s;
 }
 const read={query};
 const audit=(c,id,user,action,metadata={})=>c.query(`INSERT INTO marketplace_audit_log
  (seller_id,actor_user_id,action,resource_type,resource_id,metadata)
  VALUES($1,$2,$3,'seller',$1,$4::jsonb)`,[id,user,action,JSON.stringify(metadata)]);
 async function saveProfile(c,id,p) {
  await c.query(`UPDATE marketplace_seller SET legal_name=$2,trade_name=$3,updated_at=now() WHERE id=$1`,[id,p.legal_name,p.trade_name]);
  await c.query(`INSERT INTO marketplace_seller_profile(seller_id,contact_name,contact_email,contact_phone,terms_version)
   VALUES($1,$2,$3,$4,$5) ON CONFLICT(seller_id) DO UPDATE SET
   contact_name=$2,contact_email=$3,contact_phone=$4,terms_version=$5,terms_accepted_at=now(),
   revision=marketplace_seller_profile.revision+1,review_note='',reviewed_by=null,reviewed_at=null,updated_at=now()`,
   [id,p.contact_name,p.contact_email,p.contact_phone,TERMS_VERSION]);
  await c.query('UPDATE marketplace_seller_address SET is_default=false WHERE seller_id=$1 AND is_default=true',[id]);
  // Reuse the address row so edits do not accumulate personal data.
  const existing=await c.query('SELECT id FROM marketplace_seller_address WHERE seller_id=$1 ORDER BY created_at LIMIT 1',[id]);
  if(existing.rows[0])await c.query(`UPDATE marketplace_seller_address SET zip_code=$2,street=$3,number=$4,city=$5,state=$6,is_default=true WHERE id=$1`,[existing.rows[0].id,p.zip_code,p.street,p.number,p.city,p.state]);
  else await c.query(`INSERT INTO marketplace_seller_address(seller_id,zip_code,street,number,city,state,is_default) VALUES($1,$2,$3,$4,$5,$6,true)`,[id,p.zip_code,p.street,p.number,p.city,p.state]);
 }
 app.post('/api/marketplace/sellers/apply',exigeLogin,wrap(async(req,res)=>{
  const p=perfilValido(req.body);
  if(!p||!cnpjValido(req.body?.cnpj)||req.body?.terms_version!==TERMS_VERSION||req.body?.terms_accepted!==true)fail(400,'Preencha empresa, CNPJ, contato, endereço e aceite os termos');
  const seller=await withTransaction(async c=>{
   // Serialize applications per account; avoids concurrent quota bypass.
   await c.query('SELECT id FROM app_user WHERE id=$1 FOR UPDATE',[req.usuario.id]);
   const count=await c.query(`SELECT count(*)::int AS n FROM marketplace_seller_user WHERE user_id=$1 AND role='owner' AND active=true`,[req.usuario.id]);
   if(count.rows[0].n>=3)fail(429,'Limite de três lojas por conta. Contate o suporte.');
   const s=(await c.query(`INSERT INTO marketplace_seller(legal_name,trade_name,cnpj,status) VALUES($1,$2,$3,'pending') RETURNING id,status,trade_name`,[p.legal_name,p.trade_name,req.body.cnpj.replace(/\D/g,'')])).rows[0];
   await c.query(`INSERT INTO marketplace_seller_user(seller_id,user_id,role) VALUES($1,$2,'owner')`,[s.id,req.usuario.id]);
   await c.query('INSERT INTO marketplace_seller_settings(seller_id,accepting_orders) VALUES($1,false)',[s.id]);
   await saveProfile(c,s.id,p);await audit(c,s.id,req.usuario.id,'seller_applied',{terms_version:TERMS_VERSION});return s;
  });res.status(201).json(seller);
 }));
 app.get('/api/marketplace/my-sellers',exigeLogin,wrap(async(req,res)=>{
  res.json((await query(`SELECT s.id,s.trade_name,s.status,su.role FROM marketplace_seller_user su JOIN marketplace_seller s ON s.id=su.seller_id WHERE su.user_id=$1 AND su.active=true ORDER BY s.created_at DESC`,[req.usuario.id])).rows);
 }));
 app.get('/api/marketplace/sellers/:sellerId/profile',exigeLogin,wrap(async(req,res)=>{
  const s=await scope(read,req);const p=(await query('SELECT * FROM marketplace_seller_profile WHERE seller_id=$1',[s.id])).rows[0]||{};
  const address=(await query('SELECT zip_code,street,number,city,state FROM marketplace_seller_address WHERE seller_id=$1 AND is_default=true',[s.id])).rows[0]||{};
  res.json({...s,...p,...address,terms_version:TERMS_VERSION});
 }));
 app.patch('/api/marketplace/sellers/:sellerId/profile',exigeLogin,wrap(async(req,res)=>{
  const p=perfilValido(req.body);if(!p||req.body?.terms_version!==TERMS_VERSION||req.body?.terms_accepted!==true)fail(400,'Dados incompletos ou termos não aceitos');
  await withTransaction(async c=>{
   const s=await scope(c,req,{owner:true,write:true});
   if(!['pending','rejected'].includes(s.status))fail(409,'Somente cadastros pendentes ou rejeitados podem ser corrigidos');
   await saveProfile(c,s.id,p);await c.query(`UPDATE marketplace_seller SET status='pending' WHERE id=$1`,[s.id]);
   await audit(c,s.id,req.usuario.id,'seller_resubmitted',{terms_version:TERMS_VERSION});
  });res.json({ok:true,status:'pending'});
 }));
 app.get('/api/marketplace/sellers/:sellerId/dashboard',exigeLogin,wrap(async(req,res)=>{
  const s=await scope(read,req);
  const offers=await query('SELECT count(*)::int AS n FROM marketplace_offer WHERE seller_id=$1',[s.id]);
  const orders=await query('SELECT count(*)::int AS n FROM marketplace_seller_order WHERE seller_id=$1',[s.id]);
  res.json({seller_id:s.id,status:s.status,role:s.role,offers:offers.rows[0].n,orders:orders.rows[0].n,accepting_orders:false,publication_enabled:false,payment_connection:'not_configured',logistics_connection:'not_configured'});
 }));
 for(const [module,sql] of Object.entries({
  offers:`SELECT o.id,o.seller_sku,o.price_cents,o.status,p.title,i.available_qty,i.reserved_qty FROM marketplace_offer o JOIN marketplace_catalog_product p ON p.id=o.catalog_product_id LEFT JOIN marketplace_offer_inventory i ON i.offer_id=o.id WHERE o.seller_id=$1 ORDER BY o.created_at DESC LIMIT 100`,
  orders:`SELECT id,state,currency,subtotal_cents,shipping_cents,created_at FROM marketplace_seller_order WHERE seller_id=$1 ORDER BY created_at DESC LIMIT 100`,
  activity:`SELECT action,metadata,created_at FROM marketplace_audit_log WHERE seller_id=$1 ORDER BY id DESC LIMIT 100`,
  members:`SELECT su.user_id,u.name,u.email,su.role,su.active FROM marketplace_seller_user su JOIN app_user u ON u.id=su.user_id WHERE su.seller_id=$1 ORDER BY su.created_at`
 }))app.get(`/api/marketplace/sellers/:sellerId/${module}`,exigeLogin,wrap(async(req,res)=>{
  const s=await scope(read,req,{owner:module==='members'});res.json((await query(sql,[s.id])).rows);
 }));
 app.post('/api/marketplace/sellers/:sellerId/members',exigeLogin,wrap(async(req,res)=>{
  const email=typeof req.body?.email==='string'?req.body.email.trim().toLowerCase():'';
  if(!email||email.length>180||req.body?.role!=='staff')fail(400,'Informe o e-mail de uma conta existente e papel staff');
  await withTransaction(async c=>{
   const s=await scope(c,req,{owner:true,write:true});if(s.status!=='approved')fail(403,'Aguarde a aprovação para gerir a equipe');
   const u=(await c.query('SELECT id FROM app_user WHERE lower(email)=$1 AND ativo=true',[email])).rows[0];
   if(!u)fail(400,'Não foi possível adicionar essa conta');
   const member=(await c.query('SELECT role FROM marketplace_seller_user WHERE seller_id=$1 AND user_id=$2',[s.id,u.id])).rows[0];
   if(member?.role==='owner')fail(409,'O proprietário não pode ser alterado por este fluxo');
   await c.query(`INSERT INTO marketplace_seller_user(seller_id,user_id,role) VALUES($1,$2,'staff') ON CONFLICT(seller_id,user_id) DO UPDATE SET active=true`,[s.id,u.id]);
   await audit(c,s.id,req.usuario.id,'staff_added',{user_id:u.id});
  });res.status(201).json({ok:true});
 }));
 app.patch('/api/marketplace/sellers/:sellerId/members/:userId',exigeLogin,wrap(async(req,res)=>{
  if(!sellerIdValido(req.params.userId)||req.body?.active!==false)fail(400,'Operação inválida');
  await withTransaction(async c=>{
   const s=await scope(c,req,{owner:true,write:true});if(s.status!=='approved')fail(403,'Loja não aprovada');
   const result=await c.query(`UPDATE marketplace_seller_user SET active=false WHERE seller_id=$1 AND user_id=$2 AND role='staff' RETURNING user_id`,[s.id,req.params.userId]);
   if(!result.rows[0])fail(404,'Funcionário não encontrado');
   await audit(c,s.id,req.usuario.id,'staff_removed',{user_id:req.params.userId});
  });res.json({ok:true});
 }));
 // Explicit server-side gate. Approval never activates trade, payments or shipping.
 for(const method of ['post','patch'])app[method]('/api/marketplace/sellers/:sellerId/offers/:offerId/publish',exigeLogin,wrap(async(req,res)=>{
  await scope(read,req,{owner:true});fail(409,'Publicação indisponível nesta fase; pagamentos e expedição não estão integrados');
 }));
 const admin=[exigeLogin,exigeAdmin];
 app.get('/api/admin/marketplace/sellers',...admin,wrap(async(req,res)=>{
  res.json((await query(`SELECT s.*,p.contact_name,p.contact_email,p.contact_phone,p.review_note,p.revision,p.terms_version,p.terms_accepted_at,a.zip_code,a.street,a.number,a.city,a.state
   FROM marketplace_seller s LEFT JOIN marketplace_seller_profile p ON p.seller_id=s.id LEFT JOIN marketplace_seller_address a ON a.seller_id=s.id AND a.is_default=true
   ORDER BY s.created_at DESC LIMIT 300`)).rows);
 }));
 app.patch('/api/admin/marketplace/sellers/:sellerId/status',...admin,wrap(async(req,res)=>{
  const {status,revision,expected_status}=req.body||{};const note=typeof req.body?.note==='string'?req.body.note.trim():'';
  if(!sellerIdValido(req.params.sellerId)||!['approved','rejected','suspended'].includes(status)||!note||note.length>1000||!Number.isInteger(revision))fail(400,'Informe decisão, motivo e revisão do cadastro');
  await withTransaction(async c=>{
   const s=(await c.query('SELECT * FROM marketplace_seller WHERE id=$1 FOR UPDATE',[req.params.sellerId])).rows[0];
   if(!s||s.is_platform_owned)fail(404,'Cadastro externo não encontrado');
   const p=(await c.query('SELECT * FROM marketplace_seller_profile WHERE seller_id=$1 FOR UPDATE',[s.id])).rows[0];
   if(!p||p.revision!==revision||s.status!==expected_status)fail(409,'Cadastro alterado; atualize a revisão');
   if(status==='approved'&&(!cnpjValido(s.cnpj)||p.terms_version!==TERMS_VERSION||req.body.fiscal_checked!==true||req.body.contact_checked!==true||req.body.address_checked!==true))fail(400,'Confirme a revisão fiscal, do contato e do endereço');
   const address=(await c.query('SELECT id FROM marketplace_seller_address WHERE seller_id=$1 AND is_default=true',[s.id])).rows[0];
   if(status==='approved'&&!address)fail(400,'Endereço obrigatório');
   const allowed={pending:['approved','rejected'],approved:['suspended'],rejected:[],suspended:['approved','rejected']};
   if(!allowed[s.status].includes(status))fail(409,'Transição de estado inválida');
   await c.query('UPDATE marketplace_seller SET status=$2,updated_at=now() WHERE id=$1',[s.id,status]);
   await c.query('UPDATE marketplace_seller_profile SET review_note=$2,reviewed_by=$3,reviewed_at=now(),revision=revision+1 WHERE seller_id=$1',[s.id,note,req.usuario.id]);
   await c.query('UPDATE marketplace_seller_settings SET accepting_orders=false,updated_at=now() WHERE seller_id=$1',[s.id]);
   if(status!=='approved')await c.query(`UPDATE marketplace_offer SET status='suspended' WHERE seller_id=$1 AND status='active'`,[s.id]);
   await audit(c,s.id,req.usuario.id,'seller_status_changed',{from:s.status,status,note,fiscal_checked:req.body.fiscal_checked===true,contact_checked:req.body.contact_checked===true,address_checked:req.body.address_checked===true});
  });res.json({ok:true,status,accepting_orders:false});
 }));
}
