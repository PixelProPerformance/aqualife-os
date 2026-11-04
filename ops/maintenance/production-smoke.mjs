import assert from 'node:assert/strict';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import {randomUUID,createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
assert.equal(process.env.RAILWAY_PROJECT_ID,'5b0e93d9-9212-46ad-be57-90e4106a5452');
const db=new pg.Client({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}});
await db.connect();assert.equal((await db.query('SELECT current_database() n')).rows[0].n,'railway');
const emails=['qa-manual-release-admin-20261104@example.invalid','qa-manual-release-client-20261104@example.invalid'];
const base='https://aqualife-os-production.up.railway.app';let step='init';
async function req(path,{token,method,body,status=200}={}){step=(method||(body?'POST':'GET'))+' '+path;const r=await fetch(base+path,{method:method||(body?'POST':'GET'),headers:{...(token?{authorization:'Bearer '+token}:{}),...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});assert.equal(r.status,status,step);console.log(JSON.stringify({pass:step,status}));return r.json();}
try{
 if(process.env.MANUAL_RELEASE_ACTION==='cleanup'){
  const r=await db.query("UPDATE app_user SET ativo=false WHERE email=ANY($1::text[]) AND name='Homologação Manual Fictícia 20261104' RETURNING id",[emails]);
  console.log(JSON.stringify({result:'PASS',scope:'PRODUCTION_QA_ACCOUNTS_DISABLED',count:r.rowCount,history_preserved:true}));
 }else{
  for(const p of ['/api/saude','/api/especies','/api/loja/produtos'])await req(p);
  await req('/api/cliente/manutencoes',{status:401});await req('/api/loja/checkout',{body:{},status:400});
  for(const p of ['/admin.html','/dashboard.html','/painel.html','/academy.html','/aquabook.html','/loja.html','/servicos.html','/entrar.html'])assert.equal((await fetch(base+p)).status,200,p);
  for(const p of ['public/js/manutencoes-admin.js','public/js/manutencoes-cliente.js']){const remote=await(await fetch(base+'/'+p.replace('public/',''))).text();assert.equal(createHash('sha256').update(remote).digest('hex'),createHash('sha256').update(await readFile(p)).digest('hex'));}
  const org=randomUUID(),uid=randomUUID();
  await db.query('INSERT INTO organization(id,name) VALUES($1,$2)',[org,'QA Publicação Manutenções 20261104']);
  await db.query('INSERT INTO app_user(id,organization_id,name,email,senha_hash,role) VALUES($1,$2,$3,$4,$5,$6)',[uid,org,'Homologação Manual Fictícia 20261104',emails[0],await bcrypt.hash(process.env.QA_PASSWORD,10),'admin']);
  const admin=(await req('/api/login',{body:{email:emails[0],senha:process.env.QA_PASSWORD}})).token;
  const clientOrg=await req('/api/admin/clientes',{token:admin,body:{nome:'QA Cliente Fictício Manutenções 20261104',manutencoes_total:3},status:201});
  await db.query('INSERT INTO app_user(organization_id,name,email,senha_hash,role) VALUES($1,$2,$3,$4,$5)',[clientOrg.id,'Homologação Manual Fictícia 20261104',emails[1],await bcrypt.hash(process.env.QA_PASSWORD,10),'cliente']);
  const client=(await req('/api/login',{body:{email:emails[1],senha:process.env.QA_PASSWORD}})).token;
  const d=await req('/api/cliente/manutencoes',{token:client});assert.deepEqual([d.pacotes[0].total_visitas,d.pacotes[0].utilizadas,d.pacotes[0].restantes],[3,0,3]);
  const root='/api/admin/clientes/'+clientOrg.id+'/manutencoes';
  await req(root+'/pacotes/'+d.pacotes[0].id+'/usos',{token:admin,body:{data_visita:'2026-11-04',relatorio_url:'https://example.org/',observacao:'Teste fictício de publicação, sem dados pessoais'},status:201});
  const used=await req('/api/cliente/manutencoes',{token:client});assert.deepEqual([used.pacotes[0].total_visitas,used.pacotes[0].utilizadas,used.pacotes[0].restantes],[3,1,2]);
  await req(root,{token:client,status:403});
  for(const path of ['/api/eu','/api/aquarios','/api/cliente/painel','/api/eu/assinatura'])await req(path,{token:client});
  for(const path of ['/api/admin/clientes','/api/admin/agendamentos','/api/admin/financeiro','/api/admin/laudos','/api/admin/academy/cursos','/api/admin/oportunidades'])await req(path,{token:admin});
  await req('/api/logout',{token:admin,body:{}});await req('/api/logout',{token:client,body:{}});
  console.log(JSON.stringify({result:'PASS',scope:'PRODUCTION_HTTP_SMOKE',synthetic_organization:clientOrg.id,client_summary:[3,1,2],source_assets_verified:true,legacy_routes:true,payments_executed:false,fixtures_retained_for_browser:true}));
 }
}catch(e){console.error(JSON.stringify({result:'FAIL',step,code:e.code||e.name,expected:e.expected,actual:e.actual}));process.exitCode=1;}finally{await db.end();}
