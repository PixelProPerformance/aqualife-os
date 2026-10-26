import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import express from 'express';
import pg from 'pg';
import {registrarCarrinho} from '../src/marketplace/cart.js';
import {registrarCatalogo} from '../src/marketplace/catalog.js';

test('cart/reservations: tenant isolation, atomic split, snapshots, replay, cancellation, expiry and concurrent last unit',{skip:!process.env.PG_TEST_URL},async()=>{
 const target=new URL(process.env.PG_TEST_URL);assert.ok(['localhost','127.0.0.1'].includes(target.hostname)||process.env.RAILWAY_PROJECT_ID==='f0a54aac-7782-432e-9339-77a261e2c4c8');
 const schema='cart_test_'+randomUUID().replaceAll('-',''),db=new pg.Client({connectionString:process.env.PG_TEST_URL});await db.connect();let pool,server;
 try{
  await db.query(`CREATE SCHEMA ${schema}; SET search_path TO ${schema},public`);await db.query('CREATE TABLE app_user(id uuid PRIMARY KEY); CREATE TABLE loja_produto(id uuid PRIMARY KEY); CREATE TABLE loja_variacao(id uuid PRIMARY KEY);');
  for(const name of ['0001_foundation.sql','0003_onboarding.sql','0004_catalog.sql','0005_showcase.sql','0006_cart_reservations.sql']){const sql=await readFile(new URL('../migrations/marketplace/'+name,import.meta.url),'utf8');await db.query(sql);await db.query(sql);}
  pool=new pg.Pool({connectionString:process.env.PG_TEST_URL,options:`-c search_path=${schema},public`});const query=(...args)=>pool.query(...args),withTransaction=async fn=>{const c=await pool.connect();try{await c.query('BEGIN');const r=await fn(c);await c.query('COMMIT');return r;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}};
  const [a,b,staff,ownerA,ownerB,admin]=Array.from({length:6},randomUUID),[sa,sb,product,oa,ob]=Array.from({length:5},randomUUID);for(const id of [a,b,staff,ownerA,ownerB,admin])await query('INSERT INTO app_user VALUES($1)',[id]);
  for(const [seller,owner,name] of [[sa,ownerA,'A'],[sb,ownerB,'B']]){await query("INSERT INTO marketplace_seller(id,legal_name,trade_name,status) VALUES($1,$2,$2,'approved')",[seller,name]);await query('INSERT INTO marketplace_seller_user(seller_id,user_id,role) VALUES($1,$2,\'owner\')',[seller,owner]);await query('INSERT INTO marketplace_public_profile(seller_id,consent) VALUES($1,true)',[seller]);await query('INSERT INTO marketplace_seller_settings(seller_id) VALUES($1)',[seller]);}
  await query("INSERT INTO marketplace_seller_user(seller_id,user_id,role) VALUES($1,$2,'staff')",[sa,staff]);
  await query("INSERT INTO marketplace_catalog_product(id,title,moderation_status) VALUES($1,'Synthetic Cart Product','approved')",[product]);
  for(const [offer,seller,price] of [[oa,sa,1000],[ob,sb,1500]]){await query("INSERT INTO marketplace_offer(id,seller_id,catalog_product_id,seller_sku,price_cents,status) VALUES($1,$2,$3,$1::text,$4,'draft')",[offer,seller,product,price]);await query('INSERT INTO marketplace_offer_detail(offer_id,seller_id,variant_label) VALUES($1,$2,\'100 ml\')',[offer,seller]);await query("INSERT INTO marketplace_offer_presentation(offer_id,seller_id,warranty,conditions,review_status) VALUES($1,$2,'Synthetic warranty','No commerce','approved')",[offer,seller]);await query('INSERT INTO marketplace_offer_inventory(offer_id,available_qty) VALUES($1,5)',[offer]);}
  const app=express();app.use(express.json());const deps={app,query,withTransaction,exigeLogin:(req,res,next)=>{if(![a,b,staff,ownerA,ownerB,admin].includes(req.headers.authorization))return res.status(401).json({erro:'login'});req.usuario={id:req.headers.authorization};next();},exigeAdmin:(req,res,next)=>req.usuario.id===admin?next():res.status(403).json({erro:'admin'})};
  const service=registrarCarrinho({...deps,enabled:()=>true});registrarCatalogo(deps);
  server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
  const req=async(path,user,{body,method=body?'POST':'GET',status=200}={})=>{const r=await fetch(base+path,{method,headers:{authorization:user,'content-type':'application/json'},body:body?JSON.stringify(body):undefined});const data=await r.json();assert.equal(r.status,status,`${method} ${path}: ${JSON.stringify(data)}`);return data;};
  const cart=user=>req('/api/marketplace/cart',user),set=async(user,offer,qty)=>req('/api/marketplace/cart/items/'+offer,user,{method:'PUT',body:{qty,revision:(await cart(user)).revision}}),prepare=async(user,key=randomUUID(),status=201)=>req('/api/marketplace/cart/prepare',user,{body:{revision:(await cart(user)).revision,idempotency_key:key},status});
  await req('/api/marketplace/cart','anonymous',{status:401});await req('/api/marketplace/cart/items/'+oa,a,{method:'PUT',body:{qty:1.5,revision:1},status:400});
  await set(a,oa,2);await set(a,ob,3);assert.equal((await cart(b)).items.length,0);const before=await cart(a),key=randomUUID();
  const order=await prepare(a,key);assert.equal(order.suborders.length,2);assert.equal(order.payment_status,'blocked');assert.equal(order.shipping_quote,null);assert.equal(order.suborders.reduce((n,s)=>n+Number(s.subtotal_cents),0),6500);
  assert.deepEqual((await query('SELECT available_qty,reserved_qty FROM marketplace_offer_inventory WHERE offer_id=$1',[oa])).rows[0],{available_qty:3,reserved_qty:2});
  await req(`/api/marketplace/sellers/${sa}/catalog/offers/${oa}/inventory`,ownerA,{method:'PUT',body:{revision:1,available_qty:5,reason:'Stale before reservation',idempotency_key:randomUUID()},status:409});
  const replay=await req('/api/marketplace/cart/prepare',a,{body:{revision:before.revision,idempotency_key:key}});assert.equal(replay.id,order.id);assert.equal(replay.replayed,true);
  await req('/api/marketplace/cart/prepare',a,{body:{revision:before.revision+1,idempotency_key:key},status:409});await req('/api/marketplace/preparations/'+order.id,b,{status:404});
  const list=await req(`/api/marketplace/sellers/${sa}/preparations`,ownerA);assert.equal(list.suborders.length,1);assert.equal(list.suborders[0].items.length,1);assert.equal(Object.hasOwn(list.suborders[0],'buyer_user_id'),false);
  await req(`/api/marketplace/sellers/${sa}/preparations`,ownerB,{status:403});await req(`/api/marketplace/sellers/${sa}/preparations`,staff);
  const childA=order.suborders.find(s=>s.seller_id===sa),childB=order.suborders.find(s=>s.seller_id===sb);
  await req(`/api/marketplace/sellers/${sa}/preparations/${childA.id}/cancel`,staff,{body:{},status:403});await req(`/api/marketplace/sellers/${sa}/preparations/${childB.id}/cancel`,ownerA,{body:{},status:404});
  await req(`/api/marketplace/sellers/${sa}/preparations/${childA.id}/cancel`,ownerA,{body:{}});assert.equal((await req('/api/marketplace/preparations/'+order.id,a)).state,'partially_reserved');
  await req('/api/marketplace/preparations/'+order.id+'/cancel',a,{body:{}});await req('/api/marketplace/preparations/'+order.id+'/cancel',a,{body:{}});
  for(const offer of [oa,ob])assert.deepEqual((await query('SELECT available_qty,reserved_qty FROM marketplace_offer_inventory WHERE offer_id=$1',[offer])).rows[0],{available_qty:5,reserved_qty:0});
  for(const op of ['pay','ship','confirm'])await req('/api/marketplace/preparations/'+order.id+'/'+op,a,{body:{},status:409});
  await set(a,oa,1);await query('UPDATE marketplace_offer SET price_cents=2000 WHERE id=$1',[oa]);await prepare(a,randomUUID(),409);assert.equal((await query('SELECT reserved_qty FROM marketplace_offer_inventory WHERE offer_id=$1',[oa])).rows[0].reserved_qty,0);
  await query("UPDATE marketplace_offer_presentation SET review_status='approved' WHERE offer_id=$1",[oa]);await set(a,oa,1);const frozen=await prepare(a);await query('UPDATE marketplace_offer SET price_cents=3000 WHERE id=$1',[oa]);assert.equal(Number((await req('/api/marketplace/preparations/'+frozen.id,a)).suborders[0].items[0].unit_price_cents),2000);
  await query("UPDATE marketplace_order_preparation SET expires_at=now()-interval '1 minute' WHERE order_id=$1",[frozen.id]);assert.equal(await service.expire(),1);assert.equal(await service.expire(),0);assert.equal((await req('/api/marketplace/preparations/'+frozen.id,a)).state,'expired');
  await query("UPDATE marketplace_offer_presentation SET review_status='approved' WHERE offer_id=$1",[oa]);await query('UPDATE marketplace_offer_inventory SET available_qty=1 WHERE offer_id=$1',[oa]);await set(a,oa,1);await set(b,oa,1);
  const races=await Promise.all([a,b].map(async user=>{const data=await cart(user),r=await fetch(base+'/api/marketplace/cart/prepare',{method:'POST',headers:{authorization:user,'content-type':'application/json'},body:JSON.stringify({revision:data.revision,idempotency_key:randomUUID()})});return {user,status:r.status,data:await r.json()};}));assert.deepEqual(races.map(x=>x.status).sort(),[201,409]);
  const winner=races.find(x=>x.status===201);await req('/api/marketplace/preparations/'+winner.data.id+'/cancel',winner.user,{body:{}});assert.deepEqual((await query('SELECT available_qty,reserved_qty FROM marketplace_offer_inventory WHERE offer_id=$1',[oa])).rows[0],{available_qty:1,reserved_qty:0});
  await set(a,oa,1);await set(a,ob,1);await query("UPDATE marketplace_seller SET status='suspended' WHERE id=$1",[sb]);await prepare(a,randomUUID(),409);assert.equal((await query('SELECT reserved_qty FROM marketplace_offer_inventory WHERE offer_id=$1',[oa])).rows[0].reserved_qty,0);
  for(const table of ['marketplace_payment','marketplace_shipping','marketplace_fiscal_document'])assert.equal((await query(`SELECT count(*)::int n FROM ${table}`)).rows[0].n,0);
 }finally{if(server)await new Promise(r=>server.close(r));if(pool)await pool.end();await db.query(`DROP SCHEMA ${schema} CASCADE`);await db.end();}
});
