const fs=require('fs');const path=require('path');const express=require('express');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const app=express();app.use(express.static(path.resolve('public')));const server=app.listen(8791,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const browser=await chromium.launch({headless:true,channel:'msedge'});const results=[];
 const pkg='44444444-4444-4444-8444-444444444444',use='55555555-5555-4555-8555-555555555555';
 const data={pacotes:[{id:pkg,descricao:'Pacote inicial',total_visitas:3,utilizadas:1,restantes:2}],usos:[{id:use,pacote_id:pkg,data_visita:'2026-11-04',relatorio_url:'/api/laudo/66666666-6666-4666-8666-666666666666/cliente'}]};
 try{
 for(const file of ['painel','dashboard'])for(const width of [320,390,1280]){
  const page=await browser.newPage({viewport:{width,height:900}});
  await page.addInitScript(()=>{localStorage.setItem('aqualife_token','qa');localStorage.setItem('aqualife_user',JSON.stringify({name:'Cliente QA',role:'cliente'}));});
  await page.route('**/api/**',async route=>{const u=route.request().url();let body=u.endsWith('/manutencoes')?data:u.includes('/relatorio')?{aquario:'Aquário QA',nota:90,texto:'<img src=x onerror="window.xss=1"> Relatório autorizado de teste.'}:u.includes('/painel')?{ambientes:[]}:u.includes('/termo/status')?{aceito:true}:u.includes('/dashboard')?{saudacao:'Olá, Cliente QA',resumo_aquarios:{total:0},ultimos_relatorios:[],avisos:[]}:u.includes('/aquarios')?[]:{};await route.fulfill({json:body});});
  await page.goto('http://127.0.0.1:8791/'+file+'.html',{waitUntil:'domcontentloaded'});
  const root=page.locator('#manutencoes-cliente');await root.getByText('Pacote inicial',{exact:true}).first().waitFor();
  await root.getByRole('button',{name:'Ver relatório de 04/11/2026'}).click();
  await root.locator('.mc-report-text').filter({hasText:'Relatório autorizado'}).waitFor();assert.equal(await page.evaluate(()=>window.xss),undefined);
  assert.equal(await root.locator('dialog img').count(),0);await page.keyboard.press('Escape');assert.equal(await root.locator('dialog').isVisible(),false);
  const overflow=await root.evaluate(el=>el.scrollWidth>el.clientWidth);assert.equal(overflow,false);
  await root.screenshot({path:'docs/maintenance-ui/ui-'+file+'-'+width+'.png'});results.push({page:file,width,overflow,reportTextEscaped:true,escapeClosesDialog:true});await page.close();
 }
 fs.writeFileSync('docs/maintenance-ui/ui-browser-evidence.json',JSON.stringify({fixtureData:true,results},null,2));console.log(JSON.stringify(results));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1)});
