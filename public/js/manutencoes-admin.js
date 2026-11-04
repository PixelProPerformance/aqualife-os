(() => {
 const token=localStorage.getItem('aqualife_token');
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const date=s=>{const t=String(s||'').slice(0,10).split('-');return t.length===3?t.reverse().join('/'):'—';};
 const safeLink=u=>{try{const x=new URL(u,location.origin);return x.protocol==='https:'||x.origin===location.origin?x.href:null;}catch{return null;}};
 const api=async(path,opt={})=>{const r=await fetch(path,{...opt,headers:{'Content-Type':'application/json',authorization:'Bearer '+token}});const body=await r.json().catch(()=>({}));if(!r.ok)throw Error(body.erro||'Erro HTTP '+r.status);return body;};
 let id=null,name='';
 const container=document.createElement('div');
 container.id='modalManutencoesManuais';
 container.className='modal';
 container.innerHTML='<div class="modal-cx" style="max-width:720px;max-height:90vh;overflow:auto"><h3 id="mmTitulo">Manutenções</h3><div id="mmCorpo">Carregando…</div><div class="modal-acoes"><button type="button" class="btn btn-c" id="mmFechar">Fechar</button></div></div>';
 document.body.appendChild(container);
 const content=container.querySelector('#mmCorpo');
 container.querySelector('#mmFechar').onclick=()=>container.classList.remove('on');
 const base=()=>'/api/admin/clientes/'+encodeURIComponent(id)+'/manutencoes';
 const btnAction=(sel,fn)=>content.querySelectorAll(sel).forEach(x=>x.onclick=()=>fn(x));
 async function redraw(){
  content.textContent='Carregando…';
  try{
   const d=await api(base());let html='';
   html+='<p style="font-size:13px;color:var(--suave)">A contagem é manual. Pré-agendamentos não gastam visitas. Cada uso é registado com data e relatório.</p>';
   if(!d.pacotes.length)html+='<p><b>Manutenções avulsas.</b> Nenhum pacote ativo.</p>';
   d.pacotes.forEach(p=>{
    html+='<div style="border:1px solid var(--linha);border-radius:10px;padding:14px;margin:12px 0"><h4>'+esc(p.descricao)+'</h4><p><b>'+p.total_visitas+'</b> contratadas · <b>'+p.utilizadas+'</b> utilizadas · <b style="color:#176B42">'+p.restantes+'</b> disponíveis</p>'+
     '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:12px 0"><input class="inp" type="number" min="'+p.utilizadas+'" max="10000" step="1" value="'+p.total_visitas+'" data-total="'+p.id+'" style="width:105px"><button type="button" class="btn btn-c btn-sm" data-save-total="'+p.id+'">Ajustar total</button></div>'+
     '<form data-novo-uso="'+p.id+'"><div style="display:flex;flex-wrap:wrap;gap:7px"><input class="inp" type="date" name="data_visita" required style="width:150px"><input class="inp" type="text" name="relatorio_url" required maxlength="2048" aria-label="Referência do relatório" placeholder="/api/laudo/ID-DO-LAUDO/cliente" style="flex:1;min-width:200px"></div><p style="font-size:13px;margin:8px 0">Para o cliente abrir o relatório, associe /api/laudo/ID-DO-LAUDO/cliente de um aquário desse cliente. Links externos ficam registados apenas para consulta administrativa.</p><input class="inp" name="observacao" placeholder="Observação opcional" maxlength="500" style="margin:8px 0"><button class="btn btn-p btn-sm" type="submit">Registar manutenção utilizada</button></form>'+
     '<p style="font-size:12px;color:var(--suave);margin:10px 0 5px">Histórico deste pacote</p>';
    const hist=d.usos.filter(u=>u.pacote_id===p.id);
    html+=hist.length?hist.map(u=>'<div style="display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-top:1px solid var(--linha)"><span>'+date(u.data_visita)+(u.observacao?' · '+esc(u.observacao):'')+' · '+(safeLink(u.relatorio_url)?'<a target="_blank" rel="noopener noreferrer" href="'+esc(safeLink(u.relatorio_url))+'">Ver relatório</a>':'sem link válido')+'</span><button type="button" class="btn btn-c btn-sm" data-void-uso="'+u.id+'" data-pacote="'+p.id+'">Anular</button></div>').join(''):'<p style="font-size:13px;color:var(--suave)">Nenhuma visita utilizada.</p>';
    html+='</div>';
   });
   html+='<form id="mmNovoPacote" style="margin:18px 0 6px;padding-top:12px;border-top:1px solid var(--linha)"><h4>Criar novo pacote</h4><div style="display:flex;gap:8px;flex-wrap:wrap"><input class="inp" required name="descricao" maxlength="160" placeholder="Ex.: Trimestral 1x/mês" style="flex:1"><input class="inp" required name="total_visitas" type="number" min="1" max="10000" step="1" placeholder="Nº visitas" style="width:130px"><button class="btn btn-p btn-sm" type="submit">Criar pacote</button></div></form>';
   content.innerHTML=html;
   content.querySelector('#mmNovoPacote').onsubmit=async ev=>{ev.preventDefault();const b=Object.fromEntries(new FormData(ev.target));await perform(()=>api(base()+'/pacotes',{method:'POST',body:JSON.stringify(b)}));};
   content.querySelectorAll('[data-novo-uso]').forEach(form=>form.onsubmit=async ev=>{ev.preventDefault();const b=Object.fromEntries(new FormData(form));await perform(()=>api(base()+'/pacotes/'+form.dataset.novoUso+'/usos',{method:'POST',body:JSON.stringify(b)}));});
   btnAction('[data-save-total]',async el=>{const inp=content.querySelector('[data-total="'+el.dataset.saveTotal+'"]');await perform(()=>api(base()+'/pacotes/'+el.dataset.saveTotal,{method:'PATCH',body:JSON.stringify({total_visitas:Number(inp.value)})}));});
   btnAction('[data-void-uso]',async el=>{if(!confirm('Anular este lançamento? O histórico será preservado para auditoria.'))return;await perform(()=>api(base()+'/pacotes/'+el.dataset.pacote+'/usos/'+el.dataset.voidUso,{method:'DELETE'}));});
  }catch(e){content.textContent='Erro ao carregar as manutenções: '+e.message;}
 }
 async function perform(fn){try{await fn();await redraw();}catch(e){alert(e.message);}}
 document.addEventListener('click',ev=>{
  const b=ev.target.closest('[data-manutencoes-org]');
  if(!b)return;
  id=b.dataset.manutencoesOrg;name=b.closest('.cli-card')?.querySelector('.cli-nome')?.textContent||'Cliente';
  container.querySelector('#mmTitulo').textContent='Pacote e manutenções · '+name;
  container.classList.add('on');redraw();
 });
})();
