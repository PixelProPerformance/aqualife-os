import test from 'node:test';
import assert from 'node:assert/strict';
import {app} from '../src/server.js';

test('real server mounts marketplace API before its HTML/API fallback',async()=>{
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const base=`http://127.0.0.1:${server.address().port}`;
 try{
  for(const path of ['/api/marketplace/my-sellers','/api/admin/marketplace/sellers','/api/marketplace/catalog/products','/api/admin/marketplace/catalog/submissions','/api/marketplace/sellers/11111111-1111-4111-8111-111111111111/catalog/offers','/api/marketplace/sellers/11111111-1111-4111-8111-111111111111/dashboard','/api/marketplace/sellers/11111111-1111-4111-8111-111111111111/profile']) {
   const r=await fetch(base+path);assert.equal(r.status,401,path);assert.match((await r.json()).erro,/autenticado/);
  }
  for(const path of ['/lojista.html','/marketplace-admin.html','/marketplace-catalog-admin.html','/js/marketplace.js','/js/marketplace-catalog.js','/css/marketplace.css'])assert.equal((await fetch(base+path)).status,200,path);
  assert.equal((await fetch(base+'/api/marketplace/unknown')).status,404);
  for(const path of ['/api/marketplace/cart','/api/marketplace/preparations','/api/marketplace/sellers/11111111-1111-4111-8111-111111111111/preparations'])assert.equal((await fetch(base+path)).status,401,path);
  for(const path of ['/marketplace-carrinho.html','/js/marketplace-cart.js','/js/marketplace-preparation.js'])assert.equal((await fetch(base+path)).status,200,path);
  assert.equal((await fetch(base+'/api/marketplace/showcase')).status,404);
  for(const path of ['/marketplace.html','/js/marketplace-showcase.js','/js/marketplace-showcase-editor.js'])assert.equal((await fetch(base+path)).status,200,path);
  for(const path of ['/api/admin/marketplace/catalog/offers','/api/admin/marketplace/catalog/legacy'])assert.equal((await fetch(base+path)).status,401,path);
  const connection='/api/marketplace/sellers/11111111-1111-4111-8111-111111111111/payments/connection';
  assert.equal((await fetch(base+connection)).status,401);
  for(const action of ['authorize','refresh','disconnect'])assert.equal((await fetch(base+connection+'/'+action,{method:'POST'})).status,401,action);
  const callback=await fetch(base+'/api/marketplace/mp/oauth/callback',{redirect:'manual'});assert.equal(callback.status,303);assert.equal(callback.headers.get('location'),'/lojista.html?mp_connection=failed');
  assert.equal((await fetch(base+'/js/marketplace-payments.js')).status,200);
 }finally{await new Promise(r=>server.close(r));}
});
