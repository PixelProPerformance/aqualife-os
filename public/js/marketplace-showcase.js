const $=id=>document.getElementById(id),params=new URLSearchParams(location.search),content=$('content'),money=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v)/100);
function el(tag,text,props={}){const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);Object.assign(n,props);return n;}
function card(title){const c=el('article',undefined,{className:'card'});c.append(el('h2',title));return c;}
function link(text,key,id){return el('a',text,{href:'/marketplace.html?'+key+'='+encodeURIComponent(id)});}
function productInfo(p,c){if(p.image_url)c.append(el('img',undefined,{src:p.image_url,alt:p.title,className:'catalog-image'}));c.append(el('p',p.description),el('p',[p.category,p.brand,p.model,p.gtin?'GTIN '+p.gtin:''].filter(Boolean).join(' · '),{className:'muted'}));const dl=el('dl');for(const [k,v] of Object.entries(p.technical_attributes||{}))dl.append(el('dt',k),el('dd',v));if(dl.children.length)c.append(dl);if(p.legacy_reference_id)c.append(el('a','Consultar produto, variações e imagens originais na loja Aqualife',{href:'/produto.html?id='+encodeURIComponent(p.legacy_reference_id)}));}
let offset=0;
async function load(){content.setAttribute('aria-busy','true');$('message').textContent='';try{
 const q=new URLSearchParams({search:$('search').value,offset:String(offset)});for(const k of ['product','seller'])if(params.has(k))q.set(k,params.get(k));
 const response=await fetch('/api/marketplace/showcase?'+q),data=await response.json();if(!response.ok)throw Error(data.erro||'Vitrine temporariamente indisponível.');
 $('ranking').textContent=data.ranking_policy;content.replaceChildren();const rows=data.offers;
 if(params.has('seller')&&rows.length){const c=card(rows[0].sold_by);c.append(el('p',rows[0].biography),el('p',[rows[0].city,rows[0].state].filter(Boolean).join(' · ')));content.append(c);document.title=rows[0].sold_by+' — Aqualife Marketplace';}
 const groups=new Map();for(const row of rows){if(!groups.has(row.product_id))groups.set(row.product_id,[]);groups.get(row.product_id).push(row);}
 for(const offers of groups.values()){
  const p=offers[0],c=card(p.title);productInfo(p,c);
  if(!params.has('product'))c.append(link('Ver produto e comparar lojas','product',p.product_id));
  const wrap=el('div',undefined,{className:'table-wrap'}),t=el('table',undefined,{className:'showcase-comparison'}),head=el('thead'),tr=el('tr'),labels=['Vendido por','Variação','Preço do produto','Disponibilidade','Preparo','Garantia e condições'];for(const h of labels)tr.append(el('th',h,{scope:'col'}));head.append(tr);t.append(head);const body=el('tbody');
  for(const o of offers){const row=el('tr'),seller=el('td');seller.dataset.label=labels[0];seller.append(link(o.sold_by,'seller',o.seller_id));row.append(seller);for(const [index,value] of [o.variant_label||'Padrão',money(o.price_cents),o.in_stock?'Disponível para futura ativação':'Sem estoque',o.handling_days+' dias',o.warranty+' · '+o.conditions].entries()){const td=el('td',value);td.dataset.label=labels[index+1];row.append(td);}body.append(row);}t.append(body);wrap.append(t);c.append(wrap,el('button','Compras ainda não disponíveis',{disabled:true,type:'button'}));content.append(c);
 }
 if(!rows.length)content.append(card('Nenhuma oferta aprovada para exibição nesta consulta.'));
 const pagination=$('pagination');pagination.replaceChildren();for(const [text,next] of [...(offset?[['Anterior',Math.max(0,offset-100)]]:[]),...(rows.length===100?[['Próximas ofertas',offset+100]]:[])]){const b=el('button',text,{type:'button',className:'secondary'});b.addEventListener('click',()=>{offset=next;load();});pagination.append(b);}
 }catch(error){content.replaceChildren(card(error.message));$('message').textContent=error.message;}finally{content.setAttribute('aria-busy','false');}}
$('search-form').addEventListener('submit',event=>{event.preventDefault();offset=0;load();});load();
