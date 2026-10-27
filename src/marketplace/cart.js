import {createHash} from 'node:crypto';
import {sellerIdValido} from './authorization.js';
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const id=value=>{if(!sellerIdValido(value))fail(400,'Identificador inválido');return value;};
const expected=(actual,value)=>{if(!Number.isInteger(value)||actual!==value)fail(409,'Carrinho alterado; atualize a página');};
const blocked={commerce_enabled:false,payment_status:'blocked',shipping_status:'blocked',picking_status:'not_started',shipping_quote:null,tracking_code:null,fiscal_document:null};
const eligible=`SELECT o.id,o.seller_id,o.catalog_product_id,o.price_cents,o.seller_sku,o.status,p.title,p.moderation_status,
 s.trade_name,s.status AS seller_status,s.is_platform_owned,o.legacy_variation_id,d.variant_label,pr.revision AS presentation_revision,pr.review_status,pr.warranty,pr.conditions,pr.handling_days,
 pf.consent,i.available_qty,i.reserved_qty FROM marketplace_offer o
 JOIN marketplace_seller s ON s.id=o.seller_id JOIN marketplace_catalog_product p ON p.id=o.catalog_product_id
 JOIN marketplace_offer_detail d ON d.offer_id=o.id JOIN marketplace_offer_presentation pr ON pr.offer_id=o.id AND pr.seller_id=o.seller_id
 JOIN marketplace_public_profile pf ON pf.seller_id=s.id JOIN marketplace_offer_inventory i ON i.offer_id=o.id`;
function available(o){return o&&o.status==='draft'&&o.seller_status==='approved'&&!o.is_platform_owned&&!o.legacy_variation_id&&o.moderation_status==='approved'&&o.review_status==='approved'&&o.consent&&Number.isSafeInteger(Number(o.price_cents))&&Number(o.price_cents)>0&&Number(o.price_cents)<=100000000;}
export function registrarCarrinho({app,query,withTransaction,exigeLogin,rateLimit=()=>true,enabled=()=>process.env.MARKETPLACE_PREPARATION_ENABLED==='true',now=()=>new Date()}){
 const safe=fn=>async(req,res)=>{res.set('Cache-Control','no-store');try{await fn(req,res);}catch(e){if(e.status)return res.status(e.status).json({erro:e.message,...blocked});if(e.code==='23505')return res.status(409).json({erro:'Já existe uma preparação ativa; atualize a página',...blocked});console.error('[marketplace/cart]',e.code||'internal');res.status(500).json({erro:'Operação indisponível',...blocked});}};
 const gate=(req,res,next)=>{if(!enabled())return res.status(404).json({erro:'Carrinho em preparação',...blocked});next();};
 const throttle=(req)=>{if(!rateLimit('marketplace:preparation:'+req.usuario.id,20,3600000))fail(429,'Limite de preparações atingido; tente mais tarde');};
 async function buyerLock(c,user){await c.query('SELECT pg_advisory_xact_lock(hashtext($1))',['marketplace-cart:'+user]);}
 async function cart(c,user){await c.query('INSERT INTO marketplace_cart(buyer_user_id) VALUES($1) ON CONFLICT DO NOTHING',[user]);return (await c.query('SELECT * FROM marketplace_cart WHERE buyer_user_id=$1 FOR UPDATE',[user])).rows[0];}
 async function touch(c,user){return (await c.query('UPDATE marketplace_cart SET revision=revision+1,updated_at=now() WHERE buyer_user_id=$1 RETURNING revision',[user])).rows[0].revision;}
 async function rows(c,user){return (await c.query(`SELECT ci.offer_id,ci.qty,ci.price_cents AS quoted_price_cents,ci.presentation_revision AS quoted_revision,e.* FROM marketplace_cart_item ci LEFT JOIN (${eligible}) e ON e.id=ci.offer_id WHERE ci.buyer_user_id=$1 ORDER BY ci.offer_id`,[user])).rows;}
 function projection(o){return {offer_id:o.offer_id||o.id,seller_id:o.seller_id,sold_by:o.trade_name,title:o.title,variant_label:o.variant_label,qty:o.qty,unit_price_cents:Number(o.quoted_price_cents??o.price_cents),current_price_cents:o.price_cents===null?null:Number(o.price_cents),available_qty:o.available_qty??0,eligible:available(o),changed:!available(o)||Number(o.quoted_price_cents)!==Number(o.price_cents)||o.quoted_revision!==o.presentation_revision};}
 async function orderView(c,orderId,user){
  const p=(await c.query(`SELECT o.id,o.state,p.expires_at,p.closed_at FROM marketplace_order o JOIN marketplace_order_preparation p ON p.order_id=o.id WHERE o.id=$1 AND o.buyer_user_id=$2`,[id(orderId),user])).rows[0];if(!p)fail(404,'Preparação não encontrada');
  const children=(await c.query(`SELECT so.id,so.seller_id,so.state,so.subtotal_cents,s.trade_name AS sold_by FROM marketplace_seller_order so JOIN marketplace_seller s ON s.id=so.seller_id WHERE so.marketplace_order_id=$1 ORDER BY so.id`,[p.id])).rows;
  for(const child of children){child.items=(await c.query('SELECT product_snapshot,unit_price_cents,qty,offer_id FROM marketplace_seller_order_item WHERE seller_order_id=$1 AND seller_id=$2 ORDER BY id',[child.id,child.seller_id])).rows;child.events=(await c.query('SELECT action,note,created_at FROM marketplace_preparation_event WHERE seller_order_id=$1 AND seller_id=$2 ORDER BY created_at,id',[child.id,child.seller_id])).rows;Object.assign(child,blocked);}
  return {...p,suborders:children,...blocked};
 }
 async function release(c,orderId,cause,actor=null,childId=null,note=''){
  const parent=(await c.query('SELECT * FROM marketplace_order_preparation WHERE order_id=$1 FOR UPDATE',[orderId])).rows[0];if(!parent)return false;
  const reservations=(await c.query(`SELECT * FROM marketplace_stock_reservation WHERE order_id=$1 AND state='active' AND ($2::uuid IS NULL OR seller_order_id=$2) ORDER BY offer_id FOR UPDATE`,[orderId,childId])).rows;if(!reservations.length)return false;
  // Same offer -> detail -> inventory order as catalog mutations; never hold stock before detail.
  const offerIds=reservations.map(r=>r.offer_id);
  await c.query('SELECT id FROM marketplace_offer WHERE id=ANY($1::uuid[]) ORDER BY id FOR NO KEY UPDATE',[offerIds]);
  await c.query('SELECT offer_id FROM marketplace_offer_detail WHERE offer_id=ANY($1::uuid[]) ORDER BY offer_id FOR NO KEY UPDATE',[offerIds]);
  await c.query('SELECT offer_id FROM marketplace_offer_inventory WHERE offer_id=ANY($1::uuid[]) ORDER BY offer_id FOR UPDATE',[offerIds]);
  for(const r of reservations){const result=await c.query('UPDATE marketplace_offer_inventory SET available_qty=available_qty+$2,reserved_qty=reserved_qty-$2,updated_at=now() WHERE offer_id=$1 AND reserved_qty>=$2',[r.offer_id,r.qty]);if(result.rowCount!==1)throw Error('RESERVATION_BALANCE_INVALID');await c.query('UPDATE marketplace_stock_reservation SET state=$2,released_at=now() WHERE id=$1',[r.id,cause]);}
  await c.query('UPDATE marketplace_offer_detail SET revision=revision+1,updated_at=now() WHERE offer_id=ANY($1::uuid[])',[offerIds]);
  const children=[...new Set(reservations.map(r=>r.seller_order_id))];
  for(const child of children){const r=reservations.find(r=>r.seller_order_id===child);await c.query('UPDATE marketplace_seller_order SET state=$2 WHERE id=$1',[child,cause]);await c.query('INSERT INTO marketplace_preparation_event(seller_order_id,seller_id,actor_user_id,action,note) VALUES($1,$2,$3,$4,$5)',[child,r.seller_id,actor,cause,note||'Reserva temporária encerrada; estoque devolvido.']);}
  const remaining=(await c.query("SELECT count(*)::int n FROM marketplace_stock_reservation WHERE order_id=$1 AND state='active'",[orderId])).rows[0].n;
  if(!remaining)await c.query('UPDATE marketplace_order_preparation SET closed_at=now() WHERE order_id=$1',[orderId]);await c.query('UPDATE marketplace_order SET state=$2 WHERE id=$1',[orderId,remaining?'partially_reserved':cause]);return true;
 }
 async function expire(){let count=0;for(let i=0;i<100;i++){const changed=await withTransaction(async c=>{
  if(!(await c.query("SELECT to_regclass('marketplace_order_preparation') AS name")).rows[0].name)return 0;
  if(!(await c.query("SELECT pg_try_advisory_xact_lock(hashtext('marketplace-expiration')) AS locked")).rows[0].locked)return 0;
  const list=(await c.query('SELECT order_id FROM marketplace_order_preparation WHERE closed_at IS NULL AND expires_at<=$1 ORDER BY expires_at,order_id LIMIT 1 FOR UPDATE SKIP LOCKED',[now()])).rows;
  for(const p of list)await release(c,p.order_id,'expired');return list.length;
 });if(!changed)break;count+=changed;}return count;}
 const auth=[exigeLogin];
 app.get('/api/marketplace/cart',...auth,safe(async(req,res)=>{
  await expire();const result=await withTransaction(async c=>{await buyerLock(c,req.usuario.id);const p=await cart(c,req.usuario.id),items=(await rows(c,req.usuario.id)).map(projection);return {revision:p.revision,items,subtotal_cents:items.reduce((n,o)=>n+o.unit_price_cents*o.qty,0),preparation_enabled:enabled(),...blocked};});res.json(result);
 }));
 app.put('/api/marketplace/cart/items/:offerId',...auth,safe(async(req,res)=>{
  const qty=req.body?.qty;if(!Number.isInteger(qty)||qty<0||qty>99)fail(400,'Quantidade deve ser inteira entre 0 e 99');const offerId=id(req.params.offerId);
  if(qty&&!enabled())fail(409,'Novas preparações estão temporariamente desabilitadas');
  const revision=await withTransaction(async c=>{await buyerLock(c,req.usuario.id);const p=await cart(c,req.usuario.id);expected(p.revision,req.body.revision);
   if(!qty)await c.query('DELETE FROM marketplace_cart_item WHERE buyer_user_id=$1 AND offer_id=$2',[req.usuario.id,offerId]);
   else{const o=(await c.query(eligible+' WHERE o.id=$1',[offerId])).rows[0];if(!available(o))fail(409,'Oferta não aprovada ou indisponível para preparação');if(qty>o.available_qty)fail(409,'Estoque disponível insuficiente');
    const count=(await c.query('SELECT count(*)::int n FROM marketplace_cart_item WHERE buyer_user_id=$1',[req.usuario.id])).rows[0].n;if(count>=50&&!(await c.query('SELECT 1 FROM marketplace_cart_item WHERE buyer_user_id=$1 AND offer_id=$2',[req.usuario.id,offerId])).rowCount)fail(409,'Limite de 50 itens atingido');
    await c.query('INSERT INTO marketplace_cart_item(buyer_user_id,offer_id,qty,price_cents,presentation_revision) VALUES($1,$2,$3,$4,$5) ON CONFLICT(buyer_user_id,offer_id) DO UPDATE SET qty=$3,price_cents=$4,presentation_revision=$5',[req.usuario.id,offerId,qty,o.price_cents,o.presentation_revision]);}
   return touch(c,req.usuario.id);
  });res.json({revision,...blocked});
 }));
 app.post('/api/marketplace/cart/prepare',...auth,gate,safe(async(req,res)=>{
  throttle(req);const key=id(req.body?.idempotency_key);if(!Number.isInteger(req.body?.revision))fail(400,'Informe a revisão do carrinho');await expire();
  const result=await withTransaction(async c=>{
   await buyerLock(c,req.usuario.id);const old=(await c.query('SELECT order_id,cart_revision FROM marketplace_order_preparation WHERE buyer_user_id=$1 AND idempotency_key=$2',[req.usuario.id,key])).rows[0];if(old){if(old.cart_revision!==req.body.revision)fail(409,'Chave já utilizada para outra revisão');return {...await orderView(c,old.order_id,req.usuario.id),replayed:true};}
   const p=await cart(c,req.usuario.id);expected(p.revision,req.body.revision);
   if((await c.query('SELECT 1 FROM marketplace_order_preparation WHERE buyer_user_id=$1 AND closed_at IS NULL',[req.usuario.id])).rowCount)fail(409,'Cancele ou aguarde a preparação ativa');
   const references=await rows(c,req.usuario.id);if(!references.length)fail(400,'Carrinho vazio');
   const sellerIds=[...new Set(references.map(o=>o.seller_id).filter(Boolean))].sort(),productIds=[...new Set(references.map(o=>o.catalog_product_id).filter(Boolean))].sort();
   await c.query('SELECT id FROM marketplace_seller WHERE id=ANY($1::uuid[]) ORDER BY id FOR NO KEY UPDATE',[sellerIds]);
   await c.query('SELECT id FROM marketplace_catalog_product WHERE id=ANY($1::uuid[]) ORDER BY id FOR SHARE',[productIds]);
   await c.query('SELECT id FROM marketplace_offer WHERE id=ANY($1::uuid[]) ORDER BY id FOR NO KEY UPDATE',[references.map(o=>o.offer_id)]);
   await c.query('SELECT offer_id FROM marketplace_offer_detail WHERE offer_id=ANY($1::uuid[]) ORDER BY offer_id FOR NO KEY UPDATE',[references.map(o=>o.offer_id)]);
   await c.query('SELECT offer_id FROM marketplace_offer_inventory WHERE offer_id=ANY($1::uuid[]) ORDER BY offer_id FOR UPDATE',[references.map(o=>o.offer_id)]);
   const current=await rows(c,req.usuario.id);for(const o of current){if(!available(o)||Number(o.price_cents)!==Number(o.quoted_price_cents)||o.presentation_revision!==o.quoted_revision)fail(409,'Preço ou condições alterados; confira e atualize os itens do carrinho');if(o.qty>o.available_qty)fail(409,'Estoque insuficiente; nenhum item foi reservado');}
   const order=(await c.query("INSERT INTO marketplace_order(buyer_user_id,state) VALUES($1,'reserved') RETURNING id",[req.usuario.id])).rows[0];const expires=new Date(now().getTime()+15*60000),digest=createHash('sha256').update(JSON.stringify(current.map(projection))).digest('hex');
   await c.query('INSERT INTO marketplace_order_preparation(order_id,buyer_user_id,idempotency_key,cart_revision,request_digest,expires_at) VALUES($1,$2,$3,$4,$5,$6)',[order.id,req.usuario.id,key,p.revision,digest,expires]);
   for(const seller of sellerIds){const items=current.filter(o=>o.seller_id===seller),subtotal=items.reduce((n,o)=>n+Number(o.price_cents)*o.qty,0);const child=(await c.query("INSERT INTO marketplace_seller_order(marketplace_order_id,seller_id,state,subtotal_cents) VALUES($1,$2,'reserved',$3) RETURNING id",[order.id,seller,subtotal])).rows[0];
    for(const o of items){const snapshot={title:o.title,variant_label:o.variant_label,sold_by:o.trade_name,warranty:o.warranty,conditions:o.conditions,handling_days:o.handling_days,catalog_product_id:o.catalog_product_id};
     await c.query('UPDATE marketplace_offer_inventory SET available_qty=available_qty-$2,reserved_qty=reserved_qty+$2,updated_at=now() WHERE offer_id=$1',[o.offer_id,o.qty]);
     await c.query('INSERT INTO marketplace_seller_order_item(seller_order_id,offer_id,seller_id,product_snapshot,unit_price_cents,qty) VALUES($1,$2,$3,$4::jsonb,$5,$6)',[child.id,o.offer_id,seller,JSON.stringify(snapshot),o.price_cents,o.qty]);
     await c.query('INSERT INTO marketplace_stock_reservation(order_id,seller_order_id,seller_id,offer_id,qty) VALUES($1,$2,$3,$4,$5)',[order.id,child.id,seller,o.offer_id,o.qty]);}
    await c.query("INSERT INTO marketplace_preparation_event(seller_order_id,seller_id,actor_user_id,action,note) VALUES($1,$2,$3,'reserved','Reserva temporária de preparação; compra, pagamento e expedição bloqueados.')",[child.id,seller,req.usuario.id]);
   }
   await c.query('UPDATE marketplace_offer_detail SET revision=revision+1,updated_at=now() WHERE offer_id=ANY($1::uuid[])',[current.map(o=>o.offer_id)]);
   await c.query('DELETE FROM marketplace_cart_item WHERE buyer_user_id=$1',[req.usuario.id]);await touch(c,req.usuario.id);return {...await orderView(c,order.id,req.usuario.id),replayed:false};
  });res.status(result.replayed?200:201).json(result);
 }));
 app.get('/api/marketplace/preparations',...auth,safe(async(req,res)=>{await expire();res.json({preparations:(await query('SELECT o.id,o.state,p.expires_at FROM marketplace_order o JOIN marketplace_order_preparation p ON p.order_id=o.id WHERE o.buyer_user_id=$1 ORDER BY p.created_at DESC LIMIT 50',[req.usuario.id])).rows,...blocked});}));
 app.get('/api/marketplace/preparations/:orderId',...auth,safe(async(req,res)=>{await expire();res.json(await orderView({query},req.params.orderId,req.usuario.id));}));
 app.post('/api/marketplace/preparations/:orderId/cancel',...auth,safe(async(req,res)=>{await expire();const result=await withTransaction(async c=>{await buyerLock(c,req.usuario.id);await orderView(c,req.params.orderId,req.usuario.id);await release(c,req.params.orderId,'cancelled',req.usuario.id,null,'Cancelada pelo comprador; sem cobrança.');return orderView(c,req.params.orderId,req.usuario.id);});res.json(result);}));
 async function sellerScope(req,c,owner=false){const s=(await c.query('SELECT su.role FROM marketplace_seller_user su WHERE su.seller_id=$1 AND su.user_id=$2 AND su.active=true',[id(req.params.sellerId),req.usuario.id])).rows[0];if(!s||(owner&&s.role!=='owner'))fail(403,'Acesso restrito à loja');return s;}
 app.get('/api/marketplace/sellers/:sellerId/preparations',...auth,safe(async(req,res)=>{await expire();await sellerScope(req,{query});const list=(await query('SELECT so.id,so.state,so.subtotal_cents,p.expires_at FROM marketplace_seller_order so JOIN marketplace_order_preparation p ON p.order_id=so.marketplace_order_id WHERE so.seller_id=$1 ORDER BY p.created_at DESC LIMIT 100',[req.params.sellerId])).rows;for(const child of list){child.items=(await query('SELECT product_snapshot,unit_price_cents,qty FROM marketplace_seller_order_item WHERE seller_order_id=$1 AND seller_id=$2',[child.id,req.params.sellerId])).rows;child.events=(await query('SELECT action,note,created_at FROM marketplace_preparation_event WHERE seller_order_id=$1 AND seller_id=$2 ORDER BY created_at,id',[child.id,req.params.sellerId])).rows;Object.assign(child,blocked);}res.json({suborders:list,...blocked});}));
 app.post('/api/marketplace/sellers/:sellerId/preparations/:childId/cancel',...auth,safe(async(req,res)=>{await expire();await withTransaction(async c=>{await sellerScope(req,c,true);const child=(await c.query('SELECT marketplace_order_id FROM marketplace_seller_order WHERE id=$1 AND seller_id=$2',[id(req.params.childId),req.params.sellerId])).rows[0];if(!child)fail(404,'Subpedido não encontrado');await release(c,child.marketplace_order_id,'cancelled',req.usuario.id,req.params.childId,'Reserva recusada pela loja; estoque devolvido e sem cobrança.');});res.json({ok:true,...blocked});}));
 for(const operation of ['pay','ship','confirm'])app.post('/api/marketplace/preparations/:orderId/'+operation,...auth,safe(async(req,res)=>{await orderView({query},req.params.orderId,req.usuario.id);fail(409,'Compra, pagamentos e expedição não estão liberados nesta fase');}));
 return {expire,async drain({buyerIds=null}={}){let count=0;while(true){const changed=await withTransaction(async c=>{const parent=(await c.query('SELECT order_id FROM marketplace_order_preparation WHERE closed_at IS NULL AND ($1::uuid[] IS NULL OR buyer_user_id=ANY($1::uuid[])) ORDER BY order_id LIMIT 1 FOR UPDATE SKIP LOCKED',[buyerIds])).rows[0];if(!parent)return false;const paid=(await c.query('SELECT 1 FROM marketplace_payment p JOIN marketplace_seller_order so ON so.id=p.seller_order_id WHERE so.marketplace_order_id=$1 LIMIT 1',[parent.order_id])).rowCount;if(paid)throw Error('REFUSE_FINANCIAL_ORDER');return release(c,parent.order_id,'cancelled',null,null,'Preparação encerrada por manutenção/rollback, sem cobrança.');});if(!changed)break;count++;}return count;},startExpiration(){const timer=setInterval(()=>{expire().catch(e=>console.error('[marketplace/expiration]',e.code||'failed'));},60000);timer.unref();return ()=>clearInterval(timer);}};
}
