import test from 'node:test';
import assert from 'node:assert/strict';
import { criarAutorizacaoSeller, sellerIdValido } from '../src/marketplace/authorization.js';
const A='11111111-1111-4111-8111-111111111111';
const B='22222222-2222-4222-8222-222222222222';
const U='33333333-3333-4333-8333-333333333333';
test('IDs inválidos recusados antes de consultar banco',async()=>{
 let calls=0;const {temAcesso}=criarAutorizacaoSeller(async()=>{calls++;return {rows:[]};});
 assert.equal(sellerIdValido('fake'),false);assert.equal(await temAcesso(U,'fake'),false);assert.equal(calls,0);
});
test('utilizador associado à loja A não acede à B',async()=>{
 const {temAcesso}=criarAutorizacaoSeller(async(sql,params)=>{
  assert.match(sql,/su.seller_id=\$2/);
  assert.match(sql,/su.active=true/);
  assert.match(sql,/s.status='approved'/);
  return {rows:params[1]===A?[{ '?column?':1 }]:[]};
 });
 assert.equal(await temAcesso(U,A),true);
 assert.equal(await temAcesso(U,B),false);
});
test('acesso de proprietário utiliza condição ownerOnly',async()=>{
 const {temAcesso}=criarAutorizacaoSeller(async(_,params)=>({rows:params[2]?[{ok:1}]:[]}));
 assert.equal(await temAcesso(U,A,{ownerOnly:true}),true);
 assert.equal(await temAcesso(U,A),false);
});
test('middleware recusa sem autenticação e sem associação',async()=>{
 const {exigeVendedor}=criarAutorizacaoSeller(async()=>({rows:[]}));
 const responses=[];
 const res={status(x){responses.push(x);return this;},json(x){return x;}};
 await exigeVendedor()({params:{sellerId:A}},res,()=>{throw Error('não devia autorizar')});
 await exigeVendedor()({usuario:{id:U},params:{sellerId:B}},res,()=>{throw Error('não devia autorizar')});
 assert.deepEqual(responses,[401,403]);
});
