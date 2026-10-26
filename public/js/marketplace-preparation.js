export const preparationNotice='Preparação temporária, sem compra. Reservas duram 15 minutos e não são renovadas por repetição. Pagamentos e expedição bloqueados; frete não calculado.';
const states={reserved:'Reserva temporária',partially_reserved:'Parcialmente reservada',cancelled:'Cancelada',expired:'Expirada'};
export async function sellerPreparations(ctx){
 const {api,el,card,button,money,date,sellerId,store,refresh}=ctx,panel=card('Reservas e subpedidos de preparação');panel.append(el('p',preparationNotice,{className:'notice'}));
 const data=await api(`/api/marketplace/sellers/${sellerId}/preparations`);
 if(!data.suborders.length)panel.append(el('p','Nenhum subpedido de preparação desta loja.'));
 for(const order of data.suborders){const c=card('Subpedido '+order.id.slice(0,8));c.append(el('p',(states[order.state]||order.state)+' · Até '+date(order.expires_at)),el('p','Subtotal dos produtos: '+money(order.subtotal_cents)));
  for(const item of order.items)c.append(el('p',`${item.qty} × ${item.product_snapshot.title} · ${item.product_snapshot.variant_label||'Padrão'} · ${money(item.unit_price_cents)} por unidade`));
  c.append(el('p','Pagamento bloqueado · separação não iniciada · expedição bloqueada · rastreio e fiscal não disponíveis.',{className:'muted'}));
  if(store?.role==='owner'&&['reserved'].includes(order.state))c.append(button('Recusar reserva e devolver estoque',async()=>{await api(`/api/marketplace/sellers/${sellerId}/preparations/${order.id}/cancel`,{method:'POST',body:{}});await refresh();},true));
  for(const event of order.events)c.append(el('p',date(event.created_at)+' · '+event.note,{className:'muted'}));panel.append(c);
 }return panel;
}
export async function addMarketplaceOffer(offerId){
 const token=localStorage.getItem('aqualife_token');if(!token){location.href='/marketplace-carrinho.html';return;}
 async function request(path,options={}){const r=await fetch(path,{...options,headers:{'content-type':'application/json',authorization:'Bearer '+token},body:options.body?JSON.stringify(options.body):undefined});const d=await r.json();if(!r.ok)throw Error(d.erro||'Carrinho indisponível');return d;}
 const cart=await request('/api/marketplace/cart'),old=cart.items.find(o=>o.offer_id===offerId);await request('/api/marketplace/cart/items/'+encodeURIComponent(offerId),{method:'PUT',body:{qty:(old?.qty||0)+1,revision:cart.revision}});location.href='/marketplace-carrinho.html';
}
