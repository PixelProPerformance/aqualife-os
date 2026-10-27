import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import express from 'express';
import pg from 'pg';
import {registrarMercadoPagoOAuth} from '../src/marketplace/mp-oauth.js';
import {unseal,CALLBACK_PATH} from '../src/marketplace/mp-security.js';

test('OAuth SQL/API: tenant scope, PKCE, cookie binding, single-use/expiry, encryption, disconnect and refresh revocation',{skip:!process.env.PG_TEST_URL},async()=>{
 const target=new URL(process.env.PG_TEST_URL);assert.ok(['localhost','127.0.0.1'].includes(target.hostname)||process.env.RAILWAY_PROJECT_ID==='f0a54aac-7782-432e-9339-77a261e2c4c8');
 const schema='oauth_test_'+randomUUID().replaceAll('-',''),db=new pg.Client({connectionString:process.env.PG_TEST_URL});await db.connect();let pool,server;
 try{
  await db.query(`CREATE SCHEMA ${schema}; SET search_path TO ${schema},public`);await db.query('CREATE TABLE app_user(id uuid PRIMARY KEY, ativo boolean NOT NULL DEFAULT true); CREATE TABLE loja_produto(id uuid PRIMARY KEY); CREATE TABLE loja_variacao(id uuid PRIMARY KEY);');
  for(const file of ['0001_foundation.sql','0007_payment_oauth.sql']){const sql=await readFile(new URL('../migrations/marketplace/'+file,import.meta.url),'utf8');await db.query(sql);await db.query(sql);}
  pool=new pg.Pool({connectionString:process.env.PG_TEST_URL,options:`-c search_path=${schema},public`});const query=(...a)=>pool.query(...a),withTransaction=async fn=>{const c=await pool.connect();try{await c.query('BEGIN');const r=await fn(c);await c.query('COMMIT');return r;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}};
  const [ownerA,ownerB,staff,sellerA,sellerB]=Array.from({length:5},randomUUID);
  for(const id of [ownerA,ownerB,staff])await query('INSERT INTO app_user(id) VALUES($1)',[id]);
  for(const [seller,owner] of [[sellerA,ownerA],[sellerB,ownerB]]){await query("INSERT INTO marketplace_seller(id,legal_name,trade_name,status) VALUES($1,'Synthetic OAuth','Synthetic OAuth','approved')",[seller]);await query("INSERT INTO marketplace_seller_user(seller_id,user_id,role) VALUES($1,$2,'owner')",[seller,owner]);}
  await query("INSERT INTO marketplace_seller_user(seller_id,user_id,role) VALUES($1,$2,'staff')",[sellerA,staff]);
  let configured=true,revoked=false,identityId='123',identitiesTest=true,calls=0,gate=true;
  const config={clientId:'12345',clientSecret:'synthetic-secret',key:'ab'.repeat(32),redirect:'https://aqualife-os-production-a81a.up.railway.app'+CALLBACK_PATH,testUsers:['123','456']};
  const tokens=()=>({access_token:'synthetic-access-'+identityId,refresh_token:'synthetic-refresh-'+identityId,user_id:identityId,expires_in:3600});
  const provider={exchange:async(c,code,verifier)=>{calls++;assert.ok(verifier.length>=43);return tokens();},identity:async()=>({id:identityId,tags:identitiesTest?['test_user']:[]}),refresh:async()=>{if(revoked)throw Object.assign(Error('redacted'),{providerUnauthorized:true});return tokens();}};
  const app=express();app.use(express.json());registrarMercadoPagoOAuth({app,query,withTransaction,configuration:()=>configured?config:null,provider,rateLimit:()=>gate,exigeLogin:(req,res,next)=>{if(![ownerA,ownerB,staff].includes(req.headers.authorization))return res.status(401).json({erro:'login'});req.usuario={id:req.headers.authorization};next();}});
  server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port,route=s=>`/api/marketplace/sellers/${s}/payments/connection`;
  async function api(path,user,{method='GET',status=200}={}){const r=await fetch(base+path,{method,headers:{authorization:user||'anonymous','content-type':'application/json'},body:method==='POST'?'{}':undefined});const d=await r.json();assert.equal(r.status,status,JSON.stringify(d));assert.equal(d.commerce_enabled,false);assert.equal(d.payments_enabled,false);assert.ok(!JSON.stringify(d).includes('synthetic-access'));return {d,r};}
  const start=async(s=sellerA,u=ownerA)=>{const {d,r}=await api(route(s)+'/authorize',u,{method:'POST'});const url=new URL(d.authorization_url);assert.match(r.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Lax/i);return {state:url.searchParams.get('state'),cookie:r.headers.get('set-cookie').split(';')[0],url};};
  const callback=async(flow,{cookie=flow.cookie,code='synthetic-code',expected='connected'}={})=>{const r=await fetch(base+CALLBACK_PATH+'?'+new URLSearchParams({state:flow.state,code}),{redirect:'manual',headers:{cookie}});assert.equal(r.status,303);assert.equal(r.headers.get('location'),'/lojista.html?mp_connection='+expected);assert.equal(r.headers.get('referrer-policy'),'no-referrer');return r;};
  assert.equal((await fetch(base+route(sellerA))).status,401);await api(route(sellerA),ownerB,{status:403});await api(route(sellerA)+'/authorize',staff,{method:'POST',status:403});
  configured=false;assert.equal((await api(route(sellerA),ownerA)).d.state,'not_configured');await api(route(sellerA)+'/authorize',ownerA,{method:'POST',status:409});configured=true;
  gate=false;await api(route(sellerA)+'/authorize',ownerA,{method:'POST',status:429});gate=true;
  const flow=await start();await callback(flow,{cookie:'',expected:'invalid'});assert.equal(calls,0);await callback(flow);assert.equal(calls,1);await callback(flow,{expected:'invalid'});assert.equal(calls,1);
  const row=(await query('SELECT * FROM marketplace_mp_connection WHERE seller_id=$1',[sellerA])).rows[0];assert.equal(unseal(row.access_cipher,config.key,'access:'+sellerA),'synthetic-access-123');assert.notEqual(row.refresh_cipher,'synthetic-refresh-123');
  const status=(await api(route(sellerA),staff)).d;assert.equal(status.state,'connected');for(const k of ['provider_user_id','access_cipher','refresh_cipher','connected_by'])assert.equal(Object.hasOwn(status,k),false);
  await api(route(sellerA)+'/refresh',staff,{method:'POST',status:403});await api(route(sellerA)+'/refresh',ownerB,{method:'POST',status:403});await api(route(sellerA)+'/refresh',ownerA,{method:'POST'});
  revoked=true;await api(route(sellerA)+'/refresh',ownerA,{method:'POST',status:409});assert.equal((await query('SELECT access_cipher FROM marketplace_mp_connection WHERE seller_id=$1',[sellerA])).rows[0].access_cipher,null);revoked=false;
  const expired=await start();await query("UPDATE marketplace_mp_oauth_attempt SET expires_at=now()-interval '1 second' WHERE consumed_at IS NULL");await callback(expired,{expected:'invalid'});
  const removed=await start();await query('UPDATE marketplace_seller_user SET active=false WHERE seller_id=$1 AND user_id=$2',[sellerA,ownerA]);await callback(removed,{expected:'failed'});await query('UPDATE marketplace_seller_user SET active=true WHERE seller_id=$1 AND user_id=$2',[sellerA,ownerA]);
  const old=await start(),current=await start();await callback(old,{expected:'invalid'});await callback(current);
  // An account cannot be attached to another seller. Transaction rolls back, attempt stays consumed.
  await callback(await start(sellerB,ownerB),{expected:'failed'});assert.equal((await query('SELECT count(*)::int n FROM marketplace_mp_connection')).rows[0].n,1);
  identitiesTest=false;await callback(await start(),{expected:'failed'});identitiesTest=true;
  identityId='456';await callback(await start(),{expected:'failed'});identityId='123';
  const pending=await start();await query("UPDATE marketplace_seller SET status='suspended' WHERE id=$1",[sellerA]);configured=false;await api(route(sellerA)+'/disconnect',ownerA,{method:'POST'});configured=true;await callback(pending,{expected:'invalid'});
  const cleared=(await query('SELECT state,access_cipher,refresh_cipher FROM marketplace_mp_connection WHERE seller_id=$1',[sellerA])).rows[0];assert.deepEqual(cleared,{state:'disconnected',access_cipher:null,refresh_cipher:null});
  assert.equal((await query('SELECT count(*)::int n FROM marketplace_payment')).rows[0].n,0);assert.equal((await query('SELECT count(*)::int n FROM marketplace_shipping')).rows[0].n,0);
 }finally{if(server)await new Promise(r=>server.close(r));if(pool)await pool.end();await db.query(`DROP SCHEMA ${schema} CASCADE`);await db.end();}
});
