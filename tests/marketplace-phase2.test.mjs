import test from 'node:test';
import assert from 'node:assert/strict';
import { registrarOnboarding } from '../src/marketplace/onboarding.js';
const id='11111111-1111-4111-8111-111111111111';
function appFake(){const routes=new Map();return {routes,post(path,...f){routes.set('POST '+path,f)},get(path,...f){routes.set('GET '+path,f)},patch(path,...f){routes.set('PATCH '+path,f)}};}
function resFake(){return {code:200,payload:null,status(n){this.code=n;return this},json(obj){this.payload=obj;return this}};}
const pass=(req,res,next)=>next();
test('onboarding valida CNPJ antes de escrever e bloqueia formato inválido',async()=>{
 let writes=0;const app=appFake();
 registrarOnboarding({app,query:async()=>{writes++;return {rows:[]}},withTransaction:async()=>{writes++;},exigeLogin:pass,exigeAdmin:pass});
 const fn=app.routes.get('POST /api/marketplace/sellers/apply').at(-1);
 const r=resFake();await fn({usuario:{id},body:{legal_name:'Empresa',trade_name:'Teste',cnpj:'11111111111111'}},r);
 assert.equal(r.code,400);assert.equal(writes,0);
});
test('aplicação cria seller pending, owner e settings sem aceitar encomendas',async()=>{
 const app=appFake(),queries=[];
 const tx=async fn=>fn({query:async(sql,params)=>{queries.push({sql,params});return {rows:[{id,status:'pending',trade_name:'Teste'}]};}});
 registrarOnboarding({app,query:async()=>({rows:[]}),withTransaction:tx,exigeLogin:pass,exigeAdmin:pass});
 const fn=app.routes.get('POST /api/marketplace/sellers/apply').at(-1);
 const r=resFake();await fn({usuario:{id},body:{legal_name:'Empresa',trade_name:'Teste',cnpj:'11222333000181'}},r);
 assert.equal(r.code,201);assert.equal(queries.length,4);
 assert.match(queries[0].sql,/pending/);assert.match(queries[1].sql,/owner/);assert.match(queries[2].sql,/false/);
});
test('dashboard nunca consulta sem middleware seller scoped',()=>{
 const app=appFake();registrarOnboarding({app,query:async()=>({rows:[]}),withTransaction:async()=>{},exigeLogin:pass,exigeAdmin:pass});
 assert.equal(app.routes.get('GET /api/marketplace/sellers/:sellerId/dashboard').length,3);
});
