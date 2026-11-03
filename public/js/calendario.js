// Calendário partilhado entre cliente e administração.
(() => {
const root=document.getElementById('manutencao-calendario');if(!root)return;
const admin=root.dataset.admin==='1';
const token=()=>localStorage.getItem('aqualife_token');
const api=async(url,opts={})=>{const r=await fetch(url,{...opts,headers:{'Content-Type':'application/json',Authorization:'Bearer '+token(),...(opts.headers||{})}});const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.erro||'Falha no pedido');return j;};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=d=>new Date(d).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'});
const state={month:new Date(),data:null};
root.innerHTML='<section style="margin:24px 0;padding:22px;border:1px solid #dbe5e9;border-radius:16px;background:#fff;color:#0b2a3a"><h2>Calendário de manutenções</h2><p>As datas são pré-agendamentos. A visita só será confirmada se o pagamento estiver em dia.</p><div id="mc-content">Carregando…</div></section>';
const box=root.querySelector('#mc-content');
async function load(){try{const a=await api(admin?'/api/admin/manutencao/agenda':'/api/manutencao/resumo');state.data=a;state.packs=admin?await api('/api/admin/manutencao/pacotes'):a.pacotes;state.clients=admin?await api('/api/admin/manutencao/clientes'):[];render();}catch(e){box.textContent='Não foi possível carregar: '+e.message;}}
function render(){
const events=admin?state.data:state.data.agenda;
const start=new Date(state.month.getFullYear(),state.month.getMonth(),1);
const offset=start.getDay();const days=new Date(start.getFullYear(),start.getMonth()+1,0).getDate();
const eventsByDay={};events.forEach(e=>{const d=new Date(e.inicio);if(d.getFullYear()===start.getFullYear()&&d.getMonth()===start.getMonth()){(eventsByDay[d.getDate()]??=[]).push(e);}});
let html='';
if(!admin){if(state.packs.length){html+='<div style="display:flex;flex-wrap:wrap;gap:12px;margin:16px 0">'+state.packs.map(p=>'<div style="padding:14px;border:1px solid #ddd;border-radius:12px"><b>'+esc(p.descricao)+'</b><p>Incluídas: '+p.total_visitas+' · Utilizadas: '+p.gastas+' · Restantes: '+p.restantes+'</p><small>Pagamento: '+esc(p.status_pagamento)+'</small></div>').join('')+'</div>';}else{html+='<p><b>Manutenções avulsas</b> — Agende já a próxima: <a href="/servicos.html">clique aqui</a>.</p>';}}
else{
html+='<form id="mc-package"><h3>Criar pacote</h3><select name="user_id" required><option value="">Selecionar cliente</option>'+state.clients.map(c=>'<option value="'+c.id+'">'+esc(c.name)+' — '+esc(c.email)+'</option>').join('')+'</select> <input name="descricao" required placeholder="Ex.: Trimestral · 1 visita/mês"> <input name="total_visitas" type="number" min="1" max="100" required placeholder="N.º visitas"> <select name="status_pagamento"><option value="pendente">Pagamento pendente</option><option value="em_dia">Em dia</option><option value="atrasado">Atrasado</option></select> <button class="btn btn-p" type="submit">Guardar pacote</button></form>';
html+='<form id="mc-book" style="margin-top:15px"><h3>Pré-agendar visita</h3><select name="user_id" required><option value="">Selecionar cliente</option>'+state.clients.map(c=>'<option value="'+c.id+'">'+esc(c.name)+'</option>').join('')+'</select> <select name="pacote_id"><option value="">Visita avulsa</option>'+state.packs.map(p=>'<option data-user="'+p.user_id+'" value="'+p.id+'">'+esc(p.cliente_nome)+' — '+esc(p.descricao)+'</option>').join('')+'</select> <input type="datetime-local" name="inicio" required> <button class="btn btn-p" type="submit">Pré-agendar</button></form>';
}
html+='<div style="display:flex;gap:12px;align-items:center;margin:22px 0"><button class="btn btn-c" id="mc-prev">←</button><b>'+start.toLocaleDateString('pt-BR',{month:'long',year:'numeric'})+'</b><button class="btn btn-c" id="mc-next">→</button></div>';
html+='<div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px">'+['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d=>'<b style="text-align:center;font-size:12px">'+d+'</b>').join('');
for(let i=0;i<offset;i++)html+='<div></div>';
for(let day=1;day<=days;day++){html+='<div style="border:1px solid #e0e7ec;border-radius:7px;min-height:76px;padding:5px;font-size:12px;overflow:hidden"><b>'+day+'</b>'+(eventsByDay[day]||[]).map(e=>'<div style="margin-top:4px;padding:3px;background:#e5f5f4;border-radius:4px">'+esc(admin?e.cliente_nome:e.pacote||'Avulsa')+'<br>'+fmt(e.inicio).split(' ')[1]+'<br>'+esc(e.estado)+'</div>').join('')+'</div>';}
html+='</div><h3 style="margin:18px 0 8px">Visitas</h3>';
html+=events.length?events.map(e=>'<article style="border-bottom:1px solid #ddd;padding:10px 0"><b>'+fmt(e.inicio)+'</b> · '+esc(admin?e.cliente_nome:e.pacote||'Avulsa')+' — '+esc(e.estado)+(e.troca_solicitada?'<p>Pedido de troca: '+fmt(e.troca_solicitada)+'</p>':'')+'<div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:7px">'+(admin?'<button class="btn btn-c" data-remind="'+e.id+'">Enviar e-mail lembrete</button><button class="btn btn-c" data-state="'+e.id+'">Alterar estado / data</button>':(['pre_agendada','confirmada'].includes(e.estado)?'<button class="btn btn-c" data-swap="'+e.id+'">Pedir troca (até 7 dias antes)</button>':''))+'</div></article>').join(''):'<p>Ainda não existem visitas no calendário.</p>';
box.innerHTML=html;
box.querySelector('#mc-prev').onclick=()=>{state.month=new Date(start.getFullYear(),start.getMonth()-1,1);render();};
box.querySelector('#mc-next').onclick=()=>{state.month=new Date(start.getFullYear(),start.getMonth()+1,1);render();};
box.querySelectorAll('[data-swap]').forEach(b=>b.onclick=async()=>{const nova=prompt('Sugira nova data e hora (AAAA-MM-DDTHH:MM):');if(!nova)return;try{await api('/api/manutencao/agenda/'+b.dataset.swap+'/troca',{method:'POST',body:JSON.stringify({nova_data:new Date(nova).toISOString()})});alert('Pedido enviado à administração.');load();}catch(e){alert(e.message);}});
if(admin){
 const send=async(url,body,method='POST')=>{try{await api(url,{method,body:JSON.stringify(body)});await load();alert('Operação guardada.');}catch(e){alert(e.message);}};
 box.querySelector('#mc-package').onsubmit=e=>{e.preventDefault();const b=Object.fromEntries(new FormData(e.target));send('/api/admin/manutencao/pacotes',b);};
 box.querySelector('#mc-book').onsubmit=e=>{e.preventDefault();const b=Object.fromEntries(new FormData(e.target));b.inicio=new Date(b.inicio).toISOString();send('/api/admin/manutencao/agenda',b);};
 box.querySelectorAll('[data-remind]').forEach(b=>b.onclick=async()=>{if(!confirm('Enviar lembrete por e-mail?'))return;try{await api('/api/admin/manutencao/agenda/'+b.dataset.remind+'/lembrete',{method:'POST'});alert('E-mail enviado.');}catch(e){alert(e.message);}});
 box.querySelectorAll('[data-state]').forEach(b=>b.onclick=()=>{const estado=prompt('Estado: pre_agendada, confirmada, realizada, cancelada');if(!estado)return;const inicio=prompt('Nova data/hora opcional (AAAA-MM-DDTHH:MM), ou deixe em branco:');const leitura_id=estado==='realizada'?prompt('ID UUID do laudo/visita concluída (obrigatório):'):null;send('/api/admin/manutencao/agenda/'+b.dataset.state,{estado,...(inicio?{inicio:new Date(inicio).toISOString()}:{}),...(leitura_id?{leitura_id}:{})},'PATCH');});
}
}
load();
})();