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
          <button class="btn btn-c btn-sm" data-add-aq="${c.id}">+ Aquário</button>
        </div>
        <div>${(c.aquarios||[]).map(a=>`<span class="aq-chip">${a.label} · ${TIPO[a.water_type]} · ${a.volume_liters||"—"}L</span>`).join("")||'<span style="font-size:13px;color:var(--suave)">Sem aquários</span>'}</div>
      </div>`).join("");
    document.querySelectorAll("[data-add-aq]").forEach(b=>b.onclick=()=>{
      $("aqOrgId").value=b.dataset.addAq; $("aqNome").value=""; $("aqVol").value=""; abrir("modalAquario");
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

carregarClientes();carregarPessoas();carregarLaudos();
