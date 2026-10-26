import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import sharp from 'sharp';
import {legacySnapshot} from '../src/marketplace/legacy-backfill.js';
import {TERMS_VERSION} from '../src/marketplace/validation.js';
import {checkShowcase} from '../tests/helpers/showcase-scenarios.mjs';
assert.equal(process.env.RAILWAY_PROJECT_ID,'f0a54aac-7782-432e-9339-77a261e2c4c8');
const base='https://aqualife-os-production-a81a.up.railway.app',db=new pg.Client({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}});
const users=[],tokens=[],sellers=[],catalogs=[],run=randomUUID(),password=randomBytes(32).toString('base64url');let step='connect';
async function request(url,{token,body,status=200,method=body?'POST':'GET'}={}){step=method+' '+url;const multipart=body instanceof FormData,r=await fetch(base+url,{method,headers:{...(token?{authorization:'Bearer '+token}:{}),...(!multipart?{'content-type':'application/json'}:{})},body:body?(multipart?body:JSON.stringify(body)):undefined,signal:AbortSignal.timeout(30000)});const d=await r.json();assert.equal(r.status,status,step);console.log(JSON.stringify({step,status:r.status,ok:true}));return d;}
async function account(role){const id=randomUUID(),org=randomUUID(),email=id+'@example.invalid';await db.query('INSERT INTO organization(id,name) VALUES($1,$2)',[org,'SYNTHETIC-MP3-'+run]);await db.query('INSERT INTO app_user(id,organization_id,name,email,senha_hash,role) VALUES($1,$2,$3,$4,$5,$6)',[id,org,'SYNTHETIC-MP3',email,await bcrypt.hash(password,10),role]);users.push(id);const data=await request('/api/login',{body:{email,senha:password}});tokens.push(data.token);return {id,email,token:data.token};}
function cnpj(){let s='9'+Array.from(randomBytes(11),n=>String(n%10)).join('');for(const n of [12,13]){let w=n===12?5:6,sum=0;for(let i=0;i<n;i++){sum+=Number(s[i])*w;w=w===2?9:w-1;}const r=sum%11;s+=r<2?'0':String(11-r);}return s;}
try{
 await db.connect();assert.equal((await db.query('SELECT current_database() name')).rows[0].name,'aqualife_marketplace_staging');
 assert.equal(Number((await db.query("SELECT count(*) n FROM integracao_config WHERE valor IS NOT NULL AND valor<>'' AND chave IN ('smtp_host','resend_api_key','mercadopago_access_token','melhorenvio_token','focusnfe_token')")).rows[0].n),0);
 const legacy=await legacySnapshot(db),admin=await account('admin'),a=await account('cliente'),b=await account('cliente'),staff=await account('cliente');
 const company={legal_name:'SYNTHETIC MP3 '+run,trade_name:'Loja fictícia A',cnpj:cnpj(),contact_name:'Pessoa fictícia',contact_email:'staging@example.invalid',contact_phone:'11999999999',zip_code:'01001000',street:'Endereço fictício',number:'1',city:'São Paulo',state:'SP',terms_version:TERMS_VERSION,terms_accepted:true};
 const sa=await request('/api/marketplace/sellers/apply',{token:a.token,body:company,status:201});sellers.push(sa.id);const sb=await request('/api/marketplace/sellers/apply',{token:b.token,body:{...company,cnpj:cnpj(),trade_name:'Loja fictícia B'},status:201});sellers.push(sb.id);
 const route=(id,p)=>`/api/marketplace/sellers/${id}/catalog/${p}`;
 await request(route(sa.id,'offers'),{status:401});
 await request(route(sa.id,'submissions'),{token:b.token,status:403});
 const decision={status:'approved',expected_status:'pending',revision:1,note:'Homologação fictícia; sem validação fiscal real',fiscal_checked:true,contact_checked:true,address_checked:true};for(const id of sellers)await request(`/api/admin/marketplace/sellers/${id}/status`,{token:admin.token,method:'PATCH',body:decision});
 await request(`/api/marketplace/sellers/${sa.id}/members`,{token:a.token,body:{email:staff.email,role:'staff'},status:201});
 const image=await sharp({create:{width:1800,height:900,channels:3,background:'#008877'}}).png().toBuffer();const form=()=>{const f=new FormData();f.append('image',new Blob([image],{type:'image/png'}),'synthetic.png');return f;};
 await request(route(sa.id,'assets'),{token:staff.token,body:form(),status:403});
 const asset=await request(route(sa.id,'assets'),{token:a.token,body:form(),status:201});const fetched=await fetch(base+asset.url);assert.equal(fetched.status,200);const meta=await sharp(Buffer.from(await fetched.arrayBuffer())).metadata();assert.equal(meta.format,'jpeg');assert.equal(meta.width,1600);
 const product={title:'SYNTHETIC PRODUCT '+run,description:'Produto fictício para homologação de catálogo.',category:'Homologação',brand:'Teste',model:'100g',gtin:'',image_asset_id:asset.id};
 await request(route(sb.id,'submissions'),{token:b.token,body:product,status:400});
 const draft=await request(route(sa.id,'submissions'),{token:a.token,body:product,status:201});const sent=await request(route(sa.id,`submissions/${draft.id}/submit`),{token:a.token,body:{revision:1}});
 await request('/api/admin/marketplace/catalog/submissions',{token:a.token,status:403});
 const approved=await request(`/api/admin/marketplace/catalog/submissions/${draft.id}/decision`,{token:admin.token,method:'PATCH',body:{revision:sent.revision,status:'approved',note:'Produto fictício aprovado para teste'}});catalogs.push(approved.catalog_product_id);
 const payload={catalog_product_id:approved.catalog_product_id,seller_sku:'SYNTHETIC-SKU',price_cents:1990,variant_label:'100g'};
 await request(route(sa.id,'offers'),{token:staff.token,body:payload,status:403});await request(route(sa.id,'offers'),{token:a.token,body:{...payload,price_cents:1.5},status:400});
 const oa=await request(route(sa.id,'offers'),{token:a.token,body:payload,status:201}),ob=await request(route(sb.id,'offers'),{token:b.token,body:{...payload,price_cents:2990},status:201});
 await request(route(sa.id,'offers'),{token:a.token,body:payload,status:409});
 await request(route(sb.id,`offers/${oa.id}`),{token:b.token,method:'PATCH',body:{...payload,revision:1},status:404});
 for(const part of ['submissions','offers','inventory-movements']){await request(route(sa.id,part),{token:staff.token});await request(route(sa.id,part),{token:b.token,status:403});}
 const stock={revision:1,available_qty:12,reason:'Estoque fictício inicial',idempotency_key:randomUUID()};
 const pair=await Promise.all([request(route(sa.id,`offers/${oa.id}/inventory`),{token:a.token,method:'PUT',body:stock}),request(route(sa.id,`offers/${oa.id}/inventory`),{token:a.token,method:'PUT',body:stock})]);assert.equal(pair.filter(r=>r.replayed).length,1);
 await request(route(sa.id,`offers/${oa.id}/inventory`),{token:a.token,method:'PUT',body:{...stock,available_qty:13},status:409});
 await request(`/api/marketplace/sellers/${sa.id}/offers/${oa.id}/publish`,{token:a.token,body:{},status:409});
 assert.equal((await db.query('SELECT count(*)::int n FROM marketplace_inventory_movement WHERE offer_id=$1',[oa.id])).rows[0].n,1);
 const other=(await request(route(sb.id,'offers'),{token:b.token})).find(o=>o.id===ob.id);assert.equal(other.available_qty,0);assert.equal(Number(other.price_cents),2990);
 await checkShowcase({request:(path,token,options={})=>request(path,{token,...options}),a:a.token,b:b.token,staff:staff.token,admin:admin.token,sa:sa.id,sb:sb.id,oa:oa.id,ob:ob.id,productId:approved.catalog_product_id});
 const race=await Promise.all([
  request(`/api/admin/marketplace/catalog/products/${approved.catalog_product_id}/withdraw`,{token:admin.token,body:{note:'Retirada fictícia concorrente'}}),
  (async()=>{const r=await fetch(base+route(sb.id,`offers/${ob.id}`),{method:'PATCH',headers:{authorization:'Bearer '+b.token,'content-type':'application/json'},body:JSON.stringify({...payload,price_cents:2990,revision:1})});await r.json();return r.status;})()
 ]);assert.ok([200,409].includes(race[1]));assert.equal((await request(route(sb.id,'offers'),{token:b.token})).find(o=>o.id===ob.id).status,'suspended');
 assert.equal((await db.query('SELECT count(*)::int n FROM marketplace_seller_settings WHERE seller_id=ANY($1::uuid[]) AND accepting_orders=true',[sellers])).rows[0].n,0);
 assert.equal((await legacySnapshot(db)).fingerprint,legacy.fingerprint);
 console.log(JSON.stringify({result:'PASS',scope:'LIVE_PHASE3_SQL_API',twoShopsIsolated:true,ownerStaffVerified:true,imageReencodedAndPersisted:true,inventoryReplayVerified:true,legacyDataUnchanged:true,commerce_enabled:false,paymentsExecuted:false,run}));
}catch(e){console.error(JSON.stringify({result:'FAIL',step,code:e.code||e.name,details_redacted:true}));process.exitCode=1;}
finally{
 for(const token of tokens)try{await request('/api/logout',{token,body:{}});}catch{}
 if(sellers.length){await db.query("UPDATE marketplace_seller SET status='suspended' WHERE id=ANY($1::uuid[])",[sellers]);await db.query('UPDATE marketplace_seller_user SET active=false WHERE seller_id=ANY($1::uuid[])',[sellers]);await db.query("UPDATE marketplace_offer SET status='suspended' WHERE seller_id=ANY($1::uuid[])",[sellers]);}
 if(catalogs.length)await db.query("UPDATE marketplace_catalog_product SET moderation_status='rejected' WHERE id=ANY($1::uuid[])",[catalogs]);
 if(users.length)await db.query('UPDATE app_user SET ativo=false WHERE id=ANY($1::uuid[])',[users]);
 console.log(JSON.stringify({syntheticUsersDisabled:users.length,syntheticSellersSuspended:sellers.length,syntheticCatalogProductsHidden:catalogs.length}));await db.end();
}
