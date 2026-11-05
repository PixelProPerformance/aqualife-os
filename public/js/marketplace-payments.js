export async function sellerPayments({api,el,card,button,date,sellerId,store,refresh}){
 const c=card('Mercado Pago · homologação'),data=await api(`/api/marketplace/sellers/${sellerId}/payments/connection`);
 c.append(el('p','Cobranças reais, estornos e repasses ainda não liberados. A conexão de teste não habilita vendas nem expedição.',{className:'notice'}));
 const result=new URLSearchParams(location.search).get('mp_connection'),messages={connected:'Autorização de teste recebida. Confira abaixo a conexão da loja selecionada.',invalid:'Retorno expirado, reutilizado ou de outro navegador. Inicie uma nova autorização.',denied:'Autorização não concluída no Mercado Pago.',failed:'Não foi possível concluir a conexão de teste. Confira a conta e inicie uma nova autorização.'};
 if(messages[result])c.append(el('p',messages[result],{role:'status'}));
 const labels={not_configured:'Aguardando configuração da aplicação de testes pela Aqualife.',not_connected:'Conta de teste ainda não conectada.',connected:'Conta de teste conectada por autorização Mercado Pago.',disconnected:'Uso local da conta desativado.',reauthorization_required:'É necessário autorizar novamente a conta de teste.'};
 c.append(el('p',labels[data.state]||'Conexão indisponível.'));
 if(data.expires_at)c.append(el('p','Validade da autorização: '+date(data.expires_at)));
 if(store?.role==='owner'){
  if(data.configured)c.append(button('Autorizar conta de teste no Mercado Pago',async()=>{
   const r=await api(`/api/marketplace/sellers/${sellerId}/payments/connection/authorize`,{method:'POST',body:{}}),url=new URL(r.authorization_url);
   if(url.origin!=='https://auth.mercadopago.com.br'||url.pathname!=='/authorization')throw Error('Endereço de autorização inválido');location.assign(url.href);
  }));
  if(data.configured&&data.state==='connected')c.append(button('Renovar autorização de teste',async()=>{await api(`/api/marketplace/sellers/${sellerId}/payments/connection/refresh`,{method:'POST',body:{}});await refresh();},true));
  if(['connected','reauthorization_required'].includes(data.state)){
   c.append(button('Desativar uso local da conta',async()=>{await api(`/api/marketplace/sellers/${sellerId}/payments/connection/disconnect`,{method:'POST',body:{}});await refresh();},true));
   c.append(el('p','Desativar apaga os tokens guardados na Aqualife. Para revogar a permissão também no Mercado Pago, use a gestão de aplicações da sua conta.'));
  }
 }else c.append(el('p','Somente o proprietário pode autorizar ou desconectar a conta.'));
 c.append(el('p','Nenhuma senha ou Access Token deve ser colado neste painel ou enviado por chat. A autorização ocorre no site do Mercado Pago.'));
 return c;
}
