(() => {
 const root=document.getElementById('manutencoes-cliente');
 if(!root)return;
 const token=localStorage.getItem('aqualife_token');
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const date=s=>{const x=String(s||'').slice(0,10).split('-');return x.length===3?x.reverse().join('/'):'—';};
 const report=u=>{if(!u)return '';try{const a=new URL(u,location.origin);if(a.protocol!=='https:'&&a.origin!==location.origin)return '';return '<a href="'+esc(a.href)+'" target="_blank" rel="noopener noreferrer">Ver relatório</a>';}catch{return '';}};
 async function load(){
  root.innerHTML='<div class="cartao" style="padding:20px">Carregando manutenções…</div>';
  try{
   const res=await fetch('/api/cliente/manutencoes',{headers:{authorization:'Bearer '+token}});
   if(!res.ok)throw new Error('Falha ao consultar manutenções');
   const d=await res.json();
   if(!d.pacotes.length){
    root.innerHTML='<div class="cartao" style="padding:20px"><h2>Manutenções avulsas</h2><p>Agende já a próxima manutenção: <a href="/site.html#/agendar">clique aqui</a>.</p></div>';
    return;
   }
   root.innerHTML='<div class="cartao" style="padding:20px"><h2>Meu pacote de manutenções</h2><p style="color:var(--suave)">Os lançamentos são atualizados manualmente pela equipa Aqualife.</p>'+
    d.pacotes.map(p=>'<div style="padding:12px 0;border-top:1px solid var(--linha)"><b>'+esc(p.descricao)+'</b><div style="display:flex;gap:18px;flex-wrap:wrap;margin-top:8px"><span><b>'+p.total_visitas+'</b> contratadas</span><span><b>'+p.utilizadas+'</b> utilizadas</span><span style="color:#176B42"><b>'+p.restantes+'</b> disponíveis</span></div></div>').join('')+
    '<h3 style="margin-top:18px">Histórico de manutenções utilizadas</h3>'+
    (d.usos.length?'<div style="overflow:auto"><table class="tbl"><thead><tr><th>Data</th><th>Pacote</th><th>Relatório</th></tr></thead><tbody>'+d.usos.map(u=>'<tr><td>'+date(u.data_visita)+'</td><td>'+esc(d.pacotes.find(p=>p.id===u.pacote_id)?.descricao||'Pacote')+'</td><td>'+report(u.relatorio_url)+'</td></tr>').join('')+'</tbody></table></div>':'<p>Ainda não há manutenções utilizadas registadas.</p>')+'</div>';
  }catch(e){root.innerHTML='<div class="cartao" style="padding:20px">Não foi possível carregar a contagem de manutenções.</div>';}
 }
 load();
})();
