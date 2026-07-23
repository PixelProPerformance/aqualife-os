const $=id=>document.getElementById(id);
const token=localStorage.getItem("aqualife_token");
const user=JSON.parse(localStorage.getItem("aqualife_user")||"null");
if(!token||!user||!["admin","gestor"].includes(user.role)) location.href="/entrar.html?equipe=1";
$("sair").onclick=()=>{localStorage.clear();location.href="/entrar.html"};

async function api(c){
  const r=await fetch(c,{headers:{authorization:"Bearer "+token}});
  if(!r.ok)throw new Error("HTTP "+r.status);
  return r.json();
}
const AGUA="#1B6E8C",TINTA="#12333F",OK="#22C55E",AM="#EAB308",LAR="#F2792B",ROXO="#7C6FD6";
const PALETA=[AGUA,LAR,OK,AM,ROXO,"#0E7490","#EF4444","#64748B"];
const fmt=n=>(n||0).toLocaleString("pt-BR");
const seg=s=>{s=s||0;return s<60?s+"s":Math.floor(s/60)+"m "+(s%60)+"s";};
let range="7d",chSerie=null,chDisp=null,timer=null;

function barras(el,itens,cor){
  const box=$(el);const max=Math.max(1,...itens.map(i=>i.v));
  if(!itens.length){box.innerHTML='<div class="vazio">Sem dados ainda.</div>';return;}
  box.innerHTML='<div class="bars">'+itens.map(i=>`
    <div><div class="bar-row"><span class="lbl">${i.k}</span><span class="num">${fmt(i.v)}</span></div>
    <div class="bar-track"><div class="bar-fill" style="width:${Math.round(i.v/max*100)}%;background:${cor||AGUA}"></div></div></div>`).join("")+'</div>';
}

async function carregar(){
  try{
    const d=await api("/api/admin/analytics/overview?range="+range);
    $("kpis").innerHTML=`
      <div class="kpi live"><div class="rot">Online agora</div><div class="val"><span class="dot"></span>${fmt(d.online)}</div><div class="sub">últimos 5 min</div></div>
      <div class="kpi"><div class="rot">Visitantes hoje</div><div class="val">${fmt(d.visitantes_hoje)}</div><div class="sub">únicos</div></div>
      <div class="kpi"><div class="rot">Na semana</div><div class="val">${fmt(d.visitantes_semana)}</div><div class="sub">7 dias</div></div>
      <div class="kpi"><div class="rot">No mês</div><div class="val">${fmt(d.visitantes_mes)}</div><div class="sub">30 dias</div></div>
      <div class="kpi"><div class="rot">Novos</div><div class="val">${fmt(d.novos)}</div><div class="sub">no período</div></div>
      <div class="kpi"><div class="rot">Recorrentes</div><div class="val">${fmt(d.recorrentes)}</div><div class="sub">no período</div></div>
      <div class="kpi"><div class="rot">Logados</div><div class="val">${fmt(d.logados)}</div><div class="sub">usuários</div></div>
      <div class="kpi"><div class="rot">Sessões</div><div class="val">${fmt(d.sessoes)}</div><div class="sub">no período</div></div>
      <div class="kpi"><div class="rot">Tempo médio</div><div class="val">${seg(d.tempo_medio_s)}</div><div class="sub">por página</div></div>
      <div class="kpi"><div class="rot">Rejeição</div><div class="val">${d.rejeicao}%</div><div class="sub">1 página só</div></div>
      <div class="kpi"><div class="rot">Eventos</div><div class="val">${fmt(d.eventos)}</div><div class="sub">no período</div></div>`;

    // série diária
    if(typeof Chart!=="undefined"){
      const labels=(d.serie||[]).map(s=>s.dia.slice(5).replace("-","/"));
      const vis=(d.serie||[]).map(s=>s.visitantes),ev=(d.serie||[]).map(s=>s.eventos);
      if(chSerie)chSerie.destroy();
      chSerie=new Chart($("chSerie"),{data:{labels,datasets:[
        {type:"bar",label:"Visitantes",data:vis,backgroundColor:AGUA,borderRadius:5,yAxisID:"y"},
        {type:"line",label:"Eventos",data:ev,borderColor:LAR,backgroundColor:LAR,tension:.3,yAxisID:"y1",pointRadius:2}]},
        options:{responsive:true,maintainAspectRatio:false,interaction:{mode:"index",intersect:false},
          plugins:{legend:{position:"bottom"}},
          scales:{y:{beginAtZero:true,position:"left"},y1:{beginAtZero:true,position:"right",grid:{drawOnChartArea:false}}}}});

      const disp=d.dispositivos||[];
      if(chDisp)chDisp.destroy();
      chDisp=new Chart($("chDisp"),{type:"doughnut",data:{labels:disp.map(x=>x.k),datasets:[
        {data:disp.map(x=>x.v),backgroundColor:PALETA,borderWidth:0}]},
        options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"bottom"}}}});
    }

    // top páginas (tabela)
    const tp=d.top_paginas||[];
    $("topPaginas").innerHTML=tp.length?`<table class="tbl"><thead><tr><th>Página</th><th class="num">Views</th><th class="num">Únicos</th></tr></thead>
      <tbody>${tp.map(p=>`<tr><td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.k}</td><td class="num">${fmt(p.views)}</td><td class="num">${fmt(p.uniq)}</td></tr>`).join("")}</tbody></table>`
      :'<div class="vazio">Sem dados ainda.</div>';

    barras("topEventos",(d.top_eventos||[]).map(e=>({k:e.k,v:e.v})),LAR);
    barras("origens",d.origens||[],ROXO);
    barras("sistemas",d.sistemas||[],AGUA);
    barras("navegadores",d.navegadores||[],OK);
    barras("paises",d.paises||[],AM);
  }catch(e){
    $("kpis").innerHTML=`<div class="vazio">Erro ao carregar: ${e.message}</div>`;
  }
}

// ---------- FUNIL ----------
let abaAtual="geral";
const CORES_FUNIL=[AGUA,"#1a7d9e",OK,LAR,ROXO,"#0E7490"];
async function carregarFunil(){
  try{
    const d=await api("/api/admin/analytics/funnel?range="+range);
    const et=d.etapas||[];
    const topo=Math.max(1,d.total||1);
    // alerta do maior abandono
    const m=d.maior_abandono;
    $("funilAlerta").innerHTML=(m&&m.pct>0)?`<div class="falert">🔻 <b>Maior abandono:</b> ${m.pct}% dos usuários desistem entre <b>${m.de}</b> e <b>${m.para}</b> (${fmt(m.n)} pessoas). Priorize melhorar essa passagem.</div>`:"";
    if(!d.total){$("funil").innerHTML='<div class="vazio">Ainda sem visitantes suficientes no período. O funil se preenche conforme o tráfego chega.</div>';return;}
    let html="";
    et.forEach((e,i)=>{
      const w=Math.max(12,Math.round(e.usuarios/topo*100));
      html+=`<div class="fstep"><div class="fstep-bar" style="width:${w}%;background:${CORES_FUNIL[i%CORES_FUNIL.length]}">
        <span class="n">${fmt(e.usuarios)}</span><span class="l">${e.label}</span><span class="p">${e.pct_topo}%</span></div></div>`;
      if(i<et.length-1){
        const prox=et[i+1];
        const big=d.maior_abandono&&d.maior_abandono.para===prox.label&&prox.abandono_pct>0;
        html+=`<div class="fdrop ${big?"big":""}"><span class="down">▼ ${prox.abandono_pct}% de abandono</span>
          <span>· seguem ${prox.pct_anterior}% para "${prox.label}"</span></div>`;
      }
    });
    $("funil").innerHTML=html;
  }catch(e){ $("funil").innerHTML=`<div class="vazio">Erro: ${e.message}</div>`; }
}

document.querySelectorAll(".aba2").forEach(a=>a.onclick=()=>{
  document.querySelectorAll(".aba2").forEach(x=>x.classList.toggle("on",x===a));
  document.querySelectorAll(".pane").forEach(p=>p.classList.toggle("on",p.id==="pane-"+a.dataset.aba));
  abaAtual=a.dataset.aba;
  if(abaAtual==="funil")carregarFunil();
});

document.querySelectorAll("#rangesel button").forEach(b=>b.onclick=()=>{
  document.querySelectorAll("#rangesel button").forEach(x=>x.classList.toggle("on",x===b));
  range=b.dataset.r;
  if(abaAtual==="funil")carregarFunil(); else carregar();
});

carregar();
timer=setInterval(()=>{ if(abaAtual==="geral")carregar(); },20000); // tempo real leve
