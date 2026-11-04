(() => {
 const root=document.getElementById('manutencoes-cliente');
 if(!root)return;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const count=n=>Number.isSafeInteger(Number(n))&&Number(n)>=0?Number(n):0;
 const date=s=>{
  if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return '—';
  const d=new Date(s+'T12:00:00Z');
  return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===s?s.split('-').reverse().join('/'):'—';
 };
 const uuid=s=>typeof s==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
 const internal=u=>typeof u==='string'&&/^\/api\/laudo\/[0-9a-f-]{36}\/cliente$/i.test(u);
 async function api(path){
  const token=localStorage.getItem('aqualife_token');
  if(!token)throw new Error('A sessão terminou. Entre novamente para consultar as manutenções.');
  const r=await fetch(path,{headers:{authorization:'Bearer '+token},cache:'no-store'});
  if(r.status===401)throw new Error('A sessão terminou. Entre novamente para consultar as manutenções.');
  if(!r.ok)throw new Error(r.status===404?'Relatório indisponível. Peça à equipa um relatório interno autorizado.':'Não foi possível carregar os dados. Tente novamente.');
  return r.json();
 }
 async function openReport(id){
  const dialog=root.querySelector('dialog');
  const text=dialog.querySelector('.mc-report-text');
  text.textContent='Carregando relatório…';dialog.showModal();
  try{
   const d=await api('/api/cliente/manutencoes/usos/'+encodeURIComponent(id)+'/relatorio');
   text.textContent=[d.aquario,d.nota==null?'':'Nota: '+d.nota,d.texto||'Sem observações registadas.'].filter(Boolean).join('\n\n');
  }catch(e){text.textContent=e.message;}
 }
 async function load(){
  root.setAttribute('aria-busy','true');
  root.innerHTML='<div class="cartao mc-card" role="status">Carregando manutenções…</div>';
  try{
   const d=await api('/api/cliente/manutencoes');
   if(!Array.isArray(d.pacotes)||!Array.isArray(d.usos))throw new Error('Não foi possível carregar os dados. Tente novamente.');
   if(!d.pacotes.length){
    root.innerHTML='<div class="cartao mc-card"><h2>Manutenções avulsas</h2><p class="mc-muted">Ainda não tem um pacote de manutenções ativo.</p><a href="/site.html#/agendar">Agendar uma manutenção</a></div>';return;
   }
   root.innerHTML='<div class="cartao mc-card"><h2>Meu pacote de manutenções</h2><p class="mc-muted">Os lançamentos são atualizados manualmente pela equipa Aqualife.</p>'+
    d.pacotes.map(p=>'<article class="mc-package"><h3>'+esc(p.descricao)+'</h3><dl class="mc-balance"><div><dt>Contratadas</dt><dd>'+count(p.total_visitas)+'</dd></div><div><dt>Utilizadas</dt><dd>'+count(p.utilizadas)+'</dd></div><div class="mc-available"><dt>Disponíveis</dt><dd>'+count(p.restantes)+'</dd></div></dl>'+(count(p.restantes)===0?'<p>Saldo esgotado. Contacte a equipa para renovar o pacote.</p>':'')+'</article>').join('')+
    (d.usos.length?'<table class="mc-history"><caption>Histórico de manutenções utilizadas</caption><thead><tr><th scope="col">Data</th><th scope="col">Pacote</th><th scope="col">Relatório</th></tr></thead><tbody>'+d.usos.map(u=>'<tr><td data-label="Data">'+date(u.data_visita)+'</td><td data-label="Pacote">'+esc(d.pacotes.find(p=>p.id===u.pacote_id)?.descricao||'Pacote')+'</td><td data-label="Relatório">'+(uuid(u.id)&&internal(u.relatorio_url)?'<button type="button" data-report="'+esc(u.id)+'" aria-label="Ver relatório de '+date(u.data_visita)+'">Ver relatório</button>':'<span class="mc-muted">Relatório indisponível. Contacte a equipa.</span>')+'</td></tr>').join('')+'</tbody></table>':'<h3>Histórico de manutenções utilizadas</h3><p class="mc-muted">Ainda não há manutenções utilizadas registadas. O saldo será atualizado quando a equipa registar uma visita.</p>')+
    '<dialog aria-labelledby="mc-report-title"><h2 id="mc-report-title">Relatório da manutenção</h2><p class="mc-report-text" role="status"></p><form method="dialog"><button>Fechar relatório</button></form></dialog></div>';
   root.querySelectorAll('[data-report]').forEach(b=>b.addEventListener('click',()=>openReport(b.dataset.report)));
  }catch(e){
   root.innerHTML='<div class="cartao mc-card"><p role="alert">'+esc(e.message)+'</p><button type="button" id="mc-retry">Tentar novamente</button> <a href="/entrar.html">Entrar novamente</a></div>';
   root.querySelector('#mc-retry').addEventListener('click',load);
  }finally{root.setAttribute('aria-busy','false');}
 }
 load();
})();
