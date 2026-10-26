import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import {TERMS_VERSION} from '../src/marketplace/validation.js';
assert.equal(process.env.RAILWAY_PROJECT_ID,'f0a54aac-7782-432e-9339-77a261e2c4c8');
const base='https://aqualife-os-production-a81a.up.railway.app';
const db=new pg.Client({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}});
const users=[],tokens=[],sellers=[],run=randomUUID(),password=randomBytes(32).toString('base64url');let step='connect';
async function request(path,{token,body,status=200,method=body?'POST':'GET'}={}){step=`${method} ${path}`;const r=await fetch(base+path,{method,headers:{'content-type':'application/json',...(token?{authorization:`Bearer ${token}`}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});const data=await r.json();assert.equal(r.status,status,step);console.log(JSON.stringify({step,status:r.status,ok:true}));return data;}
async function account(role){const id=randomUUID(),org=randomUUID(),email=id+'@example.invalid';await db.query('INSERT INTO organization(id,name) VALUES($1,$2)',[org,'SYNTHETIC-MP2-'+run]);await db.query('INSERT INTO app_user(id,organization_id,name,email,senha_hash,role) VALUES($1,$2,$3,$4,$5,$6)',[id,org,'SYNTHETIC-MP2',email,await bcrypt.hash(password,10),role]);users.push(id);const data=await request('/api/login',{body:{email,senha:password}});tokens.push(data.token);return {id,email,token:data.token};}
// Generate unique algorithmically valid synthetic CNPJs. Never assert a real fiscal identity.
function cnpj(){let s='9'+Array.from(randomBytes(11),n=>String(n%10)).join('');for(const n of [12,13]){let w=n===12?5:6,sum=0;for(let i=0;i<n;i++){sum+=Number(s[i])*w;w=w===2?9:w-1;}const r=sum%11;s+=r<2?'0':String(11-r);}return s;}
try{
 await db.connect();assert.equal((await db.query('SELECT current_database() name')).rows[0].name,'aqualife_marketplace_staging');
 assert.equal(Number((await db.query("SELECT count(*) n FROM integracao_config WHERE valor IS NOT NULL AND valor<>'' AND chave IN ('smtp_host','resend_api_key','mercadopago_access_token','melhorenvio_token','focusnfe_token','meta_capi_token')")).rows[0].n),0);
 const admin=await account('admin'),a=await account('cliente'),b=await account('cliente'),staff=await account('cliente');
 const body={legal_name:'SYNTHETIC MP2 '+run,trade_name:'Loja fictícia A',cnpj:cnpj(),contact_name:'Pessoa fictícia',contact_email:'staging@example.invalid',contact_phone:'11999999999',zip_code:'01001000',street:'Endereço fictício',number:'1',city:'São Paulo',state:'SP',terms_version:TERMS_VERSION,terms_accepted:true};
 const sa=await request('/api/marketplace/sellers/apply',{token:a.token,body,status:201});sellers.push(sa.id);
 const sb=await request('/api/marketplace/sellers/apply',{token:b.token,body:{...body,cnpj:cnpj(),trade_name:'Loja fictícia B'},status:201});sellers.push(sb.id);
 const path=(id,p)=>`/api/marketplace/sellers/${id}/${p}`;
 await request('/api/marketplace/sellers/apply',{token:b.token,body,status:409});
 await request('/api/marketplace/sellers/apply',{token:b.token,body:{...body,cnpj:'11111111111111'},status:400});
 await request('/api/admin/marketplace/sellers',{token:a.token,status:403});
 await request(path(sa.id,'dashboard'),{status:401});
 for(const module of ['profile','dashboard','offers','orders','activity','members']){await request(path(sa.id,module),{token:a.token});await request(path(sa.id,module),{token:b.token,status:403});}
 const decision={status:'approved',expected_status:'pending',revision:1,note:'Homologação fictícia; não constitui verificação fiscal real',fiscal_checked:true,contact_checked:true,address_checked:true};
 await request(`/api/admin/marketplace/sellers/${sa.id}/status`,{token:admin.token,body:{...decision,fiscal_checked:false},method:'PATCH',status:400});
 for(const id of sellers)await request(`/api/admin/marketplace/sellers/${id}/status`,{token:admin.token,body:decision,method:'PATCH'});
 await request(path(sa.id,'members'),{token:a.token,body:{email:staff.email,role:'staff'},status:201});
 for(const module of ['profile','dashboard','offers','orders','activity']){await request(path(sa.id,module),{token:staff.token});await request(path(sb.id,module),{token:staff.token,status:403});}
 await request(path(sa.id,'members'),{token:staff.token,body:{email:b.email,role:'staff'},status:403});
 await request(path(sa.id,'profile'),{token:staff.token,body,method:'PATCH',status:403});
 await request(path(sa.id,`members/${a.id}`),{token:a.token,body:{active:false},method:'PATCH',status:404});
 await request(path(sa.id,`offers/${randomUUID()}/publish`),{token:a.token,body:{},status:409});
 await request(path(sa.id,`members/${staff.id}`),{token:a.token,body:{active:false},method:'PATCH'});
 await request(path(sa.id,'dashboard'),{token:staff.token,status:403});
 await request(`/api/admin/marketplace/sellers/${sa.id}/status`,{token:admin.token,body:{...decision,status:'suspended',expected_status:'approved',revision:2},method:'PATCH'});
 await request(path(sa.id,'members'),{token:a.token,body:{email:staff.email,role:'staff'},status:403});
 const flags=(await db.query('SELECT s.status,ss.accepting_orders FROM marketplace_seller s JOIN marketplace_seller_settings ss ON ss.seller_id=s.id WHERE s.id=ANY($1::uuid[])',[sellers])).rows;assert.equal(flags.length,2);assert.ok(flags.every(s=>s.accepting_orders===false));
 assert.equal((await db.query("SELECT count(*)::int n FROM marketplace_seller_user WHERE seller_id=$1 AND user_id=$2 AND role='owner' AND active=true",[sa.id,a.id])).rows[0].n,1);
 assert.ok((await db.query('SELECT count(*)::int n FROM marketplace_audit_log WHERE seller_id=ANY($1::uuid[])',[sellers])).rows[0].n>=7);
 console.log(JSON.stringify({result:'PASS',scope:'LIVE_STAGING_SQL_API',twoShopsIsolated:true,ownerStaffVerified:true,publicationBlocked:true,syntheticFiscalData:true,paymentsExecuted:false,run}));
}catch(e){console.error(JSON.stringify({result:'FAIL',step,code:e.code||e.name,details_redacted:true}));process.exitCode=1;}
finally{
 for(const token of tokens)try{await request('/api/logout',{token,body:{}});}catch{}
 if(sellers.length){await db.query("UPDATE marketplace_seller SET status='suspended' WHERE id=ANY($1::uuid[])",[sellers]);await db.query('UPDATE marketplace_seller_user SET active=false WHERE seller_id=ANY($1::uuid[])',[sellers]);}
 if(users.length)await db.query('UPDATE app_user SET ativo=false WHERE id=ANY($1::uuid[])',[users]);
 console.log(JSON.stringify({syntheticUsersDisabled:users.length,syntheticSellersSuspended:sellers.length}));await db.end();
}
