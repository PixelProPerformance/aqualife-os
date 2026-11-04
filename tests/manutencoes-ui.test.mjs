import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const code=readFileSync(new URL('../public/js/manutencoes-cliente.js',import.meta.url),'utf8');
async function render(data,{token='test',status=200}={}){
 const root={innerHTML:'',setAttribute(){},querySelectorAll(){return []},querySelector(){return {addEventListener(){}}}};
 let calls=0;
 vm.runInNewContext(code,{document:{getElementById:()=>root},localStorage:{getItem:()=>token},fetch:async()=>{calls++;return {status,ok:status===200,json:async()=>data}},Date,URL});
 await new Promise(r=>setImmediate(r));return {html:root.innerHTML,calls};
}
test('UI: saldo 3/1/2, escape de texto e números e datas inválidas',async()=>{
 const {html}=await render({pacotes:[{id:'p',descricao:'<img src=x onerror=alert(1)>',total_visitas:3,utilizadas:1,restantes:2}],usos:[{pacote_id:'p',data_visita:'2026-02-30',relatorio_url:'javascript:alert(1)'}]});
 assert.match(html,/&lt;img/);assert.doesNotMatch(html,/<img|javascript:/);assert.match(html,/Contratadas<\/dt><dd>3/);assert.match(html,/Utilizadas<\/dt><dd>1/);assert.match(html,/Disponíveis<\/dt><dd>2/);assert.match(html,/data-label="Data">—/);
 const bad=await render({pacotes:[{total_visitas:'<svg onload=x>',restantes:0}],usos:[]});assert.doesNotMatch(bad.html,/<svg/);assert.match(bad.html,/Saldo esgotado/);
});
test('UI: sem pacote, sem visitas, erro e sessão ausente',async()=>{
 assert.match((await render({pacotes:[],usos:[]})).html,/Agendar uma manutenção/);
 assert.match((await render({pacotes:[{total_visitas:3,restantes:3}],usos:[]})).html,/Ainda não há manutenções/);
 assert.match((await render(null,{status:500})).html,/Tentar novamente/);
 const missing=await render(null,{token:null});assert.equal(missing.calls,0);assert.match(missing.html,/A sessão terminou/);
});
