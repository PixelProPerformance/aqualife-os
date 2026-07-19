import { diagnosticar } from "/js/motor.js";
import { REGRAS } from "/js/regras.js";

const $=id=>document.getElementById(id);
const token=localStorage.getItem("aqualife_token");
const user=JSON.parse(localStorage.getItem("aqualife_user")||"null");
if(!token||!user){ location.href="/entrar.html?equipe=1"; }

$("quem").textContent = user ? `${user.name} · equipe Aqualife` : "";
$("sair").onclick=()=>{ localStorage.clear(); location.href="/entrar.html"; };

/* ── LABELS ──────────────────────────────────────────────── */
const PARAM_LABEL={
  temperatura:"Temperatura",ph:"pH",kh:"KH",gh:"GH",
  amonia:"Amônia",nitrito:"Nitrito",nitrato:"Nitrato",
  fosfato:"Fosfato",oxigenio:"O₂",salinidade:"Salinidade",
  calcio:"Cálcio",magnesio:"Magnésio"
};
const PARAM_UNIT={
  temperatura:"°C",ph:"",kh:"dKH",gh:"dGH",
  amonia:"ppm",nitrito:"ppm",nitrato:"ppm",
  fosfato:"ppm",oxigenio:"mg/L",salinidade:"sg",
  calcio:"ppm",magnesio:"ppm"
};
const URG={
  ok:     ["Saudável",    "#22C55E"],
  atencao:["Acompanhar",  "#EAB308"],
  alerta: ["Atenção",     "#F97316"],
  critico:["Crítico",     "#EF4444"]
};
const COR_ESTADO={
  ideal:    {bar:"#22C55E", bg:"#DCFCE7", fg:"#166534"},
  aceitavel:{bar:"#EAB308", bg:"#FEF9C3", fg:"#854D0E"},
  alerta:   {bar:"#F97316", bg:"#FFEDD5", fg:"#9A3412"},
  critico:  {bar:"#EF4444", bg:"#FEE2E2", fg:"#991B1B"},
  vazio:    {bar:"#E2E8F0", bg:"#F8FAFC", fg:"#94A3B8"}
};

/* ── GAUGE SVG ────────────────────────────────────────────── */
function buildGauge(nota, cor){
  const R=52, CX=64, CY=64, SW=10;
  // arco começa em -215° e vai até +35° (250° total) — semi-círculo estendido
  const startAngle=-215, totalAngle=250;
  const endAngle=startAngle + totalAngle * (nota/100);

  function polar(cx,cy,r,angle){
    const a=angle*Math.PI/180;
    return [cx+r*Math.cos(a), cy+r*Math.sin(a)];
  }
  function arc(cx,cy,r,a1,a2,laf){
    const [x1,y1]=polar(cx,cy,r,a1);
    const [x2,y2]=polar(cx,cy,r,a2);
    return `M${x1},${y1} A${r},${r} 0 ${laf} 1 ${x2},${y2}`;
  }

  const laf = totalAngle*(nota/100)>180?1:0;
  const trackLaf = totalAngle>180?1:0;

  // track (fundo cinza)
  const trackPath=arc(CX,CY,R,startAngle,startAngle+totalAngle,trackLaf);
  // arco colorido
  const arcPath = nota===0 ? "" : arc(CX,CY,R,startAngle,endAngle,laf);

  // indicadores das 3 zonas (ticks)
  const ticks=[
    {pct:.5, c:"#FEF9C3"},{pct:.75, c:"#DCFCE7"}
  ].map(t=>{
    const a=startAngle+totalAngle*t.pct;
    const [x1,y1]=polar(CX,CY,R-7,a);
    const [x2,y2]=polar(CX,CY,R+1,a);
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${t.c}" stroke-width="2" stroke-linecap="round"/>`;
  }).join("");

  // label de nota animada via atributo data
  return `
  <svg viewBox="0 0 128 96" xmlns="http://www.w3.org/2000/svg" class="gauge-svg" data-nota="${nota}" data-cor="${cor}">
    <!-- Sombra suave no centro -->
    <circle cx="${CX}" cy="${CY}" r="44" fill="rgba(0,0,0,.04)"/>
    <!-- Track -->
    <path d="${trackPath}" fill="none" stroke="#E2E8F0" stroke-width="${SW}" stroke-linecap="round"/>
    <!-- Arco colorido -->
    ${arcPath ? `<path d="${arcPath}" fill="none" stroke="${cor}" stroke-width="${SW}" stroke-linecap="round"
      class="gauge-arc" style="filter:drop-shadow(0 0 4px ${cor}44)"/>` : ""}
    <!-- Ticks de zona -->
    ${ticks}
    <!-- Valor central -->
    <text x="${CX}" y="${CY-4}" text-anchor="middle" font-size="26" font-weight="700"
      fill="${cor}" font-family="'Inter',sans-serif" class="gauge-num">${nota}</text>
    <text x="${CX}" y="${CY+13}" text-anchor="middle" font-size="9" fill="#94A3B8"
      font-family="'Inter',sans-serif" letter-spacing=".08em">DE 100</text>
  </svg>`;
}

/* ── BARRA DE PARÂMETRO ───────────────────────────────────── */
function buildParamBar(p){
  // p = { parametro, valor, estado, faixa_ideal, desconto }
  // ou null (parâmetro ainda não preenchido)
  const k = p?.parametro;
  const label = PARAM_LABEL[k] || k || "—";
  const unit  = PARAM_UNIT[k]  || "";

  if(!p){
    // slot vazio — exibe só o label e barra vazia
    return `
    <div class="pb-wrap">
      <div class="pb-header">
        <span class="pb-label">${label}</span>
        <span class="pb-valor pb-vazio">—</span>
      </div>
      <div class="pb-track"><div class="pb-fill" style="width:0%"></div></div>
    </div>`;
  }

  const C=COR_ESTADO[p.estado]||COR_ESTADO.vazio;
  const [imin,imax]=p.faixa_ideal||[null,null];

  // posição visual do valor dentro de uma janela [imin*0.7 … imax*1.3]
  let pct=50;
  if(imin!=null && imax!=null && imax>imin){
    const win_min=imin*0.6, win_max=imax*1.4;
    pct=Math.round(((p.valor-win_min)/(win_max-win_min))*100);
    pct=Math.max(2,Math.min(98,pct));
  }

  const ideal_label = (imin!=null && imax!=null)
    ? `Ideal: ${imin}–${imax} ${unit}`
    : "";

  const estado_label={
    ideal:"✓ Ideal", aceitavel:"⚠ Aceitável",
    alerta:"⚠ Alerta", critico:"✕ Crítico"
  }[p.estado]||"";

  return `
  <div class="pb-wrap" style="--pb-cor:${C.bar};--pb-bg:${C.bg};--pb-fg:${C.fg}">
    <div class="pb-header">
      <span class="pb-label">${label}</span>
      <span class="pb-valor" style="color:${C.fg};background:${C.bg}">${p.valor} <small>${unit}</small></span>
    </div>
    <div class="pb-track">
      <div class="pb-fill pb-fill-anim" style="width:${pct}%;background:${C.bar}"></div>
      <!-- marcadores da zona ideal -->
      ${(imin!=null && imax!=null) ? `
      <div class="pb-zone-label" style="left:${Math.max(2,Math.min(48,Math.round(((imin-imin*0.6)/((imax*1.4-imin*0.6)))*100)))}%">${imin}</div>
      <div class="pb-zone-label" style="left:${Math.max(50,Math.min(96,Math.round(((imax-imin*0.6)/((imax*1.4-imin*0.6)))*100)))}%">${imax}</div>
      ` : ""}
    </div>
    <div class="pb-meta">
      <span class="pb-estado" style="color:${C.fg}">${estado_label}</span>
      <span class="pb-ideal">${ideal_label}</span>
    </div>
  </div>`;
}

/* ── ESTADO GLOBAL ────────────────────────────────────────── */
let aquarios=[], atual=null;
let fotosSeleccionadas=[];
let ultimoDiag=null;

async function api(caminho,opts={}){
  const r=await fetch(caminho,{...opts,headers:{"content-type":"application/json",
    authorization:"Bearer "+token,...(opts.headers||{})}});
  if(!r.ok){ const j=await r.json().catch(()=>({})); throw new Error(j.erro||"HTTP "+r.status); }
  return r.json();
}

function uuidv4(){
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,c=>
    (c^crypto.getRandomValues(new Uint8Array(1))[0]&15>>c/4).toString(16));
}

/* ── CARREGAR AQUÁRIOS ────────────────────────────────────── */
try{
  aquarios=await api("/api/tecnico/aquarios");
  $("aquario").innerHTML=aquarios.length
    ? aquarios.map(a=>`<option value="${a.id}">${a.label} — ${a.organization?.name||""} (${nomeTipo(a.water_type)})</option>`).join("")
    : `<option>Nenhum aquário disponível</option>`;
  if(aquarios.length){ atual=aquarios[0]; montarCampos(); }
}catch(e){ $("aquario").innerHTML=`<option>Erro ao carregar</option>`; }

$("aquario").onchange=()=>{
  atual=aquarios.find(a=>a.id===$("aquario").value);
  montarCampos();
};

function nomeTipo(wt){return {freshwater:"água doce",marine:"marinho",pond:"lago"}[wt]||wt}

/* ── MONTAR CAMPOS ────────────────────────────────────────── */
function montarCampos(){
  if(!atual) return;
  const faixas=REGRAS.faixas[atual.water_type]||{};
  const params=Object.keys(REGRAS.pesos[atual.water_type]||{});
  $("params").innerHTML=params.map(p=>{
    const [nome,un]=[PARAM_LABEL[p]||p, PARAM_UNIT[p]||""];
    const fx=faixas[p];
    const ideal=fx?.ideal?`ideal ${fx.ideal[0]}–${fx.ideal[1]}`:"";
    return `<div class="param">
      <label>${nome}<span class="un">${un?" · "+un:""}</span></label>
      <input type="number" step="any" inputmode="decimal" data-p="${p}" placeholder="—">
      <div class="ideal">${ideal}</div>
    </div>`;
  }).join("");
  document.querySelectorAll("[data-p]").forEach(i=>i.addEventListener("input",previa));
  previa();
}

/* ── LER VALORES ──────────────────────────────────────────── */
function lerValores(){
  const v={};
  document.querySelectorAll("[data-p]").forEach(i=>{
    if(i.value!=="") v[i.dataset.p]=parseFloat(i.value);
  });
  return v;
}

/* ── PRÉVIA COM VISUAIS ───────────────────────────────────── */
function previa(){
  const v=lerValores();
  const prev=$("previa");

  if(Object.keys(v).length===0){
    prev.innerHTML=`<div class="vazio" style="padding:38px 20px;text-align:center;color:var(--suave)">
      Preencha os parâmetros<br>para ver o diagnóstico ao vivo.</div>`;
    return;
  }

  const d=diagnosticar(v, atual.water_type);
  ultimoDiag=d;
  const [ulbl,ucor]=URG[d.urgencia];
  const confianca=d.confianca||0;

  // Mapa de parâmetros avaliados
  const mapParam={};
  (d.parametros||[]).forEach(p=>{ mapParam[p.parametro]=p; });

  // Parâmetros a mostrar (todos os do tipo de água)
  const params=Object.keys(REGRAS.pesos[atual.water_type]||{});
  const barras=params.map(k=>{
    const p=v[k]!=null ? (mapParam[k] || {parametro:k,valor:v[k],estado:"ideal",faixa_ideal:null,desconto:0}) : null;
    return buildParamBar(p ? {...p, parametro:k} : null);
  }).join("");

  prev.innerHTML=`
    <!-- GAUGE TOPO -->
    <div class="gauge-area">
      <div class="gauge-wrap">
        ${buildGauge(d.nota, ucor)}
        <div class="gauge-urgencia" style="color:${ucor}">${ulbl}</div>
        <div class="gauge-conf">Confiança: ${confianca}%</div>
      </div>
    </div>

    <!-- ALERTAS -->
    ${d.alertas.length ? `
    <div class="alertas-lista">
      ${d.alertas.map(a=>`
      <div class="alerta-item" style="border-left-color:${URG[a.urgencia]?.[1]||'#EF4444'}">
        <span class="alerta-ic">${a.urgencia==='critico'?'✕':a.urgencia==='alerta'?'⚠':'ℹ'}</span>
        <span>${a.explicacao||''}</span>
      </div>`).join("")}
    </div>` : ""}

    <!-- BARRAS DE PARÂMETROS -->
    <div class="params-barras">
      <div class="pb-titulo">Parâmetros</div>
      ${barras}
    </div>

    <!-- AÇÕES -->
    ${d.acoes?.filter(a=>a.tecnico).length ? `
    <div class="acoes-lista">
      <div class="pb-titulo">Ações recomendadas</div>
      ${d.acoes.filter(a=>a.tecnico).map(a=>`
      <div class="acao-item">
        <span class="acao-ic">→</span>
        <span>${a.tecnico}</span>
      </div>`).join("")}
    </div>` : ""}`;
}

/* ── FOTOS ────────────────────────────────────────────────── */
const inputFoto=$("input-foto");
const previewBox=$("fotos-preview");
if(inputFoto){
  inputFoto.addEventListener("change",()=>{
    const novos=Array.from(inputFoto.files);
    fotosSeleccionadas=[...fotosSeleccionadas,...novos].slice(0,10);
    renderFotos(); inputFoto.value="";
  });
}
function renderFotos(){
  if(!previewBox) return;
  previewBox.innerHTML=fotosSeleccionadas.map((f,i)=>`
    <div class="foto-thumb">
      <img src="${URL.createObjectURL(f)}" alt="${f.name}">
      <button class="foto-rm" data-i="${i}">✕</button>
      <div class="foto-nome">${f.name.slice(0,18)}</div>
    </div>`).join("");
  previewBox.querySelectorAll(".foto-rm").forEach(btn=>{
    btn.onclick=()=>{ fotosSeleccionadas.splice(+btn.dataset.i,1); renderFotos(); };
  });
}

/* ── SALVAR ───────────────────────────────────────────────── */
$("salvar").onclick=async()=>{
  const v=lerValores();
  if(Object.keys(v).length===0){ alert("Preencha ao menos um parâmetro."); return; }
  const btn=$("salvar"); btn.disabled=true; btn.textContent="Salvando…";
  try{
    const resposta=await api("/api/visita",{method:"POST",body:JSON.stringify({
      asset_id:atual.id, valores:v, observacao:$("obs").value||null,
      client_id:uuidv4(),
    })});
    if(resposta?.laudo?.id && fotosSeleccionadas.length>0){
      const fd=new FormData();
      fotosSeleccionadas.forEach(f=>fd.append("fotos",f));
      await fetch(`/api/visita/${resposta.laudo.id}/fotos`,{
        method:"POST", headers:{authorization:"Bearer "+token}, body:fd
      });
    }
    btn.textContent="✓ Enviado ao cliente";
    fotosSeleccionadas=[]; renderFotos();
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
