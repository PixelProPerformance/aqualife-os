import test from 'node:test';
import assert from 'node:assert/strict';
import { registrarServicos } from '../src/servicos.js';
import { SERVICOS_SCHEMA } from '../src/servicos.js';

const tid='11111111-1111-4111-8111-111111111111';
const oid='22222222-2222-4222-8222-222222222222';
const rid='33333333-3333-4333-8333-333333333333';
const appFake=()=>{const routes=new Map(),app={routes};
 for(const m of ['get','post','patch','put','delete'])app[m]=(path,...f)=>routes.set(m.toUpperCase()+' '+path,f.at(-1));
 return app;};
const reply=()=>({code:200,body:null,status(n){this.code=n;return this},json(d){this.body=d;return this}});
function register(app,query,withTransaction){
 registrarServicos({app,query,withTransaction,exigeLogin:()=>{},exigeAdmin:()=>{},enviarEmail:null,baseUrl:'https://staging.example.test'});
}
test('relatório recebido duas vezes cria reembolsos só na primeira chamada',async()=>{
 let state='aceita',reports=0,refunds=0;
 const cx={query:async(sql)=>{
  if(sql.includes("UPDATE oportunidade SET status='relatorio_enviado'")){
   if(state!=='aceita')return {rows:[]};
   state='relatorio_enviado';return {rows:[{id:oid,tecnico_id:tid,titulo:'Teste'}]};
  }
  if(sql.includes('INSERT INTO oportunidade_relatorio')){reports++;return {rows:[]};}
  if(sql.includes('INSERT INTO oportunidade_reembolso')){refunds++;return {rows:[]};}
  throw Error('query inesperada: '+sql);
 }};
 const app=appFake();register(app,()=>{throw Error('não deveria executar fora da transação')},async fn=>fn(cx));
 const route=app.routes.get('POST /api/tecnico/oportunidades/:id/relatorio');
 const req={usuario:{id:tid,role:'tecnico'},params:{id:oid},body:{observacao:'Troca realizada',reembolsos:[{descricao:'Anticloro',valor_cents:4000}]}};
 const first=reply(),second=reply();await route(req,first);await route(req,second);
 assert.equal(first.code,200);assert.equal(second.code,409);
 assert.equal(reports,1);assert.equal(refunds,1);
});
test('fechamento inclui reembolso pré-aprovado mesmo sem serviço concluído',async()=>{
 const app=appFake(),q=async(sql)=>{
  if(sql.includes('FROM oportunidade o JOIN app_user u'))return {rows:[]};
  if(sql.includes('FROM oportunidade_reembolso r JOIN app_user u'))return {rows:[
   {id:rid,oportunidade_id:oid,descricao:'Anticloro',valor_cents:4000,tecnico_id:tid,
    tecnico_nome:'Técnico Teste',tecnico_email:'teste@example.invalid',pix_chave:null,pix_tipo:null,pix_titular:null}
  ]};
  throw Error('query inesperada: '+sql);
 };
 register(app,q,async()=>{});
 const out=reply();
 await app.routes.get('GET /api/admin/pagamentos/pendentes')({usuario:{id:tid,role:'admin'}},out);
 assert.equal(out.code,200);
 assert.equal(out.body.total_geral_cents,4000);
 assert.equal(out.body.tecnicos[0].total_reembolsos_cents,4000);
 assert.equal(out.body.tecnicos[0].total_servicos_cents,0);
});
test('Admin não consegue anular sem motivo e nunca apaga reembolso pago',async()=>{
 const app=appFake(),calls=[];
 const q=async(sql,args)=>{calls.push({sql,args});return {rows:[]};};
 register(app,q,async()=>{});
 const patch=app.routes.get('PATCH /api/admin/oportunidades/reembolso/:rid');
 const missing=reply();await patch({params:{rid},body:{status:'anulado'},usuario:{id:tid,role:'admin'}},missing);
 assert.equal(missing.code,400);assert.equal(calls.length,0);
 const paid=reply();await patch({params:{rid},body:{status:'anulado',motivo:'Lançamento repetido'},usuario:{id:tid,role:'admin'}},paid);
 assert.equal(paid.code,409);
 assert.match(calls[0].sql,/pago_em IS NULL AND lote_id IS NULL/);
 assert.match(calls[0].sql,/anulacao_motivo/);
});
test('schema inclui colunas de motivo e auditoria sem apagar dados',()=>{
 const schema=SERVICOS_SCHEMA.join('\n');
 assert.match(schema,/ADD COLUMN IF NOT EXISTS anulacao_motivo/);
 assert.match(schema,/ADD COLUMN IF NOT EXISTS anulado_em/);
 assert.match(schema,/ADD COLUMN IF NOT EXISTS anulado_por/);
});
