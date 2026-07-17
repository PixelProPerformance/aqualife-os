import { diagnosticar } from "/js/motor.js";
import { REGRAS } from "/js/regras.js";

const $=id=>document.getElementById(id);
const token=localStorage.getItem("aqualife_token");
const user=JSON.parse(localStorage.getItem("aqualife_user")||"null");
if(!token||!user){ location.href="/entrar.html?equipe=1"; }

$("quem").textContent = user ? `${user.name} · equipe Aqualife` : "";
$("sair").onclick=()=>{ localStorage.clear(); location.href="/entrar.html"; };

const PARAM={
  temperatura:["Temperatura","°C"], ph:["pH",""], kh:["KH","dKH"], gh:["GH","dGH"],
  amonia:["Amônia","ppm"], nitrito:["Nitrito","ppm"], nitrato:["Nitrato","ppm"],
  fosfato:["Fosfato","ppm"], oxigenio:["Oxigênio","mg/L"], salinidade:["Salinidade","densidade"],
  calcio:["Cálcio","ppm"], magnesio:["Magnésio","ppm"],
};
const URG={ok:["Saudável","selo-ok"],atencao:["Atenção","selo-atencao"],
  alerta:["Alerta","selo-alerta"],critico:["Crítico","selo-critico"]};
const COR={ok:"var(--ok)",atencao:"var(--atencao)",alerta:"var(--alerta)",critico:"var(--critico)"};

let aquarios=[], atual=null;
// Fotos seleccionadas (array de File)
let fotosSeleccionadas = [];

async function api(caminho,opts={}){
  const r=await fetch(caminho,{...opts,headers:{"content-type":"application/json",
    authorization:"Bearer "+token,...(opts.headers||{})}});
  if(!r.ok){ const j=await r.json().catch(()=>({})); throw new Error(j.erro||"HTTP "+r.status); }
  return r.json();
}

// Gerar UUID v4 puro (sem prefixo) para o client_id
function uuidv4(){
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,c=>
    (c^crypto.getRandomValues(new Uint8Array(1))[0]&15>>c/4).toString(16));
}

try{
  aquarios=await api("/api/tecnico/aquarios");
  $("aquario").innerHTML = aquarios.length
    ? aquarios.map(a=>`<option value="${a.id}">${a.label} — ${a.organization?.name||""} (${nomeTipo(a.water_type)})</option>`).join("")
    : `<option>Nenhum aquário disponível</option>`;
  if(aquarios.length){ atual=aquarios[0]; montarCampos(); }
}catch(e){ $("aquario").innerHTML=`<option>Erro ao carregar</option>`; }

$("aquario").onchange=()=>{
  atual=aquarios.find(a=>a.id===$("aquario").value);
  montarCampos();
};

function nomeTipo(wt){return {freshwater:"água doce",marine:"marinho",pond:"lago"}[wt]||wt}

function montarCampos(){
  if(!atual) return;
  const faixas=REGRAS.faixas[atual.water_type]||{};
  const params=Object.keys(REGRAS.pesos[atual.water_type]||{});
  $("params").innerHTML=params.map(p=>{
    const [nome,un]=PARAM[p]||[p,""];
    const fx=faixas[p];
    const ideal = fx?.ideal ? `ideal ${fx.ideal[0]}–${fx.ideal[1]}` : "";
    return `<div class="param">
      <label>${nome} <span class="un">${un}</span></label>
      <input type="number" step="any" inputmode="decimal" data-p="${p}" placeholder="—">
      <div class="ideal">${ideal}</div>
    </div>`;
  }).join("");
  document.querySelectorAll("[data-p]").forEach(i=>i.addEventListener("input",previa));
  previa();
}

function lerValores(){
  const v={};
  document.querySelectorAll("[data-p]").forEach(i=>{
    if(i.value!=="") v[i.dataset.p]=parseFloat(i.value);
  });
  return v;
}

function previa(){
  const v=lerValores();
  if(Object.keys(v).length===0){
    $("previa").innerHTML=`<div class="vazio" style="padding:38px 20px">Preencha os parâmetros<br>para ver o diagnóstico.</div>`;
    return;
  }
  const d=diagnosticar(v, atual.water_type);
  const [ulbl,ucls]=URG[d.urgencia];
  $("previa").innerHTML=`
    <div class="nota-cx">
      <div class="nota-num nota-g" style="color:${COR[d.urgencia]}">${d.nota}</div>
      <div class="nota-lbl">de 100 · confiança ${d.confianca}%</div>
      <div style="margin-top:10px"><span class="selo ${ucls}">${ulbl}</span></div>
    </div>
    ${d.alertas.map(a=>`<div class="diag-item">
       <span class="tag" style="color:${COR[a.urgencia]}">${URG[a.urgencia][0]}</span>
       <div>${a.explicacao}</div></div>`).join("")}
    ${d.acoes.filter(a=>a.tecnico).map(a=>`<div class="diag-item">
       <span class="tag" style="color:var(--agua)">Ação</span>
       <div>${a.tecnico}</div></div>`).join("")}`;
}

// ── FOTOS ────────────────────────────────────────────────────────
const inputFoto = $("input-foto");
const previewBox = $("fotos-preview");

if(inputFoto){
  inputFoto.addEventListener("change", ()=>{
    const novos = Array.from(inputFoto.files);
    fotosSeleccionadas = [...fotosSeleccionadas, ...novos].slice(0,10);
    renderFotos();
    inputFoto.value=""; // reset para permitir seleccionar de novo
  });
}

function renderFotos(){
  if(!previewBox) return;
  previewBox.innerHTML = fotosSeleccionadas.map((f,i)=>`
    <div class="foto-thumb">
      <img src="${URL.createObjectURL(f)}" alt="${f.name}">
      <button class="foto-rm" data-i="${i}" title="Remover">✕</button>
      <div class="foto-nome">${f.name.slice(0,18)}</div>
    </div>`).join("");
  previewBox.querySelectorAll(".foto-rm").forEach(btn=>{
    btn.onclick=()=>{ fotosSeleccionadas.splice(+btn.dataset.i,1); renderFotos(); };
  });
}

// ── SALVAR ───────────────────────────────────────────────────────
$("salvar").onclick=async()=>{
  const v=lerValores();
  if(Object.keys(v).length===0){ alert("Preencha ao menos um parâmetro."); return; }
  const btn=$("salvar"); btn.disabled=true; btn.textContent="Salvando…";
  try{
    // 1. Gravar parâmetros (JSON)
    const resposta = await api("/api/visita",{method:"POST",body:JSON.stringify({
      asset_id:atual.id, valores:v, observacao:$("obs").value||null,
      client_id: uuidv4(),   // UUID puro — sem prefixo de texto
    })});

    // 2. Enviar fotos se existirem (multipart)
    if(fotosSeleccionadas.length > 0 && resposta?.laudo?.id){
      const fd = new FormData();
      fotosSeleccionadas.forEach((f,i)=>fd.append("fotos",f));
      await fetch(`/api/visita/${resposta.laudo.id}/fotos`,{
        method:"POST",
        headers:{ authorization:"Bearer "+token },
        body: fd
      });
    }

    btn.textContent="✓ Enviado ao cliente";
    fotosSeleccionadas=[];
    renderFotos();
    setTimeout(()=>{
      document.querySelectorAll("[data-p]").forEach(i=>i.value="");
      $("obs").value=""; previa();
      btn.disabled=false; btn.textContent="Salvar e enviar ao cliente";
    },1400);
  }catch(e){
    alert("Erro: "+e.message);
    btn.disabled=false; btn.textContent="Salvar e enviar ao cliente";
  }
};
