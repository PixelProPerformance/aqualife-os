import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import express from 'express';
import pg from 'pg';
import {registrarOnboarding} from '../src/marketplace/onboarding.js';
import {TERMS_VERSION} from '../src/marketplace/validation.js';

test('SQL + HTTP: two shops, owner/staff, review conflicts, suspension, publication gates and audit', {skip:!process.env.PG_TEST_URL},async()=>{
 const target=new URL(process.env.PG_TEST_URL);
 assert.ok(['localhost','127.0.0.1'].includes(target.hostname)||process.env.RAILWAY_PROJECT_ID==='f0a54aac-7782-432e-9339-77a261e2c4c8','refuse production');
 const schema='mp_test_'+randomUUID().replaceAll('-','');
 const db=new pg.Client({connectionString:process.env.PG_TEST_URL});await db.connect();let pool,server;
 try{
  await db.query(`CREATE SCHEMA ${schema}; SET search_path TO ${schema},public`);
  await db.query(`CREATE TABLE app_user(id uuid PRIMARY KEY,name text,email text,ativo boolean DEFAULT true);
   CREATE TABLE loja_produto(id uuid PRIMARY KEY); CREATE TABLE loja_variacao(id uuid PRIMARY KEY);`);
  for(const f of ['0001_foundation.sql','0003_onboarding.sql']){const sql=await readFile(new URL('../migrations/marketplace/'+f,import.meta.url),'utf8');await db.query(sql);await db.query(sql);}
  pool=new pg.Pool({connectionString:process.env.PG_TEST_URL,options:`-c search_path=${schema},public`});
  const query=(...a)=>pool.query(...a),withTransaction=async fn=>{const c=await pool.connect();try{await c.query('BEGIN');const r=await fn(c);await c.query('COMMIT');return r;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}};
  const [ownerA,ownerB,staff,admin]=Array.from({length:4},randomUUID);
  for(const id of [ownerA,ownerB,staff,admin])await query('INSERT INTO app_user(id,name,email) VALUES($1,$2,$3)',[id,'Synthetic',id+'@example.invalid']);
  const app=express();app.use(express.json());
  registrarOnboarding({app,query,withTransaction,exigeLogin:(req,res,next)=>{const id=req.headers.authorization;if(![ownerA,ownerB,staff,admin].includes(id))return res.status(401).json({erro:'login'});req.usuario={id};next();},exigeAdmin:(req,res,next)=>req.usuario.id===admin?next():res.status(403).json({erro:'admin'})});
  server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base=`http://127.0.0.1:${server.address().port}`;
  const request=async(path,user,body,status=200,method=body?'POST':'GET')=>{const r=await fetch(base+path,{method,headers:{authorization:user,'content-type':'application/json'},body:body?JSON.stringify(body):undefined});const data=await r.json();assert.equal(r.status,status,`${method} ${path}: ${JSON.stringify(data)}`);return data;};
  const profile={legal_name:'Synthetic Empresa',trade_name:'Synthetic A',cnpj:'11222333000181',contact_name:'Teste',contact_email:'test@example.invalid',contact_phone:'11999999999',zip_code:'01001000',street:'Rua fictícia',number:'1',city:'São Paulo',state:'SP',terms_version:TERMS_VERSION,terms_accepted:true};
  const a=await request('/api/marketplace/sellers/apply',ownerA,profile,201),b=await request('/api/marketplace/sellers/apply',ownerB,{...profile,cnpj:'11444777000161',trade_name:'Synthetic B'},201);
  const path=(id,part)=>`/api/marketplace/sellers/${id}/${part}`;
  await request('/api/marketplace/sellers/apply',ownerB,profile,409);
  await request(path(a.id,'dashboard'),ownerB,undefined,403);
  await request(path(b.id,'profile'),ownerA,undefined,403);
  await request(path(a.id,'dashboard'),ownerA);
  await request(path(a.id,'members'),ownerA,{email:staff+'@example.invalid',role:'staff'},403);
  const decision={status:'approved',expected_status:'pending',revision:1,note:'Synthetic review',fiscal_checked:true,contact_checked:true,address_checked:true};
  await request(`/api/admin/marketplace/sellers/${a.id}/status`,ownerA,decision,403,'PATCH');
  await request(`/api/admin/marketplace/sellers/${a.id}/status`,admin,{...decision,fiscal_checked:false},400,'PATCH');
  await request(`/api/admin/marketplace/sellers/${a.id}/status`,admin,decision,200,'PATCH');
  await request(`/api/admin/marketplace/sellers/${a.id}/status`,admin,decision,409,'PATCH');
  await request(path(a.id,'members'),ownerA,{email:staff+'@example.invalid',role:'owner'},400);
  await request(path(a.id,'members'),ownerA,{email:staff+'@example.invalid',role:'staff'},201);
  for(const module of ['dashboard','profile','offers','orders','activity']){await request(path(a.id,module),staff);await request(path(b.id,module),staff,undefined,403);}
  await request(path(a.id,'members'),staff,undefined,403);
  await request(path(a.id,'profile'),staff,profile,403,'PATCH');
  await request(path(a.id,'members/'+ownerA),ownerA,{active:false},404,'PATCH');
  await request(path(a.id,'offers/'+randomUUID()+'/publish'),ownerA,{},409);
  await request(path(a.id,'members/'+staff),ownerA,{active:false},200,'PATCH');
  await request(path(a.id,'dashboard'),staff,undefined,403);
  await request(`/api/admin/marketplace/sellers/${b.id}/status`,admin,{...decision,status:'rejected',note:'Corrigir'},200,'PATCH');
  await request(path(b.id,'profile'),ownerB,{...profile,trade_name:'Corrigida'},200,'PATCH');
  await request(`/api/admin/marketplace/sellers/${b.id}/status`,admin,decision,409,'PATCH');
  await request(`/api/admin/marketplace/sellers/${b.id}/status`,admin,{...decision,revision:3},200,'PATCH');
  await request(`/api/admin/marketplace/sellers/${a.id}/status`,admin,{...decision,status:'suspended',expected_status:'approved',revision:2},200,'PATCH');
  await request(path(a.id,'members'),ownerA,{email:staff+'@example.invalid',role:'staff'},403);
  assert.equal((await query('SELECT count(*)::int n FROM marketplace_seller_settings WHERE accepting_orders=true')).rows[0].n,0);
  assert.equal((await query("SELECT count(*)::int n FROM marketplace_audit_log WHERE action='seller_status_changed'")).rows[0].n,4);
  // Composite FK rejects an order item attributed to the other seller.
  const product=randomUUID(),offer=randomUUID(),order=randomUUID(),suborder=randomUUID();
  await query('INSERT INTO marketplace_catalog_product(id,title) VALUES($1,$2)',[product,'Synthetic']);
  await query(`INSERT INTO marketplace_offer(id,seller_id,catalog_product_id,seller_sku,price_cents) VALUES($1,$2,$3,'test',100)`,[offer,a.id,product]);
  await query('INSERT INTO marketplace_order(id) VALUES($1)',[order]);
  await query('INSERT INTO marketplace_seller_order(id,marketplace_order_id,seller_id) VALUES($1,$2,$3)',[suborder,order,b.id]);
  await assert.rejects(query(`INSERT INTO marketplace_seller_order_item(seller_order_id,offer_id,seller_id,product_snapshot,unit_price_cents,qty) VALUES($1,$2,$3,'{}',100,1)`,[suborder,offer,b.id]),{code:'23503'});
 }finally{if(server)await new Promise(r=>server.close(r));if(pool)await pool.end();await db.query(`DROP SCHEMA ${schema} CASCADE`);await db.end();}
});
