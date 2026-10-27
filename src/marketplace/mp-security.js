import {randomBytes,createCipheriv,createDecipheriv,createHash} from 'node:crypto';
export const STAGING_PROJECT='f0a54aac-7782-432e-9339-77a261e2c4c8';
export const CALLBACK_PATH='/api/marketplace/mp/oauth/callback';
export const digest=value=>createHash('sha256').update(value).digest('hex');
export function paymentConfiguration(env=process.env){
 const ids=(env.MARKETPLACE_MP_TEST_USER_IDS||'').split(',').map(s=>s.trim()).filter(Boolean);
 let redirect;try{redirect=new URL(env.MARKETPLACE_MP_REDIRECT_URI);}catch{return null;}
 if(env.RAILWAY_PROJECT_ID!==STAGING_PROJECT||env.MARKETPLACE_MP_OAUTH_ENABLED!=='true'||
  !/^\d{1,30}$/.test(env.MARKETPLACE_MP_CLIENT_ID||'')||!env.MARKETPLACE_MP_CLIENT_SECRET||
  !/^[a-f0-9]{64}$/i.test(env.MARKETPLACE_MP_ENCRYPTION_KEY||'')||!ids.length||ids.some(s=>!/^\d{1,20}$/.test(s))||
  redirect.origin!=='https://aqualife-os-production-a81a.up.railway.app'||redirect.pathname!==CALLBACK_PATH||redirect.search||redirect.hash||redirect.username||redirect.password)return null;
 return {clientId:env.MARKETPLACE_MP_CLIENT_ID,clientSecret:env.MARKETPLACE_MP_CLIENT_SECRET,key:env.MARKETPLACE_MP_ENCRYPTION_KEY,redirect:redirect.href,testUsers:ids};
}
export function seal(value,key,context){
 if(!/^[a-f0-9]{64}$/i.test(key||'')||typeof value!=='string'||!value||value.length>20000)throw Error('INVALID_SECRET');
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',Buffer.from(key,'hex'),iv);cipher.setAAD(Buffer.from(context));
 return ['v1',iv.toString('base64url'),Buffer.concat([cipher.update(value,'utf8'),cipher.final()]).toString('base64url'),cipher.getAuthTag().toString('base64url')].join('.');
}
export function unseal(value,key,context){
 const [version,iv,data,tag,...extra]=String(value).split('.');if(version!=='v1'||extra.length||!iv||!data||!tag)throw Error('INVALID_CIPHER');
 const nonce=Buffer.from(iv,'base64url'),auth=Buffer.from(tag,'base64url');if(nonce.length!==12||auth.length!==16)throw Error('INVALID_CIPHER');
 const decipher=createDecipheriv('aes-256-gcm',Buffer.from(key,'hex'),nonce);decipher.setAAD(Buffer.from(context));decipher.setAuthTag(auth);
 return Buffer.concat([decipher.update(Buffer.from(data,'base64url')),decipher.final()]).toString('utf8');
}
export function authorization(config,state,verifier){
 const url=new URL('https://auth.mercadopago.com.br/authorization');
 for(const [k,v] of Object.entries({client_id:config.clientId,response_type:'code',platform_id:'mp',redirect_uri:config.redirect,state,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'}))url.searchParams.set(k,v);
 return url.href;
}
// Fixed provider origin and paths: no user URL, token in URL or arbitrary provider requests.
export function mercadoPagoProvider(fetcher=fetch){
 async function request(path,{token,body}={}){
  const r=await fetcher('https://api.mercadopago.com'+path,{method:body?'POST':'GET',redirect:'error',signal:AbortSignal.timeout(10000),headers:{accept:'application/json',...(token?{authorization:'Bearer '+token}:{}),...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
  const d=await r.json().catch(()=>null);if(!r.ok||!d){const e=Error('PROVIDER_UNAVAILABLE');e.providerUnauthorized=r.status===401||d?.error==='invalid_grant';throw e;}return d;
 }
 return {exchange:(config,code,verifier)=>request('/oauth/token',{body:{client_id:config.clientId,client_secret:config.clientSecret,grant_type:'authorization_code',code,redirect_uri:config.redirect,code_verifier:verifier}}),
  refresh:(config,token)=>request('/oauth/token',{body:{client_id:config.clientId,client_secret:config.clientSecret,grant_type:'refresh_token',refresh_token:token}}),
  identity:token=>request('/users/me',{token})};
}
export function validatedTestTokens(tokens,identity,config){
 const uid=String(identity?.id||'');
 if(!/^\d{1,20}$/.test(uid)||String(tokens?.user_id)!==uid||!config.testUsers.includes(uid)||!Array.isArray(identity.tags)||!identity.tags.includes('test_user')||
  typeof tokens.access_token!=='string'||!tokens.access_token||typeof tokens.refresh_token!=='string'||!tokens.refresh_token||
  !Number.isInteger(tokens.expires_in)||tokens.expires_in<60||tokens.expires_in>366*86400)throw Error('TEST_IDENTITY_REQUIRED');
 return {uid,access:tokens.access_token,refresh:tokens.refresh_token,expiresIn:tokens.expires_in};
}
