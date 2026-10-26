import assert from 'node:assert/strict';
export async function checkShowcase({request,a,b,staff,admin,sa,sb,oa,ob,productId}){
 const base=id=>`/api/marketplace/sellers/${id}/catalog`,conditions={warranty:'Garantia informada para homologação fictícia.',handling_days:2,conditions:'Consulta sem venda, envio ou cobrança.'};
 await request(base(sa)+'/public-profile',b,{status:403});
 const publicProfile={biography:'Loja exclusivamente fictícia para teste.',city:'São Paulo',state:'SP',consent:true};
 await request(base(sa)+'/public-profile',staff,{method:'PUT',body:{...publicProfile,revision:0},status:403});
 for(const [seller,user,offer] of [[sa,a,oa],[sb,b,ob]]){
  const profile=await request(base(seller)+'/public-profile',user);
  await request(base(seller)+'/public-profile',user,{method:'PUT',body:{...publicProfile,revision:profile.revision}});
  const current=(await request(base(seller)+'/offers',user)).find(o=>o.id===offer);
  await request(`${base(seller)}/offers/${offer}/presentation`,staff,{method:'PUT',body:{...conditions,revision:0,offer_revision:current.revision},status:403});
  const p=await request(`${base(seller)}/offers/${offer}/presentation`,user,{method:'PUT',body:{...conditions,revision:0,offer_revision:current.revision}});
  await request(`${base(seller)}/offers/${offer}/review`,user,{body:{revision:p.revision,offer_revision:current.revision}});
  const queue=await request('/api/admin/marketplace/catalog/offers',admin),pending=queue.find(o=>o.offer_id===offer);assert.equal(pending.review_status,'pending');
  await request(`/api/admin/marketplace/catalog/offers/${offer}/decision`,user,{method:'PATCH',body:{status:'approved',note:'Synthetic',revision:pending.revision},status:403});
  await request(`/api/admin/marketplace/catalog/offers/${offer}/decision`,admin,{method:'PATCH',body:{status:'approved',note:'Revisão sintética de produto, loja e condições.',revision:pending.revision}});
 }
 const publicData=await request('/api/marketplace/showcase?product='+productId,a);assert.equal(publicData.commerce_enabled,false);assert.match(publicData.ranking_policy,/Sem preferência/);
 assert.equal(publicData.offers.length,2);assert.equal(publicData.offers[0].offer_id,oa);assert.deepEqual(new Set(publicData.offers.map(o=>o.seller_id)),new Set([sa,sb]));
 for(const row of publicData.offers){assert.ok(row.sold_by);for(const key of ['cnpj','contact_email','street','seller_sku','actor_user_id','reserved_qty'])assert.equal(Object.hasOwn(row,key),false,key);}
 const repeat=await request('/api/marketplace/showcase?product='+productId,a);assert.deepEqual(repeat.offers.map(o=>o.offer_id),publicData.offers.map(o=>o.offer_id));
 await request(`/api/marketplace/sellers/${sa}/offers/${oa}/publish`,a,{body:{},status:409});
 assert.equal((await request('/api/marketplace/showcase?seller='+sa,a)).offers.every(o=>o.seller_id===sa),true);
 const profile=await request(base(sb)+'/public-profile',b);await request(base(sb)+'/public-profile',b,{method:'PUT',body:{...publicProfile,consent:false,revision:profile.revision}});
 assert.equal((await request('/api/marketplace/showcase?product='+productId,a)).offers.length,1);
 const current=(await request(base(sa)+'/offers',a)).find(o=>o.id===oa);
 await request(`${base(sa)}/offers/${oa}`,a,{method:'PATCH',body:{seller_sku:current.seller_sku,variant_label:current.variant_label,price_cents:Number(current.price_cents),revision:current.revision}});
 assert.equal((await request('/api/marketplace/showcase?product='+productId,a)).offers.length,0);
 assert.equal((await request(base(sa)+'/presentations',a)).find(o=>o.offer_id===oa).review_status,'draft');
}
