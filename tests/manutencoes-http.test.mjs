import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import express from 'express';
import {registrarManutencoesManuais} from '../src/manutencoes-manuais.js';

test('HTTP real + JWT + PostgreSQL: relatórios isolados, revogação e anulação',{skip:!process.env.MAINTENANCE_TEST_DATABASE_URL},async()=>{
 const db=new pg.Client({connectionString:process.env.MAINTENANCE_TEST_DATABASE_URL});await db.connect();
 const schema='qa_maintenance_'+randomUUID().replaceAll('-','');
 let server;
 try{
  await db.query(`CREATE SCHEMA ${schema}`);
  await db.query(`SET search_path TO ${schema},public`);
  await db.query(`CREATE TABLE organization(id uuid PRIMARY KEY,name text,type text);
   CREATE TABLE app_user(id uuid PRIMARY KEY,name text,email text,role text,organization_id uuid,ativo boolean DEFAULT true);
   CREATE TABLE revoked_token(jti text,expires_at timestamptz);
   CREATE TABLE asset(id uuid PRIMARY KEY,organization_id uuid,label text);
   CREATE TABLE reading(id uuid PRIMARY KEY,asset_id uuid,health_score int,diagnostico jsonb)`);
  await db.query(readFileSync(new URL('../migrations/maintenance/0001_manual_packages.sql',import.meta.url),'utf8'));
  const url=new URL(process.env.MAINTENANCE_TEST_DATABASE_URL);url.searchParams.set('options',`-c search_path=${schema},public`);
  process.env.DATABASE_URL=url.href;
  const {exigeLogin,exigeAdmin,gerarToken}=await import('../src/auth.js');
  const {query,withTransaction}=await import('../src/db.js');
  const a=randomUUID(),b=randomUUID(),user=randomUUID(),other=randomUUID(),asset=randomUUID(),reading=randomUUID(),pkg=randomUUID(),use=randomUUID();
  await db.query('INSERT INTO organization(id) VALUES($1),($2)',[a,b]);
  await db.query("INSERT INTO app_user(id,organization_id,role) VALUES($1,$2,'cliente'),($3,$4,'cliente')",[user,a,other,b]);
  await db.query('INSERT INTO asset VALUES($1,$2,$3)',[asset,a,'Aquário QA']);
  await db.query('INSERT INTO reading VALUES($1,$2,90,$3)',[reading,asset,{acoes:[{hobby:'<script>texto sem HTML</script>'}]}]);
  await db.query('INSERT INTO manutencao_pacote_manual(id,organization_id,total_visitas) VALUES($1,$2,3)',[pkg,a]);
  await db.query("INSERT INTO manutencao_uso_manual(id,pacote_id,organization_id,data_visita,relatorio_url) VALUES($1,$2,$3,'2026-10-01',$4)",[use,pkg,a,`/api/laudo/${reading}/cliente`]);
  const app=express();app.use(express.json());registrarManutencoesManuais({app,query,withTransaction,exigeLogin,exigeAdmin});
  server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
  const token=gerarToken({id:user}),otherToken=gerarToken({id:other});
  const req=async(path,t=token)=>fetch(`http://127.0.0.1:${server.address().port}`+path,{headers:t?{authorization:'Bearer '+t}:{}});
  const path=`/api/cliente/manutencoes/usos/${use}/relatorio`;
  assert.equal((await req(path,null)).status,401);
  assert.equal((await req(path,otherToken)).status,404);
  let r=await req(path);assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');assert.match((await r.json()).texto,/<script>/);
  r=await req('/api/cliente/manutencoes');const summary=await r.json();assert.deepEqual([summary.pacotes[0].total_visitas,summary.pacotes[0].utilizadas,summary.pacotes[0].restantes],[3,1,2]);assert.equal(summary.usos[0].data_visita,'2026-10-01');
  assert.equal((await (await req('/api/cliente/manutencoes?organization_id='+a,otherToken)).json()).usos.length,0);
  assert.equal((await req('/api/admin/clientes/'+a+'/manutencoes')).status,403);
  await db.query('UPDATE asset SET organization_id=$1 WHERE id=$2',[b,asset]);assert.equal((await req(path)).status,404);
  await db.query('UPDATE asset SET organization_id=$1 WHERE id=$2',[a,asset]);
  for(const link of ['https://example.org/private.pdf','javascript:alert(1)','//example.org/a','/painel.html#ficticio']){
   await db.query('UPDATE manutencao_uso_manual SET relatorio_url=$1 WHERE id=$2',[link,use]);assert.equal((await req(path)).status,404);
  }
  await db.query('UPDATE manutencao_uso_manual SET relatorio_url=$1,anulado_em=now() WHERE id=$2',[`/api/laudo/${reading}/cliente`,use]);assert.equal((await req(path)).status,404);
  await db.query('UPDATE app_user SET ativo=false WHERE id=$1',[user]);assert.equal((await req(path)).status,401);
 }finally{
  if(server)await new Promise(r=>server.close(r));
  await db.query(`DROP SCHEMA ${schema} CASCADE`);await db.end();
 }
});
