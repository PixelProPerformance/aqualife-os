// Establishes/cleans visual-only staging fixtures; imported phase2 helper guards project/database.
import './visual-marketplace-phase2.mjs';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import pg from 'pg';
import {TERMS_VERSION} from '../src/marketplace/validation.js';
assert.equal(process.env.RAILWAY_PROJECT_ID,'f0a54aac-7782-432e-9339-77a261e2c4c8');
const db=new pg.Client({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}}),tokens=[];
const base='https://aqualife-os-production-a81a.up.railway.app';
async function request(url,token,body,method=body?'POST':'GET'){const r=await fetch(base+url,{method,headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});assert.ok(r.ok,'VISUAL_FIXTURE_API');return r.json();}
function cnpj(){let s='9'+Array.from(randomBytes(11),n=>String(n%10)).join('');for(const n of [12,13]){let w=n===12?5:6,sum=0;for(let i=0;i<n;i++){sum+=Number(s[i])*w;w=w===2?9:w-1;}const r=sum%11;s+=r<2?'0':String(11-r);}return s;}
try{
 await db.connect();assert.equal((await db.query('SELECT current_database() name')).rows[0].name,'aqualife_marketplace_staging');
 if(process.argv.includes('--cleanup')){
  const ids=(await db.query("SELECT su.seller_id FROM marketplace_seller_user su JOIN app_user u ON u.id=su.user_id WHERE u.name='SYNTHETIC-MP2-VISUAL' AND u.email IN ('qa-mp2-owner-20261026@example.invalid','qa-mp2-admin-20261026@example.invalid')")).rows.map(r=>r.seller_id);
  if(ids.length){await db.query("UPDATE marketplace_offer SET status='suspended' WHERE seller_id=ANY($1::uuid[])",[ids]);await db.query("UPDATE marketplace_catalog_product SET moderation_status='rejected' WHERE id IN (SELECT catalog_product_id FROM marketplace_catalog_submission WHERE seller_id=ANY($1::uuid[]) AND title LIKE 'VISUAL-PHASE3%')",[ids]);}
  console.log(JSON.stringify({result:'PASS',scope:'PHASE3_VISUAL_CLEANUP',visualOffersSuspended:true}));
 }else{
  if(process.exitCode)throw Error('VISUAL_ACCOUNT_SETUP_FAILED');
  const owner=await request('/api/login',null,{email:'qa-mp2-owner-20261026@example.invalid',senha:process.env.QA_PASSWORD});tokens.push(owner.token);
  const admin=await request('/api/login',null,{email:'qa-mp2-admin-20261026@example.invalid',senha:process.env.QA_PASSWORD});tokens.push(admin.token);
  const shops=await request('/api/marketplace/my-sellers',owner.token);
  let store=shops.find(s=>s.trade_name==='Loja Coral · catálogo visual'&&s.status==='approved');
  if(!store){store=await request('/api/marketplace/sellers/apply',owner.token,{legal_name:'EMPRESA FICTÍCIA — FASE 3',trade_name:'Loja Coral · catálogo visual',cnpj:cnpj(),contact_name:'Pessoa fictícia',contact_email:'visual@example.invalid',contact_phone:'11999999999',zip_code:'01001000',street:'Rua fictícia',number:'100',city:'São Paulo',state:'SP',terms_version:TERMS_VERSION,terms_accepted:true});
   await request(`/api/admin/marketplace/sellers/${store.id}/status`,admin.token,{status:'approved',expected_status:'pending',revision:1,note:'Homologação visual fictícia; sem verificação fiscal real',fiscal_checked:true,contact_checked:true,address_checked:true},'PATCH');
  }
  console.log(JSON.stringify({result:'PASS',scope:'PHASE3_VISUAL_READY',seller_id:store.id,commerce_enabled:false}));
 }
}catch(e){console.error(JSON.stringify({result:'FAIL',scope:'PHASE3_VISUAL',code:e.code||e.name}));process.exitCode=1;}
finally{for(const token of tokens)await request('/api/logout',token,{}).catch(()=>{});await db.end();}
