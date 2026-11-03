import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import pg from 'pg';
import { registrarManutencoesManuais } from '../src/manutencoes-manuais.js';

const url=process.env.MAINTENANCE_TEST_DATABASE_URL;
test('PostgreSQL real: migração idempotente, isolamento e saldo manual', {skip:!url}, async()=>{
 const pool=new pg.Pool({connectionString:url});
 const uid='33333333-3333-4333-8333-333333333333';
 const orgA='11111111-1111-4111-8111-111111111111',orgB='22222222-2222-4222-8222-222222222222';
 try{
  await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;
    CREATE TABLE IF NOT EXISTS organization(id UUID PRIMARY KEY,name TEXT,type TEXT);
    CREATE TABLE IF NOT EXISTS app_user(id UUID PRIMARY KEY)`);
  const migration=readFileSync(new URL('../migrations/maintenance/0001_manual_packages.sql',import.meta.url),'utf8');
  await pool.query(migration);
  await pool.query(migration);
  await pool.query('INSERT INTO organization(id,name,type) VALUES ($1,\'A\',\'residential\'),($2,\'B\',\'residential\') ON CONFLICT DO NOTHING',[orgA,orgB]);
  await pool.query('INSERT INTO app_user(id) VALUES ($1) ON CONFLICT DO NOTHING',[uid]);
  const query=(sql,args)=>pool.query(sql,args);
  const withTransaction=async fn=>{const c=await pool.connect();try{await c.query('BEGIN');const r=await fn(c);await c.query('COMMIT');return r;}catch(e){await c.query('ROLLBACK');throw e}finally{c.release();}};
  const app={routes:new Map()};
  for(const method of ['get','post','patch','delete'])app[method]=(name,...handlers)=>app.routes.set(method.toUpperCase()+' '+name,handlers.at(-1));
  registrarManutencoesManuais({app,query,withTransaction,exigeLogin:()=>{},exigeAdmin:()=>{}});
  const res=()=>({statusCode:200,body:null,status(s){this.statusCode=s;return this},json(b){this.body=b;return this}});
  const call=async(method,path,req)=>{const r=res();await app.routes.get(method+' '+path)(req,r);return r;};
  const create=await call('POST','/api/admin/clientes/:orgId/manutencoes/pacotes',{params:{orgId:orgA},body:{descricao:'Trimestral',total_visitas:2},usuario:{id:uid}});
  assert.equal(create.statusCode,201);const pid=create.body.id;
  const use=(org,date)=>call('POST','/api/admin/clientes/:orgId/manutencoes/pacotes/:pacoteId/usos',{
   params:{orgId:org,pacoteId:pid},body:{data_visita:date,relatorio_url:'https://example.org/laudo.pdf'},usuario:{id:uid}});
  assert.equal((await use(orgB,'2026-10-01')).statusCode,404);
  assert.equal((await use(orgA,'2026-10-01')).statusCode,201);
  const second=await use(orgA,'2026-10-02');assert.equal(second.statusCode,201);
  assert.equal((await use(orgA,'2026-10-03')).statusCode,409);
  const a=await call('GET','/api/cliente/manutencoes',{usuario:{id:uid,organization_id:orgA}});
  const b=await call('GET','/api/cliente/manutencoes',{usuario:{id:uid,organization_id:orgB}});
  assert.equal(a.body.pacotes[0].utilizadas,2);
  assert.equal(a.body.pacotes[0].restantes,0);
  assert.equal(b.body.pacotes.length,0);
  assert.equal(b.body.usos.length,0);
  const lower=await call('PATCH','/api/admin/clientes/:orgId/manutencoes/pacotes/:pacoteId',{params:{orgId:orgA,pacoteId:pid},body:{total_visitas:1},usuario:{id:uid}});
  assert.equal(lower.statusCode,409);
  const undo=await call('DELETE','/api/admin/clientes/:orgId/manutencoes/pacotes/:pacoteId/usos/:usoId',{params:{orgId:orgA,pacoteId:pid,usoId:second.body.id},usuario:{id:uid}});
  assert.equal(undo.statusCode,200);
  const after=await call('GET','/api/cliente/manutencoes',{usuario:{id:uid,organization_id:orgA}});
  assert.equal(after.body.pacotes[0].utilizadas,1);
  assert.equal(after.body.pacotes[0].restantes,1);
 }finally{await pool.end();}
});
