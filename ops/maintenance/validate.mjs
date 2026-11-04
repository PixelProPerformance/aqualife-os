import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import {app} from '../../src/server.js';
assert.equal(process.env.RAILWAY_PROJECT_ID,'f0a54aac-7782-432e-9339-77a261e2c4c8');
const db=new pg.Client({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}});
await db.connect();
assert.equal((await db.query('SELECT current_database() n')).rows[0].n,'aqualife_marketplace_staging');
const server=app.listen(Number(process.env.PORT||8080),'0.0.0.0');
await new Promise(resolve=>server.once('listening',resolve));
const base='http://127.0.0.1:'+server.address().port;
let step='init'; const run=randomUUID().slice(0,8);
async function req(path,{token,method,body,status=200}={}){
 step=(method|| (body?'POST':'GET'))+' '+path;
 const r=await fetch(base+path,{method:method||(body?'POST':'GET'),headers:{...(token?{authorization:'Bearer '+token}:{}),...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
 assert.equal(r.status,status,step);const d=await r.json();console.log(JSON.stringify({pass:step,status}));return d;
}
async function user(org,role,email){
 email=email.replace('@','+'+run+'@'); const id=randomUUID();await db.query('INSERT INTO app_user(id,organization_id,name,email,senha_hash,role) VALUES($1,$2,$3,$4,$5,$6)',[id,org,'Teste Manutenções',email,await bcrypt.hash(process.env.QA_PASSWORD,10),role]);
 const d=await req('/api/login',{body:{email,senha:process.env.QA_PASSWORD}});console.log(JSON.stringify({fixture_role:role,email}));return {id,org,token:d.token};
}
try{
 const org=randomUUID();await db.query('INSERT INTO organization(id,name) VALUES($1,$2)',[org,'Admin Fictício Manutenções']);
 const admin=await user(org,'admin','admin-manutencoes-20261104@example.invalid');
 const a=await req('/api/admin/clientes',{token:admin.token,body:{nome:'Cliente Teste Manutenções',manutencoes_total:3,aquario:{label:'Aquário Fictício',water_type:'freshwater',volume_liters:100}},status:201});
 const b=await req('/api/admin/clientes',{token:admin.token,body:{nome:'Cliente Teste Avulso Manutenções',manutencoes_total:0},status:201});
 const client=await user(a.id,'cliente','cliente-manutencoes-20261104@example.invalid');
 const other=await user(b.id,'cliente','avulso-manutencoes-20261104@example.invalid');
 const root='/api/admin/clientes/'+a.id+'/manutencoes';
 const summary=async(total,used,left)=>{for(const [p,t] of [[root,admin.token],['/api/cliente/manutencoes',client.token]]){const d=await req(p,{token:t});assert.deepEqual([d.pacotes[0].total_visitas,d.pacotes[0].utilizadas,d.pacotes[0].restantes],[total,used,left]);}const d=await req(root,{token:admin.token});return d.pacotes[0].id;};
 const pid=await summary(3,0,3), pkg=root+'/pacotes/'+pid;
 const asset=(await db.query('SELECT id FROM asset WHERE organization_id=$1',[a.id])).rows[0].id;
 const report=randomUUID();
 await db.query('INSERT INTO reading(id,asset_id,organization_id,technician_id,values,health_score,urgency,diagnostico) VALUES($1,$2,$3,$4,$5,100,$6,$7)',[report,asset,a.id,admin.id,{},'ok',{acoes:[{hobby:'Relatório fictício de homologação, sem informações pessoais.'}]}]);
 await req('/api/laudo/'+report+'/cliente',{token:client.token});
 await req('/api/laudo/'+report+'/cliente',{token:other.token,status:403});
 const use=async(day,status=201)=>req(pkg+'/usos',{token:admin.token,body:{data_visita:'2026-10-'+day,relatorio_url:'/painel.html#relatorio-ficticio-'+day,observacao:'Relatório fictício sem dados pessoais'},status});
 await use('01');await summary(3,1,2);await use('02');const third=await use('03');await summary(3,3,0);await use('04',409);
 await req(pkg+'/usos/'+third.id,{token:admin.token,method:'DELETE'});await summary(3,2,1);
 await req(pkg,{token:admin.token,method:'PATCH',body:{total_visitas:5}});await summary(5,2,3);
 await req(pkg,{token:admin.token,method:'PATCH',body:{total_visitas:1},status:409});
 await req('/api/admin/clientes/'+a.id,{token:admin.token,method:'DELETE',status:409});
 assert.equal((await req('/api/cliente/manutencoes',{token:other.token})).tipo,'avulsa');
 const isolated=await req('/api/cliente/manutencoes?organization_id='+a.id,{token:other.token});assert.equal(isolated.pacotes.length,0);assert.equal(isolated.usos.length,0);
 await req(root,{token:other.token,status:403});await req('/api/cliente/manutencoes',{status:401});
 await req('/api/admin/clientes/'+b.id+'/manutencoes/pacotes/'+pid+'/usos',{token:admin.token,body:{data_visita:'2026-10-04',relatorio_url:'https://example.org/ficticio.pdf'},status:404});
 for(const p of ['/api/eu','/api/dashboard','/api/aquarios','/api/cliente/painel','/api/eu/assinatura'])await req(p,{token:client.token});
 for(const p of ['/api/admin/clientes','/api/admin/agendamentos','/api/admin/financeiro','/api/admin/laudos','/api/admin/academy/cursos'])await req(p,{token:admin.token});
 await req('/api/academy/cursos',{token:client.token,status:402});
 await db.query("INSERT INTO subscription(user_id,organization_id,price_cents,status,current_period_end) VALUES($1,$2,0,'ativa',now()+interval '1 day')",[client.id,a.id]);
 await req('/api/academy/cursos',{token:client.token});
 const course=await req('/api/admin/academy/cursos',{token:admin.token,body:{titulo:'Curso fictício Manutenções 20261104',publicado:true},status:201});
 const lesson=await req('/api/admin/academy/cursos/'+course.id+'/aulas',{token:admin.token,body:{titulo:'Aula fictícia',conteudo:'<p>Conteúdo de homologação</p>'},status:201});
 await req('/api/academy/cursos/'+course.id,{token:client.token});
 await req('/api/academy/cursos/'+course.id+'/aula/'+lesson.id+'/concluir',{token:client.token,body:{}});
 const tech=await user(org,'tecnico','tecnico-manutencoes-20261104@example.invalid');
 for(const p of ['/api/tecnico/oportunidades','/api/tecnico/recebimentos','/api/tecnico/aquarios'])await req(p,{token:tech.token});
 await req('/api/admin/oportunidades',{token:admin.token});
 const product=await req('/api/admin/loja/produtos',{token:admin.token,body:{nome:'Produto fictício Manutenções',ativo:true,preco_cents:1234,estoque:5}});
 const detail=await req('/api/admin/loja/produtos/'+product.id,{token:admin.token});
 const cart=await req('/api/loja/carrinho',{body:{itens:[{variacao_id:detail.variacoes[0].id,qty:2}]}});
 assert.ok(cart);
 await req('/api/especies');await req('/api/loja/produtos');
 console.log(JSON.stringify({result:'PASS',scope:'MANUAL_MAINTENANCE_HTTP_QA',organization_id:a.id,package_id:pid,other_organization_id:b.id,initial:[3,0,3],after_one:[3,1,2],exhausted:[3,3,0],fourth_blocked:true,after_void:[3,2,1],after_adjustment:[5,2,3],tenant_isolation:true,legacy_smoke:true}));
}catch(e){console.error(JSON.stringify({result:'FAIL',step,code:e.code||e.name,expected:e.expected,actual:e.actual}));process.exitCode=1;server.close();await db.end();process.exit(1);}
await db.end();
console.log(JSON.stringify({ready_for_browser:true}));


