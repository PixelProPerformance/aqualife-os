const $=id=>document.getElementById(id);
const token=localStorage.getItem("aqualife_token");
const user=JSON.parse(localStorage.getItem("aqualife_user")||"null");
if(!token||!user||!["admin","gestor"].includes(user.role)) location.href="/entrar.html?equipe=1";
$("sair").onclick=()=>{localStorage.clear();location.href="/entrar.html"};

async function api(c,o={}){
  const r=await fetch(c,{...o,headers:{"content-type":"application/json",authorization:"Bearer "+token,...(o.headers||{})}});
  if(!r.ok){const j=await r.json().catch(()=>({}));throw new Error(j.erro||"HTTP "+r.status);}
  return r.status===204?null:r.json();
}
window.fecharModal=id=>$(id).classList.remove("on");
const abrir=id=>$(id).classList.add("on");
const TIPO={freshwater:"água doce",marine:"marinho",pond:"lago"};
const PAPEL={admin:"Administrador",gestor:"Gestor",tecnico:"Técnico",cliente:"Cliente",aquarista:"Aquarista"};
const senhaAuto=()=>Array.from(crypto.getRandomValues(new Uint8Array(10))).map(b=>"abcdefghijkmnpqrstuvwxyz23456789"[b%31]).join("");

// abas
document.querySelectorAll(".aba").forEach(a=>a.onclick=()=>{
  document.querySelectorAll(".aba").forEach(x=>x.classList.toggle("on",x===a));
  document.querySelectorAll(".pane").forEach(p=>p.classList.toggle("on",p.id==="pane-"+a.dataset.aba));
});

// ---------- CLIENTES ----------
async function carregarClientes(){
  try{
    const cs=await api("/api/admin/clientes");
    if(!cs.length){$("listaClientes").innerHTML=`<div class="vazio">Nenhum cliente ainda.<br>Crie o primeiro para começar.</div>`;return;}
    $("listaClientes").innerHTML=cs.map(c=>`
      <div class="cli-card">
        <div class="cli-top">
          <div><div class="cli-nome">${c.name}</div>
            <div class="cli-meta">${c.type==="corporate"?"Empresa":"Residência"} · ${c.country}</div></div>
          <div style="display:flex;gap:8px;align-items:center">
            <button class="btn btn-c btn-sm" data-add-aq="${c.id}">+ Aquário</button>
            <button class="btn btn-sm" style="background:#FEE2E2;color:#991B1B;border:1px solid #FECACA;cursor:pointer" data-del-cli="${c.id}" data-del-nome="${c.name}">Apagar</button>
          </div>
        </div>
        <div>${(c.aquarios||[]).map(a=>`<span class="aq-chip">${a.label} · ${TIPO[a.water_type]} · ${a.volume_liters||"—"}L</span>`).join("")||'<span style="font-size:13px;color:var(--suave)">Sem aquários</span>'}</div>
      </div>`).join("");
    document.querySelectorAll("[data-add-aq]").forEach(b=>b.onclick=()=>{
      $("aqOrgId").value=b.dataset.addAq; $("aqNome").value=""; $("aqVol").value=""; abrir("modalAquario");
    });
    document.querySelectorAll("[data-del-cli]").forEach(b=>b.onclick=async()=>{
      if(!confirm(`Apagar "${b.dataset.delNome}" e todos os aquários e laudos?

Esta acção não pode ser desfeita.`)) return;
      try{
        await api("/api/admin/clientes/"+b.dataset.delCli,{method:"DELETE"});
        carregarClientes();
      }catch(e){alert("Erro ao apagar: "+e.message);}
    });
  }catch(e){$("listaClientes").innerHTML=`<div class="vazio">Erro: ${e.message}</div>`;}
}
$("novoCliente").onclick=()=>{["cNome","cCidade","cAqNome","cAqVol"].forEach(i=>$(i).value="");abrir("modalCliente");};
$("salvarCliente").onclick=async()=>{
  const b=$("salvarCliente");b.disabled=true;
  try{
    await api("/api/admin/clientes",{method:"POST",body:JSON.stringify({
      nome:$("cNome").value,tipo:$("cTipo").value,cidade:$("cCidade").value,
      aquario:$("cAqTipo").value?{label:$("cAqNome").value,water_type:$("cAqTipo").value,volume_liters:parseFloat($("cAqVol").value)||null}:null,
    })});
    fecharModal("modalCliente");carregarClientes();
  }catch(e){alert("Erro: "+e.message);}finally{b.disabled=false;}
};
$("salvarAquario").onclick=async()=>{
  const b=$("salvarAquario");b.disabled=true;
  try{
    await api("/api/admin/aquario",{method:"POST",body:JSON.stringify({
      organization_id:$("aqOrgId").value,label:$("aqNome").value,
      water_type:$("aqTipo").value,volume_liters:parseFloat($("aqVol").value)||null})});
    fecharModal("modalAquario");carregarClientes();
  }catch(e){alert("Erro: "+e.message);}finally{b.disabled=false;}
};

// ---------- PESSOAS ----------
async function carregarPessoas(){
  try{
    const ps=await api("/api/admin/pessoas");
    $("listaPessoas").innerHTML=`<table class="tbl">
      <tr><th>Nome</th><th>E-mail</th><th>Função</th><th>Cliente</th><th></th></tr>
      ${ps.map(p=>`<tr>
        <td style="font-weight:600;color:var(--tinta)">${p.name}</td>
        <td style="color:var(--suave)">${p.email}</td>
        <td><span class="papel-b">${PAPEL[p.role]||p.role}</span></td>
        <td style="color:var(--suave)">${p.organization?.name||"—"}</td>
        <td>${p.id!==user.id?`<span class="rm" data-rm="${p.id}" data-nm="${p.name}">excluir</span>`:""}</td>
      </tr>`).join("")}</table>`;
    document.querySelectorAll("[data-rm]").forEach(b=>b.onclick=async()=>{
      if(!confirm(`Excluir ${b.dataset.nm}?`))return;
      try{await api("/api/admin/pessoas/"+b.dataset.rm,{method:"DELETE"});carregarPessoas();}
      catch(e){alert("Erro: "+e.message);}
    });
  }catch(e){$("listaPessoas").innerHTML=`<div class="vazio">Erro: ${e.message}</div>`;}
}
$("novaPessoa").onclick=async()=>{
  $("pNome").value="";$("pEmail").value="";$("pSenha").value=senhaAuto();
  try{const cs=await api("/api/admin/clientes");
    $("pCliente").innerHTML=cs.map(c=>`<option value="${c.id}">${c.name}</option>`).join("");
  }catch(e){}
  abrir("modalPessoa");
};
$("pPapel").onchange=()=>{$("pClienteCampo").style.display=$("pPapel").value==="cliente"?"block":"none";};
$("salvarPessoa").onclick=async()=>{
  const b=$("salvarPessoa");b.disabled=true;
  try{
    const papel=$("pPapel").value;
    await api("/api/admin/pessoas",{method:"POST",body:JSON.stringify({
      nome:$("pNome").value,email:$("pEmail").value,senha:$("pSenha").value,papel,
      organization_id:papel==="cliente"?$("pCliente").value:undefined})});
    alert(`Acesso criado!\n\nPasse ao usuário:\nE-mail: ${$("pEmail").value}\nSenha: ${$("pSenha").value}`);
    fecharModal("modalPessoa");carregarPessoas();
  }catch(e){alert("Erro: "+e.message);}finally{b.disabled=false;}
};

// ---------- LAUDOS ----------
async function carregarLaudos(){
  try{
    const ls=await api("/api/admin/laudos");
    const URG={ok:["Saudável","#2E7D55"],atencao:["Atenção","#B8860B"],alerta:["Alerta","#C05621"],critico:["Crítico","#B23A2E"]};
    $("listaLaudos").innerHTML=ls.length?`<table class="tbl">
      <tr><th>Cliente</th><th>Aquário</th><th>Nota</th><th>Situação</th><th>Data</th></tr>
      ${ls.map(l=>{const[t,cor]=URG[l.urgency]||URG.ok;return `<tr>
        <td>${l.asset?.organization?.name||"—"}</td>
        <td>${l.asset?.label||"—"}</td>
        <td style="font-weight:700;color:${cor}">${l.health_score}</td>
        <td style="color:${cor}">${t}</td>
        <td style="color:var(--suave)">${new Date(l.created_at).toLocaleDateString("pt-BR")}</td>
      </tr>`;}).join("")}</table>`:`<div class="vazio">Nenhum laudo ainda.</div>`;
  }catch(e){$("listaLaudos").innerHTML=`<div class="vazio">Erro: ${e.message}</div>`;}
}

// ---------- SUPORTE (tickets) ----------
async function carregarTickets(){
  try{
    const ts=await api("/api/admin/tickets");
    $("listaTickets").innerHTML = ts.length ? ts.map(t=>`
      <div class="ticket-card">
        <div class="ticket-top">
          <div><b>${t.assunto}</b> <span style="color:var(--suave);font-size:13px">— ${t.usuario_nome} (${t.usuario_email})</span></div>
          <span class="status status-${t.status}">${t.status}</span>
        </div>
        <p style="font-size:13.5px;color:var(--suave);margin-top:6px">${t.mensagem}</p>
        ${(t.anexos||[]).length?`<div style="margin-top:6px">${t.anexos.map(a=>`<a href="${a}" target="_blank" style="font-size:12px;color:var(--agua);margin-right:8px">anexo</a>`).join("")}</div>`:""}
        ${t.resposta?`<div style="margin-top:8px;padding:10px 14px;background:var(--agua-clr);border-radius:8px;font-size:13.5px"><b>Sua resposta:</b><br>${t.resposta}</div>`:""}
        <div style="margin-top:10px"><button class="btn btn-c btn-sm" data-responder="${t.id}" data-assunto="${t.assunto}">Responder</button></div>
      </div>`).join("") : `<div class="vazio">Nenhum chamado por enquanto.</div>`;
    document.querySelectorAll("[data-responder]").forEach(b=>b.onclick=()=>{
      $("tkId").value=b.dataset.responder; $("tkResumo").textContent=b.dataset.assunto;
      $("tkResposta").value=""; $("tkStatus").value="respondido";
      abrir("modalTicket");
    });
  }catch(e){$("listaTickets").innerHTML=`<div class="vazio">Erro: ${e.message}</div>`;}
}
$("salvarTicket").onclick=async()=>{
  const b=$("salvarTicket");b.disabled=true;
  try{
    await api(`/api/admin/tickets/${$("tkId").value}`,{method:"PATCH",body:JSON.stringify({
      resposta:$("tkResposta").value, status:$("tkStatus").value})});
    fecharModal("modalTicket");carregarTickets();
  }catch(e){alert("Erro: "+e.message);}finally{b.disabled=false;}
};

// ---------- AQUABOOK (sugestões de espécie) ----------
async function carregarSugestoes(){
  try{
    const ss=await api("/api/admin/especies/sugestoes");
    $("listaSugestoes").innerHTML = ss.length ? ss.map(s=>`
      <div class="sug-card">
        <div>
          <b>${s.nome_comum}</b> ${s.nome_cientifico?`<i style="color:var(--suave)">(${s.nome_cientifico})</i>`:""}
          <div style="font-size:13px;color:var(--suave)">sugerido por ${s.usuario_nome||"visitante"} · ${s.categoria||"—"}</div>
          ${s.descricao?`<p style="font-size:13.5px;margin-top:4px">${s.descricao}</p>`:""}
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-shrink:0">
          <span class="status ${s.status==="em_moderacao"?"status-aberto":s.status==="aprovada"?"status-respondido":"status-fechado"}">${s.status}</span>
          ${s.status==="em_moderacao"?`
            <button class="btn btn-p btn-sm" data-aprovar="${s.id}">Aprovar</button>
            <button class="btn btn-sm" style="background:#FEE2E2;color:#991B1B;border:1px solid #FECACA;cursor:pointer" data-rejeitar="${s.id}">Rejeitar</button>
          `:""}
        </div>
      </div>`).join("") : `<div class="vazio">Nenhuma sugestão por enquanto.</div>`;
    document.querySelectorAll("[data-aprovar]").forEach(b=>b.onclick=async()=>{
      try{await api(`/api/admin/especies/sugestoes/${b.dataset.aprovar}`,{method:"PATCH",body:JSON.stringify({status:"aprovada"})});carregarSugestoes();}
      catch(e){alert("Erro: "+e.message);}
    });
    document.querySelectorAll("[data-rejeitar]").forEach(b=>b.onclick=async()=>{
      try{await api(`/api/admin/especies/sugestoes/${b.dataset.rejeitar}`,{method:"PATCH",body:JSON.stringify({status:"rejeitada"})});carregarSugestoes();}
      catch(e){alert("Erro: "+e.message);}
    });
  }catch(e){$("listaSugestoes").innerHTML=`<div class="vazio">Erro: ${e.message}</div>`;}
}

carregarClientes();carregarPessoas();carregarLaudos();carregarTickets();carregarSugestoes();
