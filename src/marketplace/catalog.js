import {randomUUID} from 'node:crypto';
import {mkdir,writeFile,unlink} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import multer from 'multer';
import sharp from 'sharp';
import {sellerIdValido} from './authorization.js';
import {produtoValido,ofertaValida,textoCampo} from './catalog-validation.js';
const refuse=(status,message)=>{const error=new Error(message);error.status=status;throw error;};
const uuid=(v)=>{if(!sellerIdValido(v))refuse(400,'Identificador inválido');return v;};
const revision=v=>{if(!Number.isInteger(v)||v<1)refuse(400,'Informe a revisão atual');return v;};
export function registrarCatalogo({app,query,withTransaction,exigeLogin,exigeAdmin,rateLimit=()=>true,mediaDirectory=process.env.UPLOADS_DIR||fileURLToPath(new URL('../../public/uploads',import.meta.url))}){
 const read={query};
 const safe=fn=>async(req,res,next)=>{res.set('Cache-Control','no-store');try{await fn(req,res,next);}catch(e){
  if(e.code==='23505')return res.status(409).json({erro:'Registro ou SKU já existente'});
  if(e.status)return res.status(e.status).json({erro:e.message});
  console.error('[marketplace/catalog]',e.code||'internal');res.status(500).json({erro:'Não foi possível concluir a operação'});
 }};
 const limit=(req,operation,max=60)=>{if(!rateLimit(`marketplace:catalog:${operation}:${req.usuario.id}`,max,3600000))refuse(429,'Muitas tentativas; tente novamente mais tarde');};
 async function scope(c,req,write=false){
  const sellerId=uuid(req.params.sellerId);
  const s=(await c.query(`SELECT s.id,s.status,s.is_platform_owned,su.role FROM marketplace_seller s JOIN marketplace_seller_user su ON su.seller_id=s.id
   WHERE s.id=$1 AND su.user_id=$2 AND su.active=true ${write?'FOR UPDATE OF s,su':''}`,[sellerId,req.usuario.id])).rows[0];
  if(!s)refuse(403,'Acesso restrito à loja');
  if(write&&(s.role!=='owner'||s.status!=='approved'||s.is_platform_owned))refuse(403,'Alteração restrita ao proprietário de loja aprovada');
  return s;
 }
 async function audit(c,seller,user,action,type,id,metadata={}){
  await c.query(`INSERT INTO marketplace_audit_log(seller_id,actor_user_id,action,resource_type,resource_id,metadata) VALUES($1,$2,$3,$4,$5,$6::jsonb)`,[seller,user,action,type,id,JSON.stringify(metadata)]);
 }
 function pagination(req){const offset=Number(req.query.offset||0);if(!Number.isInteger(offset)||offset<0||offset>10000)refuse(400,'Página inválida');return offset;}
 async function ownAsset(c,seller,id){if(!id)return null;uuid(id);const a=(await c.query('SELECT id FROM marketplace_catalog_asset WHERE id=$1 AND seller_id=$2',[id,seller])).rows[0];if(!a)refuse(400,'Imagem não pertence à loja');return id;}
 async function submission(c,seller,id){const p=(await c.query('SELECT * FROM marketplace_catalog_submission WHERE id=$1 AND seller_id=$2 FOR UPDATE',[uuid(id),seller])).rows[0];if(!p)refuse(404,'Produto não encontrado');return p;}
 async function offer(c,seller,id){const p=(await c.query(`SELECT o.*,d.revision,d.variant_label FROM marketplace_offer o JOIN marketplace_offer_detail d ON d.offer_id=o.id AND d.seller_id=o.seller_id WHERE o.id=$1 AND o.seller_id=$2 FOR UPDATE OF o,d`,[uuid(id),seller])).rows[0];if(!p)refuse(404,'Oferta não encontrada ou legada');return p;}
 async function approvedProduct(c,id){const p=(await c.query(`SELECT id FROM marketplace_catalog_product WHERE id=$1 AND moderation_status='approved' FOR SHARE`,[uuid(id)])).rows[0];if(!p)refuse(409,'Produto não aprovado ou retirado do catálogo');return p;}
 function expected(p,body){if(p.revision!==revision(body?.revision))refuse(409,'Registro alterado; atualize a tela');}
 app.get('/api/marketplace/catalog/products',exigeLogin,safe(async(req,res)=>{
  const search=textoCampo(req.query.search??'',100);if(search===null)refuse(400,'Busca inválida');
  res.json((await query(`SELECT p.id,p.title,p.brand,p.model,p.gtin,d.description,d.category,
   CASE WHEN a.id IS NOT NULL THEN '/uploads/marketplace/'||a.storage_key END AS image_url
   FROM marketplace_catalog_product p LEFT JOIN marketplace_catalog_detail d ON d.catalog_product_id=p.id LEFT JOIN marketplace_catalog_asset a ON a.id=d.image_asset_id
   WHERE p.moderation_status='approved' AND ($1='' OR p.title ILIKE '%'||$1||'%' OR p.gtin=$1)
   ORDER BY p.created_at DESC,p.id LIMIT 100 OFFSET $2`,[search,pagination(req)])).rows);
 }));
 const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:5*1024*1024,files:1},fileFilter:(_,file,cb)=>cb(null,['image/jpeg','image/png','image/webp'].includes(file.mimetype))}).single('image');
 app.post('/api/marketplace/sellers/:sellerId/catalog/assets',exigeLogin,safe(async(req,res,next)=>{limit(req,'image',30);await scope(read,req,true);next();}),
  (req,res,next)=>upload(req,res,error=>error?res.status(400).json({erro:'Envie uma imagem JPEG, PNG ou WebP de até 5 MB'}):next()),safe(async(req,res)=>{
   if(!req.file)refuse(400,'Envie uma imagem JPEG, PNG ou WebP de até 5 MB');
   let buffer;try{
    const image=sharp(req.file.buffer,{limitInputPixels:16000000,animated:false});const meta=await image.metadata();
    if(!['jpeg','png','webp'].includes(meta.format)||meta.pages>1)refuse(400,'Imagem inválida');
    buffer=await image.rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).flatten({background:'#fff'}).jpeg({quality:82}).toBuffer();
   }catch{refuse(400,'Imagem inválida ou com resolução excessiva');}
   const key=randomUUID()+'.jpg',directory=path.join(mediaDirectory,'marketplace'),filename=path.join(directory,key);let committed=false,written=false;
   try{
    const asset=await withTransaction(async c=>{
     const s=await scope(c,req,true);const n=(await c.query('SELECT count(*)::int n FROM marketplace_catalog_asset WHERE seller_id=$1',[s.id])).rows[0].n;
     if(n>=1000)refuse(409,'Limite de imagens atingido; contate o suporte');
     await mkdir(directory,{recursive:true});await writeFile(filename,buffer,{flag:'wx'});written=true;
     const a=(await c.query('INSERT INTO marketplace_catalog_asset(seller_id,storage_key,bytes,actor_user_id) VALUES($1,$2,$3,$4) RETURNING id',[s.id,key,buffer.length,req.usuario.id])).rows[0];
     await audit(c,s.id,req.usuario.id,'catalog_image_uploaded','catalog_asset',a.id);return a;
    });committed=true;res.status(201).json({...asset,url:'/uploads/marketplace/'+key});
   }finally{if(written&&!committed)await unlink(filename).catch(()=>{});}
 }));
 app.get('/api/marketplace/sellers/:sellerId/catalog/submissions',exigeLogin,safe(async(req,res)=>{
  const s=await scope(read,req);res.json((await query(`SELECT p.*,cp.moderation_status AS catalog_status,d.withdrawal_note AS catalog_note,CASE WHEN a.id IS NOT NULL THEN '/uploads/marketplace/'||a.storage_key END AS image_url FROM marketplace_catalog_submission p LEFT JOIN marketplace_catalog_asset a ON a.id=p.image_asset_id AND a.seller_id=p.seller_id LEFT JOIN marketplace_catalog_product cp ON cp.id=p.catalog_product_id LEFT JOIN marketplace_catalog_detail d ON d.catalog_product_id=cp.id WHERE p.seller_id=$1 ORDER BY p.created_at DESC,p.id LIMIT 100 OFFSET $2`,[s.id,pagination(req)])).rows);
 }));
 app.post('/api/marketplace/sellers/:sellerId/catalog/submissions',exigeLogin,safe(async(req,res)=>{
  limit(req,'submission',30);const p=produtoValido(req.body);if(!p)refuse(400,'Confira título, descrição, categoria e GTIN');
  const result=await withTransaction(async c=>{
   const s=await scope(c,req,true);const count=(await c.query('SELECT count(*)::int n FROM marketplace_catalog_submission WHERE seller_id=$1',[s.id])).rows[0].n;if(count>=500)refuse(409,'Limite de produtos atingido; contate o suporte');
   const asset=await ownAsset(c,s.id,req.body.image_asset_id);
   const item=(await c.query(`INSERT INTO marketplace_catalog_submission(seller_id,title,description,category,brand,model,gtin,image_asset_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[s.id,p.title,p.description,p.category,p.brand,p.model,p.gtin||null,asset])).rows[0];
   await audit(c,s.id,req.usuario.id,'catalog_draft_created','catalog_submission',item.id);return item;
  });res.status(201).json(result);
 }));
 app.patch('/api/marketplace/sellers/:sellerId/catalog/submissions/:submissionId',exigeLogin,safe(async(req,res)=>{
  limit(req,'submission_edit');const p=produtoValido(req.body);if(!p)refuse(400,'Confira título, descrição, categoria e GTIN');
  const result=await withTransaction(async c=>{
   const s=await scope(c,req,true),old=await submission(c,s.id,req.params.submissionId);expected(old,req.body);
   if(!['draft','rejected'].includes(old.status))refuse(409,'Produto em análise ou aprovado não pode ser alterado');
   const asset=await ownAsset(c,s.id,req.body.image_asset_id);
   const r=await c.query(`UPDATE marketplace_catalog_submission SET title=$2,description=$3,category=$4,brand=$5,model=$6,gtin=$7,image_asset_id=$8,status='draft',review_note='',reviewed_by=null,reviewed_at=null,revision=revision+1,updated_at=now() WHERE id=$1 RETURNING *`,[old.id,p.title,p.description,p.category,p.brand,p.model,p.gtin||null,asset]);
   await audit(c,s.id,req.usuario.id,'catalog_draft_updated','catalog_submission',old.id,{revision:r.rows[0].revision});return r.rows[0];
  });res.json(result);
 }));
 app.post('/api/marketplace/sellers/:sellerId/catalog/submissions/:submissionId/submit',exigeLogin,safe(async(req,res)=>{
  limit(req,'submit',30);const result=await withTransaction(async c=>{
   const s=await scope(c,req,true),p=await submission(c,s.id,req.params.submissionId);expected(p,req.body);
   if(!['draft','rejected'].includes(p.status))refuse(409,'Produto já enviado ou aprovado');
   if(!p.image_asset_id||!produtoValido({...p,gtin:p.gtin||''}))refuse(400,'Complete os dados e envie uma imagem antes da análise');
   const r=await c.query(`UPDATE marketplace_catalog_submission SET status='pending',revision=revision+1,updated_at=now() WHERE id=$1 RETURNING *`,[p.id]);
   await audit(c,s.id,req.usuario.id,'catalog_submitted','catalog_submission',p.id,{revision:r.rows[0].revision});return r.rows[0];
  });res.json(result);
 }));
 app.get('/api/admin/marketplace/catalog/submissions',exigeLogin,exigeAdmin,safe(async(req,res)=>{
  const status=req.query.status||'pending';if(!['all','draft','pending','approved','rejected'].includes(status))refuse(400,'Estado inválido');
  res.json((await query(`SELECT p.*,s.trade_name,s.status AS seller_status,cp.moderation_status AS catalog_status,d.withdrawal_note AS catalog_note,CASE WHEN a.id IS NOT NULL THEN '/uploads/marketplace/'||a.storage_key END AS image_url FROM marketplace_catalog_submission p JOIN marketplace_seller s ON s.id=p.seller_id LEFT JOIN marketplace_catalog_asset a ON a.id=p.image_asset_id AND a.seller_id=p.seller_id LEFT JOIN marketplace_catalog_product cp ON cp.id=p.catalog_product_id LEFT JOIN marketplace_catalog_detail d ON d.catalog_product_id=cp.id WHERE ($1='all' OR p.status=$1) ORDER BY p.created_at,p.id LIMIT 100 OFFSET $2`,[status,pagination(req)])).rows);
 }));
 app.patch('/api/admin/marketplace/catalog/submissions/:submissionId/decision',exigeLogin,exigeAdmin,safe(async(req,res)=>{
  const {status}=req.body||{},note=textoCampo(req.body?.note,1000,{min:3});if(!['approved','rejected'].includes(status)||!note)refuse(400,'Informe decisão e motivo');
  const result=await withTransaction(async c=>{
   const id=uuid(req.params.submissionId),reference=(await c.query('SELECT seller_id FROM marketplace_catalog_submission WHERE id=$1',[id])).rows[0];if(!reference)refuse(404,'Produto não encontrado');
   // Lock seller first, as in seller mutations and suspension; prevents approval races.
   const seller=(await c.query('SELECT * FROM marketplace_seller WHERE id=$1 FOR UPDATE',[reference.seller_id])).rows[0];
   const p=await submission(c,seller.id,id);expected(p,req.body);if(p.status!=='pending')refuse(409,'Produto não está aguardando análise');
   let catalogId=null;
   if(status==='approved'){
    if(seller.status!=='approved'||seller.is_platform_owned||!p.image_asset_id)refuse(409,'Loja ou imagem não elegível para aprovação');
    if(req.body.catalog_product_id){catalogId=uuid(req.body.catalog_product_id);const existing=(await c.query(`SELECT id FROM marketplace_catalog_product WHERE id=$1 AND moderation_status='approved'`,[catalogId])).rows[0];if(!existing)refuse(400,'Produto compartilhado não aprovado');}
    else{
     if(p.gtin){await c.query('SELECT pg_advisory_xact_lock(hashtext($1))',['marketplace-gtin:'+p.gtin]);if((await c.query(`SELECT id FROM marketplace_catalog_product WHERE gtin=$1 AND moderation_status='approved'`,[p.gtin])).rows[0])refuse(409,'GTIN já aprovado; vincule ao produto existente');}
     catalogId=(await c.query(`INSERT INTO marketplace_catalog_product(title,brand,model,gtin,moderation_status) VALUES($1,$2,$3,$4,'approved') RETURNING id`,[p.title,p.brand,p.model,p.gtin])).rows[0].id;
     await c.query('INSERT INTO marketplace_catalog_detail(catalog_product_id,description,category,image_asset_id) VALUES($1,$2,$3,$4)',[catalogId,p.description,p.category,p.image_asset_id]);
    }
   }
   const r=await c.query('UPDATE marketplace_catalog_submission SET status=$2,review_note=$3,reviewed_by=$4,reviewed_at=now(),catalog_product_id=$5,revision=revision+1,updated_at=now() WHERE id=$1 RETURNING *',[p.id,status,note,req.usuario.id,catalogId]);
   await audit(c,seller.id,req.usuario.id,'catalog_reviewed','catalog_submission',p.id,{status,note,catalog_product_id:catalogId});return r.rows[0];
  });res.json(result);
 }));
 app.post('/api/admin/marketplace/catalog/products/:productId/withdraw',exigeLogin,exigeAdmin,safe(async(req,res)=>{
  const id=uuid(req.params.productId),note=textoCampo(req.body?.note,1000,{min:3});if(!note)refuse(400,'Informe o motivo da retirada');
  await withTransaction(async c=>{
   const p=(await c.query('SELECT * FROM marketplace_catalog_product WHERE id=$1 AND legacy_product_id IS NULL FOR UPDATE',[id])).rows[0];
   if(!p)refuse(404,'Produto novo não encontrado');if(p.moderation_status!=='approved')refuse(409,'Produto já retirado ou não aprovado');
   await c.query(`UPDATE marketplace_catalog_product SET moderation_status='rejected' WHERE id=$1`,[id]);
   await c.query('UPDATE marketplace_catalog_detail SET withdrawal_note=$2 WHERE catalog_product_id=$1',[id,note]);
   await c.query(`UPDATE marketplace_offer SET status='suspended' WHERE catalog_product_id=$1 AND legacy_variation_id IS NULL`,[id]);
   const sellers=(await c.query('SELECT DISTINCT seller_id FROM marketplace_offer WHERE catalog_product_id=$1 AND legacy_variation_id IS NULL',[id])).rows;
   for(const s of sellers)await audit(c,s.seller_id,req.usuario.id,'catalog_withdrawn','catalog_product',id,{note});
  });res.json({ok:true,moderation_status:'rejected',offers_suspended:true,commerce_enabled:false});
 }));
 app.get('/api/marketplace/sellers/:sellerId/catalog/offers',exigeLogin,safe(async(req,res)=>{
  const s=await scope(read,req);res.json((await query(`SELECT o.id,o.catalog_product_id,o.seller_sku,o.price_cents,o.status,p.title,p.moderation_status AS catalog_status,d.variant_label,d.revision,i.available_qty,i.reserved_qty FROM marketplace_offer o JOIN marketplace_catalog_product p ON p.id=o.catalog_product_id LEFT JOIN marketplace_offer_detail d ON d.offer_id=o.id AND d.seller_id=o.seller_id LEFT JOIN marketplace_offer_inventory i ON i.offer_id=o.id WHERE o.seller_id=$1 ORDER BY o.created_at DESC,o.id LIMIT 100 OFFSET $2`,[s.id,pagination(req)])).rows);
 }));
 app.post('/api/marketplace/sellers/:sellerId/catalog/offers',exigeLogin,safe(async(req,res)=>{
  limit(req,'offer',60);const p=ofertaValida(req.body);if(!p)refuse(400,'Confira SKU, variação e preço em centavos');
  const result=await withTransaction(async c=>{
   const s=await scope(c,req,true),catalog=uuid(req.body.catalog_product_id);await approvedProduct(c,catalog);
   if((await c.query('SELECT count(*)::int n FROM marketplace_offer WHERE seller_id=$1',[s.id])).rows[0].n>=1000)refuse(409,'Limite de ofertas atingido');
   const o=(await c.query(`INSERT INTO marketplace_offer(seller_id,catalog_product_id,seller_sku,price_cents,status) VALUES($1,$2,$3,$4,'draft') RETURNING *`,[s.id,catalog,p.seller_sku,p.price_cents])).rows[0];
   await c.query('INSERT INTO marketplace_offer_detail(offer_id,seller_id,variant_label) VALUES($1,$2,$3)',[o.id,s.id,p.variant_label]);await c.query('INSERT INTO marketplace_offer_inventory(offer_id) VALUES($1)',[o.id]);
   await audit(c,s.id,req.usuario.id,'offer_created','offer',o.id);return {...o,revision:1,available_qty:0,reserved_qty:0,variant_label:p.variant_label};
  });res.status(201).json(result);
 }));
 app.patch('/api/marketplace/sellers/:sellerId/catalog/offers/:offerId',exigeLogin,safe(async(req,res)=>{
  limit(req,'offer_edit');const p=ofertaValida(req.body);if(!p)refuse(400,'Confira SKU, variação e preço em centavos');
  const result=await withTransaction(async c=>{
   const s=await scope(c,req,true),reference=(await c.query('SELECT catalog_product_id FROM marketplace_offer WHERE id=$1 AND seller_id=$2',[uuid(req.params.offerId),s.id])).rows[0];
   if(!reference)refuse(404,'Oferta não encontrada');await approvedProduct(c,reference.catalog_product_id);
   const o=await offer(c,s.id,req.params.offerId);expected(o,req.body);
   if(o.status==='active')refuse(409,'Oferta ativa não pode ser alterada neste fluxo');
   await c.query(`UPDATE marketplace_offer SET seller_sku=$2,price_cents=$3,status='draft' WHERE id=$1 AND seller_id=$4`,[o.id,p.seller_sku,p.price_cents,s.id]);
   const d=(await c.query('UPDATE marketplace_offer_detail SET variant_label=$3,revision=revision+1,updated_at=now() WHERE offer_id=$1 AND seller_id=$2 RETURNING revision',[o.id,s.id,p.variant_label])).rows[0];
   await audit(c,s.id,req.usuario.id,'offer_updated','offer',o.id,{revision:d.revision,before:{seller_sku:o.seller_sku,price_cents:Number(o.price_cents),variant_label:o.variant_label},after:p});return {id:o.id,...p,...d,status:'draft'};
  });res.json(result);
 }));
 app.post('/api/marketplace/sellers/:sellerId/catalog/offers/:offerId/archive',exigeLogin,safe(async(req,res)=>{
  const result=await withTransaction(async c=>{const s=await scope(c,req,true),o=await offer(c,s.id,req.params.offerId);expected(o,req.body);
   await c.query(`UPDATE marketplace_offer SET status='suspended' WHERE id=$1 AND seller_id=$2`,[o.id,s.id]);const d=(await c.query('UPDATE marketplace_offer_detail SET revision=revision+1,updated_at=now() WHERE offer_id=$1 AND seller_id=$2 RETURNING revision',[o.id,s.id])).rows[0];await audit(c,s.id,req.usuario.id,'offer_archived','offer',o.id);return {id:o.id,...d,status:'suspended'};
  });res.json(result);
 }));
 app.put('/api/marketplace/sellers/:sellerId/catalog/offers/:offerId/inventory',exigeLogin,safe(async(req,res)=>{
  limit(req,'inventory',120);const {available_qty,reason,idempotency_key}=req.body||{},note=textoCampo(reason,250,{min:3});
  if(!Number.isInteger(available_qty)||available_qty<0||available_qty>1000000||!note)refuse(400,'Informe quantidade disponível e motivo');uuid(idempotency_key);
  const result=await withTransaction(async c=>{
   const s=await scope(c,req,true),id=uuid(req.params.offerId);
   const previous=(await c.query('SELECT * FROM marketplace_inventory_movement WHERE seller_id=$1 AND idempotency_key=$2',[s.id,idempotency_key])).rows[0];
   if(previous){if(previous.offer_id!==id||previous.after_qty!==available_qty||previous.reason!==note)refuse(409,'Chave de operação já usada com outros dados');return {...previous,replayed:true};}
   const o=await offer(c,s.id,id);expected(o,req.body);
   if(o.status==='active')refuse(409,'Ajuste de oferta ativa indisponível nesta fase');
   const stock=(await c.query('SELECT * FROM marketplace_offer_inventory WHERE offer_id=$1 FOR UPDATE',[id])).rows[0];if(!stock)refuse(409,'Estoque não inicializado');
   await c.query('UPDATE marketplace_offer_inventory SET available_qty=$2,updated_at=now() WHERE offer_id=$1',[id,available_qty]);
   const move=(await c.query(`INSERT INTO marketplace_inventory_movement(offer_id,seller_id,before_qty,after_qty,delta,reason,idempotency_key,actor_user_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[id,s.id,stock.available_qty,available_qty,available_qty-stock.available_qty,note,idempotency_key,req.usuario.id])).rows[0];
   const d=(await c.query('UPDATE marketplace_offer_detail SET revision=revision+1,updated_at=now() WHERE offer_id=$1 AND seller_id=$2 RETURNING revision',[id,s.id])).rows[0];
   await audit(c,s.id,req.usuario.id,'inventory_adjusted','offer',id,{movement_id:move.id,delta:move.delta});return {...move,revision:d.revision,reserved_qty:stock.reserved_qty,replayed:false};
  });res.json(result);
 }));
 app.get('/api/marketplace/sellers/:sellerId/catalog/inventory-movements',exigeLogin,safe(async(req,res)=>{
  const s=await scope(read,req);res.json((await query(`SELECT m.id,m.offer_id,o.seller_sku,m.before_qty,m.after_qty,m.delta,m.reason,m.created_at FROM marketplace_inventory_movement m JOIN marketplace_offer o ON o.id=m.offer_id AND o.seller_id=m.seller_id WHERE m.seller_id=$1 ORDER BY m.created_at DESC,m.id LIMIT 100 OFFSET $2`,[s.id,pagination(req)])).rows);
 }));
}
