import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { registrarServicos, SERVICOS_SCHEMA } from '../src/servicos.js';

const uri=process.env.SERVICOS_TEST_DATABASE_URL;
const uid='11111111-1111-4111-8111-111111111111';
const oid='22222222-2222-4222-8222-222222222222';
test('PostgreSQL 18: envios concorrentes geram exatamente um relatório e reembolso', {skip:!uri}, async()=>{
 const pool=new pg.Pool({connectionString:uri,max:5});
 try{
  await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;
    CREATE TABLE IF NOT EXISTS app_user(
       id UUID PRIMARY KEY,name TEXT,email TEXT,role TEXT,pix_chave TEXT,pix_tipo TEXT,pix_titular TEXT)`);
  for(const sql of SERVICOS_SCHEMA) await pool.query(sql);
  await pool.query('INSERT INTO app_user(id,name,email,role) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING',
    [uid,'Técnico Fictício','ficticio@example.invalid','tecnico']);
  await pool.query(`INSERT INTO oportunidade(id,titulo,tecnico_id,status,valor_cents)
    VALUES($1,'Teste concorrência',$2,'aceita',4000) ON CONFLICT(id) DO UPDATE SET status='aceita'`,[oid,uid]);
  const app={routes:new Map()};
  for(const m of ['get','post','patch','put','delete'])app[m]=(p,...f)=>app.routes.set(m.toUpperCase()+' '+p,f.at(-1));
  const tx=async fn=>{const c=await pool.connect();try{await c.query('BEGIN');const v=await fn(c);await c.query('COMMIT');return v;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}};
  registrarServicos({app,query:(s,p)=>pool.query(s,p),withTransaction:tx,
    exigeLogin:()=>{},exigeAdmin:()=>{},enviarEmail:null,baseUrl:'https://stage.example.invalid'});
  const resp=()=>({code:200,body:null,status(n){this.code=n;return this},json(obj){this.body=obj;return this}});
  const submit=app.routes.get('POST /api/tecnico/oportunidades/:id/relatorio');
  const req={usuario:{id:uid,role:'tecnico'},params:{id:oid},body:{
   observacao:'Relatório factual de teste',
   reembolsos:[{descricao:'Anticloro teste',valor_cents:4000}]}};
  const r1=resp(),r2=resp();
  await Promise.all([submit(req,r1),submit(req,r2)]);
  assert.deepEqual([r1.code,r2.code].sort(),[200,409]);
  const report=await pool.query('SELECT COUNT(*)::int AS n FROM oportunidade_relatorio WHERE oportunidade_id=$1',[oid]);
  const refund=await pool.query('SELECT COUNT(*)::int AS n FROM oportunidade_reembolso WHERE oportunidade_id=$1',[oid]);
  assert.equal(report.rows[0].n,1);
  assert.equal(refund.rows[0].n,1);
  const pending=resp();
  await app.routes.get('GET /api/admin/pagamentos/pendentes')({usuario:{id:uid,role:'admin'}},pending);
  assert.equal(pending.code,200);
  assert.equal(pending.body.total_geral_cents,4000);
  const refundId=(await pool.query('SELECT id FROM oportunidade_reembolso WHERE oportunidade_id=$1',[oid])).rows[0].id;
  const patch=app.routes.get('PATCH /api/admin/oportunidades/reembolso/:rid');
  const voided=resp();
  await patch({params:{rid:refundId},body:{status:'anulado',motivo:'Registro fictício para teste'},usuario:{id:uid,role:'admin'}},voided);
  assert.equal(voided.code,200);
  const after=resp();
  await app.routes.get('GET /api/admin/pagamentos/pendentes')({usuario:{id:uid,role:'admin'}},after);
  assert.equal(after.body.total_geral_cents,0);
  const audit=(await pool.query('SELECT status,anulacao_motivo,anulado_por FROM oportunidade_reembolso WHERE id=$1',[refundId])).rows[0];
  assert.equal(audit.status,'anulado');assert.equal(audit.anulado_por,uid);
 }finally{await pool.end();}
});
