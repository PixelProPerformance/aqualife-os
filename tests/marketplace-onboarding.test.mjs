import test from 'node:test';
import assert from 'node:assert/strict';
import {cnpjValido,perfilValido} from '../src/marketplace/validation.js';
import {registrarOnboarding} from '../src/marketplace/onboarding.js';
import express from 'express';
test('CNPJ rejects repeated digits, bad checksums and embedded letters',()=>{
 for(const v of ['',null,123,'11111111111111','11222333000182','abc11222333000181'])assert.equal(cnpjValido(v),false);
 for(const v of ['11.222.333/0001-81','11222333000181'])assert.equal(cnpjValido(v),true);
});
test('profile requires contact and Brazilian address without truncation',()=>{
 const p={legal_name:'Empresa',trade_name:'Loja',contact_name:'Pessoa',contact_email:'test@example.invalid',contact_phone:'11999999999',zip_code:'01001-000',street:'Rua teste',number:'s/n',city:'São Paulo',state:'sp'};
 assert.equal(perfilValido(p).state,'SP');
 for(const patch of [{contact_email:'bad'},{zip_code:'123'},{state:'ZZ'},{legal_name:'x'.repeat(181)},{street:'bad\nvalue'},{contact_phone:''}])assert.equal(perfilValido({...p,...patch}),null);
});
test('every onboarding route requires login before database access; invalid application never writes',async()=>{
 const app=express();app.use(express.json());let calls=0;
 const query=async()=>{calls++;throw Error('must not query');};
 registrarOnboarding({app,query,withTransaction:query,exigeLogin:(req,res,next)=>req.headers.authorization? (req.usuario={id:'11111111-1111-4111-8111-111111111111'},next()):res.status(401).json({erro:'login'}),exigeAdmin:(_,res)=>res.status(403).json({erro:'admin'})});
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const base=`http://127.0.0.1:${server.address().port}`;
 try{
  for(const [path,method] of [['/api/marketplace/my-sellers','GET'],['/api/marketplace/sellers/apply','POST'],['/api/marketplace/sellers/x/profile','PATCH'],['/api/marketplace/sellers/x/members','POST'],['/api/admin/marketplace/sellers','GET']])assert.equal((await fetch(base+path,{method})).status,401);
  assert.equal((await fetch(base+'/api/marketplace/sellers/apply',{method:'POST',headers:{authorization:'synthetic','content-type':'application/json'},body:'{}'})).status,400);
  assert.equal((await fetch(base+'/api/admin/marketplace/sellers',{headers:{authorization:'synthetic'}})).status,403);
  assert.equal(calls,0);
 }finally{await new Promise(r=>server.close(r));}
});
