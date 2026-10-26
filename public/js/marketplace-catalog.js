// UI for private catalog preparation. Data is rendered exclusively as text/DOM nodes.
export async function renderSellerCatalog(ctx){
 const {tab,sellerId,store,api,el,card,table,button,money,date,notice,refresh,notify}=ctx;
 const base=`/api/marketplace/sellers/${encodeURIComponent(sellerId)}/catalog`;
 const writable=store?.role==='owner'&&store?.status==='approved';
 const panel=card({products:'Produtos e moderação',offers:'Ofertas da loja',stock:'Estoque e movimentações'}[tab]);
 const nodes=[notice(),panel];
 const stateKey=sellerId+':'+tab,state=pages.get(stateKey)||{offset:0,search:''};pages.set(stateKey,state);
 const field=(form,label,key,value='',type='text',max=180)=>{const group=el('div',undefined,{className:'field'}),l=el('label',label),input=el(type==='textarea'?'textarea':'input',undefined,{id:'catalog-'+key,name:key,value:value??'',maxLength:max});if(type!=='textarea')input.type=type;l.htmlFor=input.id;group.append(l,input);form.append(group);return input;};
 function pager(rows,container){if(state.offset||rows.length===100){const actions=el('div',undefined,{className:'actions'});if(state.offset)actions.append(button('Anterior',()=>{state.offset=Math.max(0,state.offset-100);return refresh();},true));if(rows.length===100)actions.append(button('Próximos 100',()=>{state.offset+=100;return refresh();},true));container.append(actions);}}
 if(!writable)panel.append(el('p','Consulta disponível. Alterações exigem o proprietário de uma loja aprovada.',{className:'muted'}));
 if(tab==='products'){
  panel.append(el('p','Cadastre produtos novos, envie uma imagem e solicite análise. Um produto aprovado entra no catálogo compartilhado; preço, SKU e estoque ficam nas ofertas de cada loja.'));
  const rows=await api(`${base}/submissions?offset=${state.offset}`),editor=el('div');
  function edit(product){
   const form=el('form',undefined,{className:'catalog-form'}),grid=el('div',undefined,{className:'fields'}),inputs={};
   for(const [key,label,max,type] of [['title','Nome do produto',180],['category','Categoria',80],['brand','Marca (opcional)',120],['model','Modelo (opcional)',120],['gtin','GTIN/EAN (opcional)',14],['description','Descrição do produto',3000,'textarea']]){inputs[key]=field(grid,label,key,product?.[key],type||'text',max);inputs[key].required=['title','category','description'].includes(key);}
   const file=field(grid,'Imagem JPEG, PNG ou WebP · até 5 MB','image','','file');file.accept='image/jpeg,image/png,image/webp';
   form.append(el('h3',product?'Editar rascunho':'Novo produto'),grid);
   if(product?.image_url)form.append(el('img',undefined,{src:product.image_url,alt:product.title,className:'catalog-image'}));
   form.append(el('p','As imagens de produto são públicas por URL. Envie apenas material autorizado do produto, sem documentos ou dados pessoais.',{className:'muted'}));
   const submit=el('button','Salvar rascunho',{type:'submit'}),actions=el('div',undefined,{className:'actions'});actions.append(submit,button('Cancelar',()=>editor.replaceChildren(),true));form.append(actions);
   form.addEventListener('submit',event=>{event.preventDefault();ctx.run(async()=>{
    const body=Object.fromEntries(Object.entries(inputs).map(([k,input])=>[k,input.value]));body.image_asset_id=product?.image_asset_id||null;
    if(file.files?.[0]){const upload=new FormData();upload.append('image',file.files[0]);body.image_asset_id=(await api(base+'/assets',{method:'POST',body:upload})).id;}
    if(product)body.revision=product.revision;
    await api(base+'/submissions'+(product?'/'+product.id:''),{method:product?'PATCH':'POST',body});await refresh();notify('Rascunho salvo. Envie para análise quando estiver completo.');
   },submit);});editor.replaceChildren(form);form.scrollIntoView({block:'start',behavior:'smooth'});
  }
  if(writable)panel.append(button('Cadastrar produto',()=>edit()));panel.append(editor);
  if(!rows.length)panel.append(el('p','Nenhum produto enviado por esta loja.'));
  for(const p of rows){const c=card(p.title),actions=el('div',undefined,{className:'actions'});c.append(el('span',productStatus[p.status]||p.status,{className:'badge '+p.status}),el('p',p.description));if(p.image_url)c.append(el('img',undefined,{src:p.image_url,alt:p.title,className:'catalog-image'}));c.append(el('p',`${p.category} · ${p.brand||'Sem marca'} · ${p.model||'Sem modelo'}${p.gtin?' · GTIN '+p.gtin:''}`,{className:'muted'}));if(p.review_note)c.append(el('div',p.review_note,{className:'notice'}));
   if(writable&&['draft','rejected'].includes(p.status)){actions.append(button('Editar',()=>edit(p),true),button('Enviar para análise',async()=>{await api(`${base}/submissions/${p.id}/submit`,{method:'POST',body:{revision:p.revision}});await refresh();notify('Produto enviado para análise administrativa.');}));}
   if(p.status==='approved')c.append(el('p',p.catalog_status==='approved'?'Produto aprovado. Crie sua oferta na aba Ofertas.':'Produto retirado do catálogo. As ofertas foram arquivadas.'));if(p.catalog_note)c.append(el('div',p.catalog_note,{className:'notice'}));c.append(actions);panel.append(c);
  }pager(rows,panel);
 }else if(tab==='offers'){
  panel.append(el('p','Vincule um produto aprovado ao SKU da sua loja. As ofertas ficam em rascunho e ainda não aparecem na loja pública.'));
  const rows=await api(`${base}/offers?offset=${state.offset}`),editor=el('div');
  async function edit(offer){
   const form=el('form',undefined,{className:'catalog-form'}),grid=el('div',undefined,{className:'fields'});
   const label=el('label','Produto aprovado'),select=el('select',undefined,{id:'catalog-product',required:true,disabled:!!offer});label.htmlFor=select.id;const productGroup=el('div',undefined,{className:'field'});productGroup.append(label,select);grid.append(productGroup);
   if(offer)select.append(el('option',offer.title,{value:offer.catalog_product_id}));
   else{
    const search=el('input',undefined,{type:'search',placeholder:'Buscar por nome ou GTIN',maxLength:100,'ariaLabel':'Buscar produto aprovado'});productGroup.append(search);
    async function load(){const products=await api('/api/marketplace/catalog/products?search='+encodeURIComponent(search.value));select.replaceChildren(el('option','Selecione um produto',{value:''}));products.forEach(p=>select.append(el('option',p.title+(p.brand?' · '+p.brand:''),{value:p.id})));}
    productGroup.append(button('Buscar no catálogo',load,true));await load();
   }
   const sku=field(grid,'SKU da loja','seller_sku',offer?.seller_sku,'text',100),variant=field(grid,'Variação (opcional)','variant_label',offer?.variant_label,'text',120),price=field(grid,'Preço em reais','price',offer?(Number(offer.price_cents)/100).toFixed(2).replace('.',','):'');sku.required=true;price.required=true;price.inputMode='decimal';
   const submit=el('button',offer?'Salvar oferta como rascunho':'Criar oferta em rascunho',{type:'submit'});form.append(el('h3',offer?'Editar oferta':'Nova oferta'),grid,el('div',undefined,{className:'actions'}));form.lastChild.append(submit,button('Cancelar',()=>editor.replaceChildren(),true));
   form.addEventListener('submit',event=>{event.preventDefault();ctx.run(async()=>{const match=/^(\d{1,7})(?:[,.](\d{1,2}))?$/.exec(price.value.trim());if(!match)throw Error('Informe um preço como 29,90.');const body={catalog_product_id:select.value,seller_sku:sku.value,variant_label:variant.value,price_cents:Number(match[1])*100+Number((match[2]||'').padEnd(2,'0')),...(offer?{revision:offer.revision}:{})};await api(base+'/offers'+(offer?'/'+offer.id:''),{method:offer?'PATCH':'POST',body});await refresh();notify('Oferta salva em rascunho; publicação continua bloqueada.');},submit);});editor.replaceChildren(form);form.scrollIntoView({block:'start',behavior:'smooth'});
  }
  if(writable)panel.append(button('Criar oferta',()=>edit()));panel.append(editor);
  if(!rows.length)panel.append(el('p','Nenhuma oferta nesta loja. Aprove um produto primeiro ou use o catálogo compartilhado.'));
  else panel.append(table(['Produto / variação','SKU','Preço','Estado','Ações'],rows.map(o=>{const actions=el('div',undefined,{className:'actions'});if(writable&&o.revision&&o.catalog_status==='approved'){actions.append(button('Editar',()=>edit(o),true));if(o.status!=='suspended')actions.append(button('Arquivar',async()=>{await api(`${base}/offers/${o.id}/archive`,{method:'POST',body:{revision:o.revision}});await refresh();},true));}return [o.title+(o.variant_label?' · '+o.variant_label:''),o.seller_sku,money(o.price_cents),o.status==='draft'?'Rascunho':o.status==='suspended'?'Arquivada':o.status,actions];})));pager(rows,panel);
 }else{
  panel.append(el('p','Ajuste o estoque disponível para novas vendas. As reservas existentes são exibidas separadamente e nunca são alteradas por este ajuste. Estoque da loja antiga permanece independente.'));
  const [offers,movements]=await Promise.all([api(`${base}/offers?offset=${state.offset}`),api(`${base}/inventory-movements?offset=${state.offset}`)]),editor=el('div');panel.append(editor);
  function adjust(o){const form=el('form',undefined,{className:'catalog-form'}),qty=field(form,'Quantidade disponível (sem reservas)','quantity',o.available_qty??0,'number'),reason=field(form,'Motivo do ajuste','reason','','text',250);qty.min='0';qty.max='1000000';qty.step='1';qty.required=true;reason.required=true;const submit=el('button','Confirmar ajuste',{type:'submit'}),key=crypto.randomUUID();form.prepend(el('h3','Ajustar '+o.seller_sku));form.append(el('div',undefined,{className:'actions'}));form.lastChild.append(submit,button('Cancelar',()=>editor.replaceChildren(),true));form.addEventListener('submit',event=>{event.preventDefault();ctx.run(async()=>{await api(`${base}/offers/${o.id}/inventory`,{method:'PUT',body:{available_qty:Number(qty.value),reason:reason.value,revision:o.revision,idempotency_key:key}});await refresh();notify('Estoque ajustado e movimentação registrada.');},submit);});editor.replaceChildren(form);form.scrollIntoView({block:'start',behavior:'smooth'});}
  if(offers.length)panel.append(table(['SKU','Produto','Disponível','Reservado',''],offers.map(o=>[o.seller_sku,o.title,o.available_qty??0,o.reserved_qty??0,writable&&o.revision?button('Ajustar',()=>adjust(o),true):'Consulta'])));else panel.append(el('p','Crie uma oferta antes de cadastrar estoque.'));
  panel.append(el('h3','Histórico de movimentações'));
  if(movements.length)panel.append(table(['Data','SKU','Antes','Depois','Variação','Motivo'],movements.map(m=>[date(m.created_at),m.seller_sku,m.before_qty,m.after_qty,m.delta,m.reason])));else panel.append(el('p','Nenhuma movimentação registrada.'));pager(offers.length===100?offers:movements,panel);
 }
 return nodes;
}
const pages=new Map();
const adminPages=new Map();
const productStatus={draft:'Rascunho',pending:'Em análise',approved:'Aprovado',rejected:'Correção necessária'};
export async function renderAdminCatalog(ctx){
 const {api,el,card,button,refresh,filter}=ctx;
 const offset=adminPages.get(filter)||0;
 const rows=await api('/api/admin/marketplace/catalog/submissions?status='+encodeURIComponent(filter)+'&offset='+offset);
 const grid=el('div',undefined,{className:'store-grid'});let products;
 for(const p of rows){const c=card(p.title),dl=el('dl');c.append(el('span',productStatus[p.status],{className:'badge '+p.status}));if(p.image_url)c.append(el('img',undefined,{src:p.image_url,alt:p.title,className:'catalog-image'}));for(const [label,value] of [['Loja',p.trade_name],['Estado da loja',p.seller_status],['Categoria',p.category],['Marca / modelo',[p.brand,p.model].filter(Boolean).join(' · ')],['GTIN',p.gtin||'Não informado'],['Revisão',p.revision]])dl.append(el('dt',label),el('dd',value));c.append(dl,el('p',p.description));if(p.review_note)c.append(el('div',p.review_note,{className:'notice'}));
  if(p.status==='pending'){
   const form=el('form',undefined,{className:'field'}),label=el('label','Motivo da decisão (visível à loja)'),note=el('textarea',undefined,{id:'decision-'+p.id,required:true,maxLength:1000,rows:3});label.htmlFor=note.id;form.append(label,note);
   const reuseLabel=el('label','Vincular a produto já aprovado (opcional)'),select=el('select',undefined,{id:'reuse-'+p.id});reuseLabel.htmlFor=select.id;select.append(el('option','Criar produto compartilhado novo',{value:''}));products??=await api('/api/marketplace/catalog/products');products.forEach(product=>select.append(el('option',product.title+(product.gtin?' · '+product.gtin:''),{value:product.id})));const search=el('input',undefined,{type:'search',placeholder:'Buscar produto existente por nome ou GTIN',ariaLabel:'Buscar produto existente',value:p.gtin||''});form.append(reuseLabel,select,search,button('Buscar produto existente',async()=>{const found=await api('/api/marketplace/catalog/products?search='+encodeURIComponent(search.value));select.replaceChildren(el('option','Criar produto compartilhado novo',{value:''}));found.forEach(item=>select.append(el('option',item.title+(item.gtin?' · '+item.gtin:''),{value:item.id})));},true),el('p','Confira imagem, descrição, categoria e identificação. A aprovação permite criar ofertas em rascunho, sem liberar vendas.',{className:'muted'}));const actions=el('div',undefined,{className:'actions'});
   for(const [status,title] of [['approved','Aprovar produto'],['rejected','Solicitar correção']])actions.append(button(title,async()=>{if(!form.reportValidity())return;await api(`/api/admin/marketplace/catalog/submissions/${p.id}/decision`,{method:'PATCH',body:{status,note:note.value,revision:p.revision,...(select.value?{catalog_product_id:select.value}:{})}});await refresh();ctx.notify('Decisão de produto registrada. Vendas permanecem bloqueadas.');},status==='rejected'));form.append(actions);c.append(form);
  }
  if(p.status==='approved'&&p.catalog_status==='approved'){
   const form=el('form',undefined,{className:'field'}),label=el('label','Motivo da retirada do catálogo'),note=el('textarea',undefined,{id:'withdraw-'+p.id,required:true,minLength:3,maxLength:1000,rows:3});label.htmlFor=note.id;
   form.append(el('p','Retirar este produto arquiva suas ofertas em todas as lojas que o utilizam. Preços, estoques e histórico são preservados.',{className:'notice'}),label,note,button('Retirar produto e arquivar ofertas',async()=>{if(!form.reportValidity())return;await api(`/api/admin/marketplace/catalog/products/${p.catalog_product_id}/withdraw`,{method:'POST',body:{note:note.value}});await refresh();ctx.notify('Produto retirado do catálogo e ofertas arquivadas.');},true));c.append(form);
  }
  if(p.catalog_note)c.append(el('div',p.catalog_note,{className:'notice'}));grid.append(c);
 }
 if(!rows.length)grid.append(card('Nenhum produto neste estado','Os produtos enviados pelos lojistas aparecerão aqui.'));
 const actions=el('div',undefined,{className:'actions'});
 if(offset)actions.append(button('Anterior',()=>{adminPages.set(filter,Math.max(0,offset-100));return refresh();},true));
 if(rows.length===100)actions.append(button('Próximos 100',()=>{adminPages.set(filter,offset+100);return refresh();},true));
 if(actions.children.length)grid.append(actions);
 return [grid];
}
