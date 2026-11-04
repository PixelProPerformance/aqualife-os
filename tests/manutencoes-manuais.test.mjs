import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registrarManutencoesManuais } from '../src/manutencoes-manuais.js';

const app={routes:new Map()};
for (const verb of ['get','post','patch','delete']) app[verb]=(path,...handlers)=>app.routes.set(verb.toUpperCase()+' '+path,handlers.at(-1));
const uid='33333333-3333-4333-8333-333333333333';
const orgA='11111111-1111-4111-8111-111111111111';
const orgB='22222222-2222-4222-8222-222222222222';
const pkg='44444444-4444-4444-8444-444444444444';
const res=()=>({code:200,data:null,status(c){this.code=c;return this},json(b){this.data=b;return this}});
let calls=[];
const query=async(sql,params=[])=>{
 calls.push({sql,params});
 if(sql.includes('FROM manutencao_pacote_manual p'))return {rows:[]};
 if(sql.includes('COUNT(*)::int'))return {rows:[{n:0}]};
 return {rows:[]};
};
const withTransaction=async(fn)=>fn({query});
registrarManutencoesManuais({app,query,withTransaction,exigeLogin:()=>{},exigeAdmin:()=>{}});

test('painel do cliente utiliza organization_id do JWT, não ID vindo do navegador',async()=>{
 calls=[];
 const response=res();
 await app.routes.get('GET /api/cliente/manutencoes')({usuario:{id:uid,organization_id:orgA}},response);
 assert.equal(response.code,200);
 assert.equal(response.data.tipo,'avulsa');
 assert.equal(calls.length,2);
 assert.ok(calls.every(c=>c.params[0]===orgA));
});
test('apenas rotas Admin permitem criar e lançar visitas',()=>{
 const src=readFileSync(new URL('../src/manutencoes-manuais.js',import.meta.url),'utf8');
 assert.match(src,/app.post\('\/api\/admin\/clientes\/:orgId\/manutencoes\/pacotes',\.\.\.admin/);
 assert.match(src,/app.post\('\/api\/admin\/clientes\/:orgId\/manutencoes\/pacotes\/:pacoteId\/usos',\.\.\.admin/);
});
test('lançamento sem data ou link válido é rejeitado antes de escrever',async()=>{
 calls=[];
 const h=app.routes.get('POST /api/admin/clientes/:orgId/manutencoes/pacotes/:pacoteId/usos');
 const response=res();
 await h({params:{orgId:orgA,pacoteId:pkg},body:{data_visita:'2026-99-99',relatorio_url:'javascript:alert(1)'},usuario:{id:uid}},response);
 assert.equal(response.code,400);assert.equal(calls.length,0);
});
test('criação de pacote rejeita quantidades fracionárias e negativas',async()=>{
 calls=[];
 const h=app.routes.get('POST /api/admin/clientes/:orgId/manutencoes/pacotes');
 for(const n of [-1,1.5,10001]){
  const response=res();await h({params:{orgId:orgB},body:{total_visitas:n},usuario:{id:uid}},response);
  assert.equal(response.code,400);
 }
 assert.equal(calls.length,0);
});
test('saldo manual independe de agendamentos e de leituras automáticas',()=>{
 const src=readFileSync(new URL('../src/manutencoes-manuais.js',import.meta.url),'utf8');
 assert.match(src,/FROM manutencao_uso_manual/);
 assert.match(src,/anulado_em IS NULL/);
 assert.doesNotMatch(src,/FROM\s+reading\b|FROM\s+solicitacao\b/);
});
