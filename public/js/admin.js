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

// ---------- ASSINATURAS & MERCADO PAGO ----------
const reais=c=>(c/100).toFixed(2);
async function carregarOferta(){
  try{
    const c=await api("/api/admin/founding-members");
    $("ofertaResumo").innerHTML=`Vagas usadas: <b>${c.slots_used}</b> de ${c.max_slots} · oferta ${c.ativo?"<b style='color:#065F46'>ativa</b>":"inativa"}`;
    $("fMax").value=c.max_slots;
    $("fPrazo").value=c.deadline?c.deadline.slice(0,10):"";
    $("fMensal").value=reais(c.price_mensal_cents??3490);
    $("fAnual12x").value=reais(c.price_anual_12x_cents??21480);
    $("fAnualPix").value=reais(c.price_anual_pix_cents??18900);
    $("fAtivo").value=String(c.ativo);
  }catch(e){$("ofertaResumo").textContent="Erro ao carregar: "+e.message;}
}
$("salvarOferta").onclick=async()=>{
  const b=$("salvarOferta");b.disabled=true;
  try{
    await api("/api/admin/founding-members",{method:"PUT",body:JSON.stringify({
      max_slots:parseInt($("fMax").value)||null,
      deadline:$("fPrazo").value||null,
      ativo:$("fAtivo").value==="true",
      price_mensal_cents:Math.round(parseFloat($("fMensal").value)*100)||null,
      price_anual_12x_cents:Math.round(parseFloat($("fAnual12x").value)*100)||null,
      price_anual_pix_cents:Math.round(parseFloat($("fAnualPix").value)*100)||null,
    })});
    carregarOferta();alert("Oferta atualizada.");
  }catch(e){alert("Erro: "+e.message);}finally{b.disabled=false;}
};

async function carregarMP(){
  try{
    const m=await api("/api/admin/integracoes/mercadopago");
    $("mpStatus").innerHTML=m.configurado
      ? `<span style="color:#065F46;font-weight:600">✓ Configurado</span> · token ${m.access_token_mascarado||""}`
      : `<span style="color:#92400E;font-weight:600">⚠ Ainda não configurado</span> — cadastre o Access Token para ativar os pagamentos.`;
    if(m.public_key) $("mpPub").value=m.public_key;
  }catch(e){$("mpStatus").textContent="Erro ao carregar: "+e.message;}
}
$("salvarMP").onclick=async()=>{
  const b=$("salvarMP");b.disabled=true;
  try{
    await api("/api/admin/integracoes/mercadopago",{method:"PUT",body:JSON.stringify({
      access_token:$("mpToken").value, public_key:$("mpPub").value, webhook_secret:$("mpSecret").value})});
    $("mpToken").value="";$("mpSecret").value="";
    carregarMP();alert("Credenciais salvas.");
  }catch(e){alert("Erro: "+e.message);}finally{b.disabled=false;}
};

// ---------- E-MAIL (Resend / SMTP) ----------
async function carregarEmail(){
  try{
    const e=await api("/api/admin/integracoes/email");
    const prov={resend:"Resend (HTTPS)",smtp:"SMTP",nenhum:null}[e.provedor];
    $("emailStatus").innerHTML=e.configurado
      ? `<span style="color:#065F46;font-weight:600">✓ Ativo via ${prov}</span>`
      : `<span style="color:#92400E;font-weight:600">⚠ Ainda não configurado</span> — cole a API key do Resend para ativar.`;
    if(e.email_from) $("emailFrom").value=e.email_from;
    if(e.email_reply_to) $("emailReplyTo").value=e.email_reply_to;
    if(e.smtp_host) $("smtpHost").value=e.smtp_host;
    if(e.smtp_port) $("smtpPort").value=e.smtp_port;
    if(e.smtp_user) $("smtpUser").value=e.smtp_user;
    $("smtpSecure").value=String(e.smtp_secure)==="true"?"true":"false";
    if(e.resend_definido) $("resendKey").placeholder="chave salva ("+(e.resend_api_key_mascarada||"")+") — deixe em branco para manter";
  }catch(e){$("emailStatus").textContent="Erro ao carregar: "+e.message;}
}
$("salvarEmail").onclick=async()=>{
  const b=$("salvarEmail");b.disabled=true;
  try{
    await api("/api/admin/integracoes/email",{method:"PUT",body:JSON.stringify({
      resend_api_key:$("resendKey").value,
      email_from:$("emailFrom").value, email_reply_to:$("emailReplyTo").value,
      smtp_host:$("smtpHost").value, smtp_port:$("smtpPort").value||"587",
      smtp_secure:$("smtpSecure").value, smtp_user:$("smtpUser").value,
      smtp_pass:$("smtpPass").value})});
    $("smtpPass").value="";$("resendKey").value="";
    carregarEmail();alert("Configuração de e-mail salva.");
  }catch(e){alert("Erro: "+e.message);}finally{b.disabled=false;}
};
$("testarEmail").onclick=async()=>{
  const para=prompt("Enviar e-mail de teste para qual endereço?", user.email||"");
  if(!para) return;
  const b=$("testarEmail");b.disabled=true;b.textContent="Enviando…";
  try{
    const r=await api("/api/admin/integracoes/email/teste",{method:"POST",body:JSON.stringify({para})});
    alert(r.mensagem||"Enviado!");
  }catch(e){alert("Erro: "+e.message);}finally{b.disabled=false;b.textContent="Enviar e-mail de teste";}
};

// ---------- ACADEMY ----------
const NIVEL_L={iniciante:"Iniciante",intermediario:"Intermediário",avancado:"Avançado"};
async function carregarCursos(){
  try{
    const cs=await api("/api/admin/academy/cursos");
    $("listaCursos").innerHTML = cs.length ? cs.map(c=>`
      <div class="cli-card">
        <div class="cli-top">
          <div><div class="cli-nome">${c.titulo} ${c.publicado?"":'<span style="font-size:11px;color:#92400E">(rascunho)</span>'}</div>
            <div class="cli-meta">${NIVEL_L[c.nivel]||c.nivel} · ${c.total_aulas} aula(s) · ${c.total_perguntas} pergunta(s)</div></div>
          <div style="display:flex;gap:8px;align-items:center">
            <button class="btn btn-c btn-sm" data-conteudo="${c.id}" data-tit="${c.titulo}">Aulas & Quiz</button>
            <button class="btn btn-c btn-sm" data-editcurso='${JSON.stringify(c).replace(/'/g,"&apos;")}'>Editar</button>
            <button class="btn btn-sm" style="background:#FEE2E2;color:#991B1B;border:1px solid #FECACA;cursor:pointer" data-delcurso="${c.id}" data-nome="${c.titulo}">Apagar</button>
          </div>
        </div>
      </div>`).join("") : `<div class="vazio">Nenhum curso ainda. Crie o primeiro.</div>`;
    document.querySelectorAll("[data-conteudo]").forEach(b=>b.onclick=()=>abrirConteudo(b.dataset.conteudo,b.dataset.tit));
    document.querySelectorAll("[data-editcurso]").forEach(b=>b.onclick=()=>abrirCurso(JSON.parse(b.dataset.editcurso.replace(/&apos;/g,"'"))));
    document.querySelectorAll("[data-delcurso]").forEach(b=>b.onclick=async()=>{
      if(!confirm(`Apagar o curso "${b.dataset.nome}" e todo o conteúdo?`)) return;
      try{ await api("/api/admin/academy/cursos/"+b.dataset.delcurso,{method:"DELETE"}); carregarCursos(); }
      catch(e){ alert("Erro: "+e.message); }
    });
  }catch(e){ $("listaCursos").innerHTML=`<div class="vazio">Erro: ${e.message}</div>`; }
}
function limparCurso(){["curTitulo","curResumo","curDescricao","curCategoria","curDuracao"].forEach(i=>$(i).value="");$("curId").value="";$("curNivel").value="iniciante";$("curPublicado").value="true";}
$("novoCurso").onclick=()=>{ limparCurso(); $("cursoModalTitulo").textContent="Novo curso"; abrir("modalCurso"); };
function abrirCurso(c){
  $("curId").value=c.id; $("curTitulo").value=c.titulo||""; $("curResumo").value=c.resumo||"";
  $("curDescricao").value=c.descricao||""; $("curNivel").value=c.nivel||"iniciante";
  $("curCategoria").value=c.categoria||""; $("curDuracao").value=c.duracao_min||"";
  $("curPublicado").value=String(c.publicado);
  $("cursoModalTitulo").textContent="Editar curso"; abrir("modalCurso");
}
$("salvarCurso").onclick=async()=>{
  const b=$("salvarCurso");b.disabled=true;
  try{
    const payload={ titulo:$("curTitulo").value, resumo:$("curResumo").value, descricao:$("curDescricao").value,
      nivel:$("curNivel").value, categoria:$("curCategoria").value,
      duracao_min:parseInt($("curDuracao").value)||null, publicado:$("curPublicado").value==="true" };
    const id=$("curId").value;
    if(id) await api("/api/admin/academy/cursos/"+id,{method:"PUT",body:JSON.stringify(payload)});
    else   await api("/api/admin/academy/cursos",{method:"POST",body:JSON.stringify(payload)});
    fecharModal("modalCurso"); carregarCursos();
  }catch(e){ alert("Erro: "+e.message); }finally{ b.disabled=false; }
};

async function abrirConteudo(cursoId,tit){
  $("conCursoId").value=cursoId;
  $("conteudoTitulo").textContent="Conteúdo · "+tit;
  await recarregarConteudo();
  abrir("modalConteudo");
}
async function recarregarConteudo(){
  const cursoId=$("conCursoId").value;
  const d=await api("/api/admin/academy/cursos/"+cursoId);
  $("listaAulas").innerHTML = d.aulas.length ? d.aulas.map(a=>`
    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;border:1px solid var(--linha);border-radius:8px;margin-bottom:6px;font-size:13.5px">
      <span><b>${a.ordem}.</b> ${a.titulo}</span>
      <span class="rm" data-delaula="${a.id}">remover</span></div>`).join("") : `<div style="font-size:13px;color:var(--suave)">Sem aulas ainda.</div>`;
  $("listaPerguntas").innerHTML = d.perguntas.length ? d.perguntas.map(p=>`
    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;border:1px solid var(--linha);border-radius:8px;margin-bottom:6px;font-size:13.5px">
      <span>${p.pergunta}</span>
      <span class="rm" data-delpg="${p.id}">remover</span></div>`).join("") : `<div style="font-size:13px;color:var(--suave)">Sem perguntas ainda.</div>`;
  document.querySelectorAll("[data-delaula]").forEach(b=>b.onclick=async()=>{ await api("/api/admin/academy/aulas/"+b.dataset.delaula,{method:"DELETE"}); recarregarConteudo(); carregarCursos(); });
  document.querySelectorAll("[data-delpg]").forEach(b=>b.onclick=async()=>{ await api("/api/admin/academy/perguntas/"+b.dataset.delpg,{method:"DELETE"}); recarregarConteudo(); carregarCursos(); });
}
$("addAula").onclick=async()=>{
  const cursoId=$("conCursoId").value;
  if(!$("aulaTitulo").value.trim()){ alert("Informe o título da aula."); return; }
  try{
    await api(`/api/admin/academy/cursos/${cursoId}/aulas`,{method:"POST",body:JSON.stringify({
      titulo:$("aulaTitulo").value, conteudo:$("aulaConteudo").value,
      video_url:$("aulaVideo").value, ordem:parseInt($("aulaOrdem").value)||0 })});
    ["aulaTitulo","aulaConteudo","aulaVideo"].forEach(i=>$(i).value="");
    recarregarConteudo(); carregarCursos();
  }catch(e){ alert("Erro: "+e.message); }
};
$("addPergunta").onclick=async()=>{
  const cursoId=$("conCursoId").value;
  const opcoes=$("pgOpcoes").value.split("\n").map(s=>s.trim()).filter(Boolean);
  if(!$("pgTexto").value.trim()||opcoes.length<2){ alert("Informe a pergunta e ao menos 2 opções."); return; }
  const correta=(parseInt($("pgCorreta").value)||1)-1;
  try{
    await api(`/api/admin/academy/cursos/${cursoId}/perguntas`,{method:"POST",body:JSON.stringify({
      pergunta:$("pgTexto").value, opcoes, correta, explicacao:$("pgExpl").value, ordem:parseInt($("pgOrdem").value)||0 })});
    ["pgTexto","pgOpcoes","pgExpl"].forEach(i=>$(i).value=""); $("pgCorreta").value="1";
    recarregarConteudo(); carregarCursos();
  }catch(e){ alert("Erro: "+e.message); }
};

// ---------- META CAPI ----------
async function carregarMeta(){
  try{
    const m=await api("/api/admin/integracoes/meta");
    $("metaStatus").innerHTML=m.capi_configurada
      ? `<span style="color:#065F46;font-weight:600">✓ CAPI ativa</span> · Pixel ${m.pixel_id||""}`
      : `<span style="color:#92400E;font-weight:600">⚠ CAPI não configurada</span> — cole o Access Token para ativar o Purchase pelo servidor.`;
    if(m.pixel_id) $("metaPixel").value=m.pixel_id;
    if(m.test_event_code) $("metaTest").value=m.test_event_code;
  }catch(e){$("metaStatus").textContent="Erro ao carregar: "+e.message;}
}
$("salvarMeta").onclick=async()=>{
  const b=$("salvarMeta");b.disabled=true;
  try{
    await api("/api/admin/integracoes/meta",{method:"PUT",body:JSON.stringify({
      pixel_id:$("metaPixel").value, capi_token:$("metaToken").value, test_event_code:$("metaTest").value})});
    $("metaToken").value=""; carregarMeta(); alert("Configuração da CAPI salva.");
  }catch(e){alert("Erro: "+e.message);}finally{b.disabled=false;}
};
$("testarMeta").onclick=async()=>{
  const b=$("testarMeta");b.disabled=true;b.textContent="Enviando…";
  try{
    const r=await api("/api/admin/integracoes/meta/teste",{method:"POST",body:JSON.stringify({})});
    alert(r.mensagem||"Enviado!");
  }catch(e){alert("Erro: "+e.message);}finally{b.disabled=false;b.textContent="Enviar evento de teste";}
};

// ---------- FINANCEIRO ----------
const brl=c=>(((c||0)/100)).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const dt=d=>d?new Date(d).toLocaleDateString("pt-BR"):"—";
const dth=d=>d?new Date(d).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}):"—";
const TWATER={freshwater:"Água doce",marine:"Marinho",pond:"Lago"};
const PLANONOME={avulsa:"Avulsa",mensal:"Mensal",mensal_2x:"Mensal 2x",trimestral:"Trimestral",semestral:"Semestral",anual:"Anual"};
function bdgPagto(s){const m={pago:["bdg-pago","Pago"],approved:["bdg-pago","Pago"],aprovado:["bdg-pago","Pago"],pendente:["bdg-pend","Pendente"],aguardando_pagamento:["bdg-pend","Aguardando"],falhou:["bdg-falha","Falhou"],rejected:["bdg-falha","Recusado"]};const [c,t]=m[s]||["bdg-pend",s||"—"];return `<span class="bdg ${c}">${t}</span>`;}
function bdgSub(s){const m={ativa:["bdg-ativa","Ativa"],pendente:["bdg-pend","Pendente"],cancelada:["bdg-canc","Cancelada"]};const [c,t]=m[s]||["bdg-pend",s||"—"];return `<span class="bdg ${c}">${t}</span>`;}

// subabas
document.querySelectorAll(".subaba").forEach(a=>a.onclick=()=>{
  document.querySelectorAll(".subaba").forEach(x=>x.classList.toggle("on",x===a));
  document.querySelectorAll(".subpane").forEach(p=>p.classList.toggle("on",p.id==="sub-"+a.dataset.sub));
});

let finData=null;
const liqCell=(r)=>r.liquido_cents!=null?`${brl(r.liquido_cents)}${r.taxa_estimada?'<span class="est"> ~est.</span>':""}`:"—";
const taxaCell=(r)=>r.taxa_cents!=null?brl(r.taxa_cents):"—";

async function carregarFinanceiro(){
  try{
    const d=await api("/api/admin/financeiro");
    finData=d;
    const k=d.kpis||{};
    $("finKpis").innerHTML=`
      <div class="kpi destaque"><div class="rot">Receita bruta (paga)</div><div class="val">${brl(k.receita_total_cents)}</div><div class="sub">Agendamentos + Assinaturas</div></div>
      <div class="kpi destaque" style="background:linear-gradient(135deg,#065F46,#22C55E)"><div class="rot">Receita líquida</div><div class="val">${brl(k.receita_liquida_cents)}</div><div class="sub">já descontadas as taxas</div></div>
      <div class="kpi"><div class="rot">Total em taxas (MP)</div><div class="val">${brl(k.taxas_total_cents)}</div><div class="sub">taxa estimada ${k.taxa_percent}% quando sem valor real</div></div>
      <div class="kpi"><div class="rot">Taxas no mês atual</div><div class="val">${brl(k.taxas_mes_cents)}</div><div class="sub">Mercado Pago</div></div>
      <div class="kpi"><div class="rot">Receita de agendamentos</div><div class="val">${brl(k.receita_agendamentos_cents)}</div><div class="sub">${k.agendamentos_pagos} pagos · ${k.agendamentos_pendentes} pendentes</div></div>
      <div class="kpi"><div class="rot">Receita de assinaturas</div><div class="val">${brl(k.receita_assinaturas_cents)}</div><div class="sub">${k.assinaturas_ativas} ativas</div></div>
      <div class="kpi"><div class="rot">MRR (recorrente/mês)</div><div class="val">${brl(k.mrr_cents)}</div><div class="sub">estimado das assinaturas ativas</div></div>
      <div class="kpi"><div class="rot">Assinaturas ativas</div><div class="val">${k.assinaturas_ativas}</div><div class="sub">${k.assinaturas_pendentes} pend. · ${k.assinaturas_canceladas} canc.</div></div>
      <div class="kpi"><div class="rot">Renovam em 30 dias</div><div class="val">${k.renovacoes_30d}</div><div class="sub">assinaturas a renovar</div></div>`;

    desenharGraficos(d);

    // Agendamentos
    const ag=d.agendamentos||[];
    $("finAg").innerHTML=ag.length?`<div class="tbl-wrap"><table class="tbl">
      <thead><tr><th>Cliente</th><th>Serviço</th><th>Plano</th><th class="num">Bruto</th><th class="num">Taxa</th><th class="num">Líquido</th><th>Pagamento</th><th>Data</th></tr></thead>
      <tbody>${ag.map(a=>`<tr>
        <td><b>${a.nome||"—"}</b><br><span style="color:var(--suave);font-size:12px">${a.email||""}</span></td>
        <td>${TWATER[a.water_type]||a.water_type||"—"}<br><span style="color:var(--suave);font-size:12px">${a.volume_litros?a.volume_litros+" L · ":""}${a.regiao||a.cidade||""}</span></td>
        <td>${PLANONOME[a.plano]||a.plano||"—"}</td>
        <td class="num"><b>${brl(a.valor_cobrado_cents)}</b></td>
        <td class="num" style="color:var(--critico)">${taxaCell(a)}</td>
        <td class="num" style="color:#065F46;font-weight:600">${liqCell(a)}</td>
        <td>${bdgPagto(a.status_pagamento)}</td>
        <td style="color:var(--suave);font-size:12px">${dt(a.created_at)}</td></tr>`).join("")}</tbody></table></div>`
      :`<div class="vazio">Nenhum agendamento ainda.</div>`;

    // Assinaturas Care (exclui canceladas — vão na aba própria)
    const as=(d.assinaturas||[]).filter(s=>s.status!=="cancelada");
    $("finAs").innerHTML=as.length?`<div class="tbl-wrap"><table class="tbl">
      <thead><tr><th>Cliente</th><th>Plano</th><th>Ciclo</th><th class="num">Valor</th><th>Status</th><th>Método</th><th>Próx. renovação</th></tr></thead>
      <tbody>${as.map(s=>`<tr>
        <td><b>${s.cliente_nome||"—"}</b>${s.founding_member?'<span class="fund-tag">FUNDADOR</span>':""}<br><span style="color:var(--suave);font-size:12px">${s.cliente_email||""}</span></td>
        <td>${s.plano||"Care"}</td>
        <td>${PLANONOME[s.billing_cycle]||s.billing_cycle||"—"}</td>
        <td class="num"><b>${brl(s.price_cents)}</b></td>
        <td>${bdgSub(s.status)}</td>
        <td style="font-size:12px">${s.metodo||"—"}</td>
        <td style="font-size:12px">${dt(s.current_period_end)}</td></tr>`).join("")}</tbody></table></div>`
      :`<div class="vazio">Nenhuma assinatura ativa ou pendente.</div>`;

    // Próximas renovações (ativas, ordenadas por data, próximas primeiro)
    const agora=Date.now();
    const rn=(d.assinaturas||[]).filter(s=>s.status==="ativa"&&s.current_period_end)
      .sort((a,b)=>new Date(a.current_period_end)-new Date(b.current_period_end));
    $("finRn").innerHTML=rn.length?`<div class="tbl-wrap"><table class="tbl">
      <thead><tr><th>Cliente</th><th>Plano</th><th class="num">Valor</th><th>Renova em</th><th>Faltam</th></tr></thead>
      <tbody>${rn.map(s=>{const dias=Math.ceil((new Date(s.current_period_end)-agora)/864e5);
        return `<tr>
        <td><b>${s.cliente_nome||"—"}</b><br><span style="color:var(--suave);font-size:12px">${s.cliente_email||""}</span></td>
        <td>${PLANONOME[s.billing_cycle]||s.billing_cycle||"—"}</td>
        <td class="num"><b>${brl(s.price_cents)}</b></td>
        <td>${dt(s.current_period_end)}</td>
        <td>${dias<0?'<span class="bdg bdg-falha">vencida</span>':dias<=7?`<span class="bdg bdg-pend">${dias} dias</span>`:dias+" dias"}</td></tr>`;}).join("")}</tbody></table></div>`
      :`<div class="vazio">Nenhuma renovação programada.</div>`;

    // Pagamentos (histórico)
    const pg=d.pagamentos||[];
    $("finPg").innerHTML=pg.length?`<div class="tbl-wrap"><table class="tbl">
      <thead><tr><th>Cliente</th><th>ID Mercado Pago</th><th class="num">Bruto</th><th class="num">Taxa</th><th class="num">Líquido</th><th>Status</th><th>Data</th></tr></thead>
      <tbody>${pg.map(p=>`<tr>
        <td><b>${p.cliente_nome||"—"}</b><br><span style="color:var(--suave);font-size:12px">${p.cliente_email||""}</span></td>
        <td style="font-size:12px;font-family:monospace">${p.mercadopago_payment_id||"—"}</td>
        <td class="num"><b>${brl(p.valor_cents)}</b></td>
        <td class="num" style="color:var(--critico)">${taxaCell(p)}</td>
        <td class="num" style="color:#065F46;font-weight:600">${liqCell(p)}</td>
        <td>${bdgPagto(p.status)}</td>
        <td style="color:var(--suave);font-size:12px">${dth(p.created_at)}</td></tr>`).join("")}</tbody></table></div>`
      :`<div class="vazio">Nenhum pagamento de assinatura registrado ainda.</div>`;

    // Cancelados (assinaturas canceladas + agendamentos com pagamento falho)
    const cn=(d.assinaturas||[]).filter(s=>s.status==="cancelada");
    const agFalha=(d.agendamentos||[]).filter(a=>a.status_pagamento==="falhou");
    $("finCn").innerHTML=(cn.length||agFalha.length)?`
      ${cn.length?`<h3 style="font-size:15px;margin:4px 0 10px">Assinaturas canceladas</h3><div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>Cliente</th><th>Plano</th><th class="num">Valor</th><th>Desde</th></tr></thead>
        <tbody>${cn.map(s=>`<tr><td><b>${s.cliente_nome||"—"}</b><br><span style="color:var(--suave);font-size:12px">${s.cliente_email||""}</span></td>
          <td>${PLANONOME[s.billing_cycle]||s.billing_cycle||"—"}</td><td class="num">${brl(s.price_cents)}</td>
          <td style="font-size:12px">${dt(s.created_at)}</td></tr>`).join("")}</tbody></table></div>`:""}
      ${agFalha.length?`<h3 style="font-size:15px;margin:24px 0 10px">Agendamentos com pagamento não concluído</h3><div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>Cliente</th><th>Plano</th><th class="num">Valor</th><th>Data</th></tr></thead>
        <tbody>${agFalha.map(a=>`<tr><td><b>${a.nome||"—"}</b><br><span style="color:var(--suave);font-size:12px">${a.email||""}</span></td>
          <td>${PLANONOME[a.plano]||a.plano||"—"}</td><td class="num">${brl(a.valor_cobrado_cents)}</td>
          <td style="font-size:12px">${dt(a.created_at)}</td></tr>`).join("")}</tbody></table></div>`:""}`
      :`<div class="vazio">Nada cancelado. 🎉</div>`;
  }catch(e){
    $("finKpis").innerHTML=`<div class="vazio">Erro ao carregar: ${e.message}</div>`;
  }
}
// ---- Gráficos (Chart.js) ----
let chReceita=null, chStatus=null;
const rotuloMes=m=>{const [y,mm]=m.split("-");return ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"][+mm-1]+"/"+y.slice(2);};
function desenharGraficos(d){
  if(typeof Chart==="undefined")return;
  const serie=d.serie||[];
  const labels=serie.map(s=>rotuloMes(s.mes));
  const bruto=serie.map(s=>(s.bruto_cents||0)/100);
  const liq=serie.map(s=>(s.liquido_cents||0)/100);
  const cfgY={ticks:{callback:v=>"R$ "+v.toLocaleString("pt-BR")}};
  const moneyTip=ctx=>ctx.dataset.label+": "+((ctx.raw)||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
  if(chReceita)chReceita.destroy();
  chReceita=new Chart($("grafReceita"),{type:"bar",data:{labels,datasets:[
    {label:"Bruto",data:bruto,backgroundColor:"#0E7490",borderRadius:6},
    {label:"Líquido",data:liq,backgroundColor:"#22C55E",borderRadius:6}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"bottom"},tooltip:{callbacks:{label:moneyTip}}},scales:{y:{beginAtZero:true,...cfgY}}}});

  const dist=d.dist||{pago:0,pendente:0,falhou:0};
  if(chStatus)chStatus.destroy();
  chStatus=new Chart($("grafStatus"),{type:"doughnut",data:{labels:["Pago","Pendente","Falhou"],datasets:[
    {data:[dist.pago,dist.pendente,dist.falhou],backgroundColor:["#22C55E","#EAB308","#EF4444"],borderWidth:0}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"bottom"}}}});
}

// ---- Exportar Excel (mês selecionado) ----
function noMesSel(created,mes){ if(!mes)return true; return created && new Date(created).toISOString().slice(0,7)===mes; }
$("exportarXlsx").onclick=()=>{
  if(typeof XLSX==="undefined"){alert("Biblioteca de Excel ainda carregando, tente em 1s.");return;}
  if(!finData){alert("Dados ainda não carregaram.");return;}
  const mes=$("finMes").value; const suf=mes||"tudo";
  const c=v=>v==null?"":(v/100);
  const ag=(finData.agendamentos||[]).filter(a=>noMesSel(a.created_at,mes)).map(a=>({
    Data:dt(a.created_at),Cliente:a.nome,Email:a.email,Telefone:a.telefone,
    Servico:TWATER[a.water_type]||a.water_type,Litros:a.volume_litros,Regiao:a.regiao||a.cidade,
    Plano:PLANONOME[a.plano]||a.plano,"Bruto (R$)":c(a.valor_cobrado_cents),"Taxa (R$)":c(a.taxa_cents),
    "Liquido (R$)":c(a.liquido_cents),Pagamento:a.status_pagamento}));
  const as=(finData.assinaturas||[]).filter(s=>noMesSel(s.created_at,mes)).map(s=>({
    Data:dt(s.created_at),Cliente:s.cliente_nome,Email:s.cliente_email,Plano:s.plano,
    Ciclo:PLANONOME[s.billing_cycle]||s.billing_cycle,"Valor (R$)":c(s.price_cents),Status:s.status,
    Fundador:s.founding_member?"Sim":"Não","Proxima renovacao":dt(s.current_period_end)}));
  const pg=(finData.pagamentos||[]).filter(p=>noMesSel(p.created_at,mes)).map(p=>({
    Data:dth(p.created_at),Cliente:p.cliente_nome,Email:p.cliente_email,"ID Mercado Pago":p.mercadopago_payment_id,
    "Bruto (R$)":c(p.valor_cents),"Taxa (R$)":c(p.taxa_cents),"Liquido (R$)":c(p.liquido_cents),
    Status:p.status,Metodo:p.metodo}));
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(ag.length?ag:[{Info:"sem dados"}]),"Agendamentos");
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(as.length?as:[{Info:"sem dados"}]),"Assinaturas");
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(pg.length?pg:[{Info:"sem dados"}]),"Pagamentos");
  XLSX.writeFile(wb,`aqualife-financeiro-${suf}.xlsx`);
};

$("recarregarFin").onclick=carregarFinanceiro;

carregarFinanceiro();carregarClientes();carregarPessoas();carregarLaudos();carregarTickets();carregarSugestoes();carregarOferta();carregarMP();carregarEmail();carregarMeta();carregarCursos();
