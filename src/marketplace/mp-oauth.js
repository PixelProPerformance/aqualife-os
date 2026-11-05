import {randomBytes} from 'node:crypto';
import {sellerIdValido} from './authorization.js';
import {paymentConfiguration,seal,unseal,digest,authorization,mercadoPagoProvider,CALLBACK_PATH} from './mp-security.js';
const fail=(status,message)=>{throw Object.assign(Error(message),{status});};
const blocked={commerce_enabled:false,payments_enabled:false,shipping_enabled:false,mode:'test',split_model:'1:1',phase_complete:false};
const cookieName='__Secure-aqualife-mp-oauth';
export function registrarMercadoPagoOAuth({app,query,withTransaction,exigeLogin,rateLimit=()=>true,configuration=()=>paymentConfiguration(),provider=mercadoPagoProvider()}){
 const headers=res=>res.set({'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'});
 const safe=fn=>async(req,res)=>{headers(res);try{await fn(req,res);}catch(e){if(e.status)return res.status(e.status).json({erro:e.message,...blocked});if(e.code==='23505')return res.status(409).json({erro:'Conta já vinculada a outra loja; verifique com a administração',...blocked});console.error('[marketplace/mp-oauth]',e.code||'unavailable');res.status(503).json({erro:'Conexão indisponível. Tente novamente sem enviar credenciais ao suporte.',...blocked});}};
 function config(){const c=configuration();if(!c)fail(409,'Homologação Mercado Pago ainda não configurada');return c;}
 async function scope(c,seller,user,owner=false,requireApproved=owner){
  if(!sellerIdValido(seller))fail(400,'Loja inválida');
  const s=(await c.query(`SELECT s.status,s.is_platform_owned,su.role FROM marketplace_seller s JOIN marketplace_seller_user su ON su.seller_id=s.id JOIN app_user u ON u.id=su.user_id
   WHERE s.id=$1 AND su.user_id=$2 AND su.active=true AND u.ativo=true FOR UPDATE OF s,su,u`,[seller,user])).rows[0];
  if(!s||(owner&&s.role!=='owner'))fail(403,'Acesso restrito ao proprietário da loja');
  if(requireApproved&&(s.status!=='approved'||s.is_platform_owned))fail(409,'Loja não habilitada para conectar conta');return s;
 }
 const throttle=req=>{if(!rateLimit('marketplace:mp-oauth:'+req.usuario.id,10,3600000))fail(429,'Muitas tentativas. Aguarde para tentar novamente.');};
 const audit=(c,seller,user,action)=>c.query("INSERT INTO marketplace_audit_log(seller_id,actor_user_id,action,resource_type,resource_id) VALUES($1,$2,$3,'mp_connection',$1)",[seller,user,action]);
 const route='/api/marketplace/sellers/:sellerId/payments/connection';
 app.get(route,exigeLogin,safe(async(req,res)=>{
  await withTransaction(c=>scope(c,req.params.sellerId,req.usuario.id));
  const c=configuration(),exists=(await query("SELECT to_regclass('marketplace_mp_connection') AS name")).rows[0]?.name;
  const row=exists?(await query('SELECT state,expires_at,updated_at FROM marketplace_mp_connection WHERE seller_id=$1',[req.params.sellerId])).rows[0]:null;
  res.json({configured:!!c&&!!exists,...(row||{state:c&&exists?'not_connected':'not_configured'}),...blocked});
 }));
 app.post(route+'/authorize',exigeLogin,safe(async(req,res)=>{
  throttle(req);const c=config(),state=randomBytes(32).toString('base64url'),browser=randomBytes(32).toString('base64url'),verifier=randomBytes(48).toString('base64url');
  await withTransaction(async db=>{await scope(db,req.params.sellerId,req.usuario.id,true);
   await db.query('UPDATE marketplace_mp_oauth_attempt SET consumed_at=COALESCE(consumed_at,now()),verifier_cipher=NULL,invalidated_at=now() WHERE seller_id=$1 AND invalidated_at IS NULL',[req.params.sellerId]);
   await db.query("INSERT INTO marketplace_mp_oauth_attempt(state_hash,seller_id,actor_user_id,browser_hash,verifier_cipher,expires_at) VALUES($1,$2,$3,$4,$5,now()+interval '10 minutes')",[digest(state),req.params.sellerId,req.usuario.id,digest(browser),seal(verifier,c.key,'oauth:'+digest(state))]);
   await audit(db,req.params.sellerId,req.usuario.id,'mp_oauth_started');
  });
  res.cookie(cookieName,browser,{httpOnly:true,secure:true,sameSite:'lax',path:CALLBACK_PATH,maxAge:600000});res.json({authorization_url:authorization(c,state,verifier),...blocked});
 }));
 app.get(CALLBACK_PATH,async(req,res)=>{
  headers(res);res.clearCookie(cookieName,{secure:true,httpOnly:true,sameSite:'lax',path:CALLBACK_PATH});
  const finish=result=>res.redirect(303,'/lojista.html?mp_connection='+result);
  try{
   const c=config(),state=req.query.state,browser=String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='))?.slice(cookieName.length+1);
   if(typeof state!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(state)||!browser||!/^[A-Za-z0-9_-]{43}$/.test(browser))return finish('invalid');
   // Commit consumption before provider calls. A failed/ambiguous exchange must start a new flow.
   const attempt=await withTransaction(async db=>{
    const row=(await db.query('SELECT * FROM marketplace_mp_oauth_attempt WHERE state_hash=$1 AND browser_hash=$2 AND consumed_at IS NULL AND invalidated_at IS NULL AND expires_at>now() FOR UPDATE',[digest(state),digest(browser)])).rows[0];if(!row)return null;
    await db.query('UPDATE marketplace_mp_oauth_attempt SET consumed_at=now(),verifier_cipher=NULL WHERE state_hash=$1',[digest(state)]);return row;
   });if(!attempt)return finish('invalid');
   if(req.query.error||typeof req.query.code!=='string'||req.query.code.length>2048||!req.query.code)return finish('denied');
   await withTransaction(async db=>{
    await scope(db,attempt.seller_id,attempt.actor_user_id,true);
    if((await db.query('SELECT invalidated_at FROM marketplace_mp_oauth_attempt WHERE state_hash=$1',[digest(state)])).rows[0]?.invalidated_at)fail(409,'Autorização cancelada');
    const tokens=await provider.exchange(c,req.query.code,unseal(attempt.verifier_cipher,c.key,'oauth:'+digest(state)));
    const {validatedTestTokens}=await import('./mp-security.js');const valid=validatedTestTokens(tokens,await provider.identity(tokens.access_token),c);
    const existing=(await db.query('SELECT provider_user_id FROM marketplace_mp_connection WHERE seller_id=$1 FOR UPDATE',[attempt.seller_id])).rows[0];
    if(existing&&existing.provider_user_id!==valid.uid)fail(409,'Use a mesma conta ou solicite revisão administrativa');
    await db.query(`INSERT INTO marketplace_mp_connection(seller_id,provider_user_id,state,access_cipher,refresh_cipher,expires_at,connected_by) VALUES($1,$2,'connected',$3,$4,now()+($5::int*interval '1 second'),$6)
     ON CONFLICT(seller_id) DO UPDATE SET state='connected',access_cipher=$3,refresh_cipher=$4,expires_at=now()+($5::int*interval '1 second'),connected_by=$6,revision=marketplace_mp_connection.revision+1,updated_at=now()`,[attempt.seller_id,valid.uid,seal(valid.access,c.key,'access:'+attempt.seller_id),seal(valid.refresh,c.key,'refresh:'+attempt.seller_id),valid.expiresIn,attempt.actor_user_id]);
    await audit(db,attempt.seller_id,attempt.actor_user_id,'mp_oauth_connected_test');
   });finish('connected');
  }catch(e){console.error('[marketplace/mp-callback]',e.code||'unavailable');finish('failed');}
 });
 app.post(route+'/refresh',exigeLogin,safe(async(req,res)=>{
  throttle(req);const c=config();let invalid=false;
  await withTransaction(async db=>{
   await scope(db,req.params.sellerId,req.usuario.id,true);const row=(await db.query("SELECT * FROM marketplace_mp_connection WHERE seller_id=$1 AND state='connected' FOR UPDATE",[req.params.sellerId])).rows[0];if(!row)fail(409,'Conecte novamente sua conta de teste');
   try{
    const tokens=await provider.refresh(c,unseal(row.refresh_cipher,c.key,'refresh:'+req.params.sellerId));
    const {validatedTestTokens}=await import('./mp-security.js');const valid=validatedTestTokens(tokens,await provider.identity(tokens.access_token),c);if(valid.uid!==row.provider_user_id)throw Error('IDENTITY_MISMATCH');
    await db.query("UPDATE marketplace_mp_connection SET access_cipher=$2,refresh_cipher=$3,expires_at=now()+($4::int*interval '1 second'),revision=revision+1,updated_at=now() WHERE seller_id=$1",[req.params.sellerId,seal(valid.access,c.key,'access:'+req.params.sellerId),seal(valid.refresh,c.key,'refresh:'+req.params.sellerId),valid.expiresIn]);
    await audit(db,req.params.sellerId,req.usuario.id,'mp_oauth_refreshed_test');
   }catch(e){if(!e.providerUnauthorized)throw e;invalid=true;await db.query("UPDATE marketplace_mp_connection SET state='reauthorization_required',access_cipher=NULL,refresh_cipher=NULL,revision=revision+1,updated_at=now() WHERE seller_id=$1",[req.params.sellerId]);await audit(db,req.params.sellerId,req.usuario.id,'mp_oauth_reauthorization_required');}
  });res.status(invalid?409:200).json({ok:!invalid,...(invalid?{erro:'Autorização revogada ou expirada; conecte novamente sua conta de teste'}:{}),...blocked});
 }));
 app.post(route+'/disconnect',exigeLogin,safe(async(req,res)=>{
  // Local disabling must remain possible if provider/configuration is unavailable.
  await withTransaction(async db=>{await scope(db,req.params.sellerId,req.usuario.id,true,false);
   await db.query("UPDATE marketplace_mp_connection SET state='disconnected',access_cipher=NULL,refresh_cipher=NULL,revision=revision+1,updated_at=now() WHERE seller_id=$1",[req.params.sellerId]);
   await db.query('UPDATE marketplace_mp_oauth_attempt SET consumed_at=COALESCE(consumed_at,now()),verifier_cipher=NULL,invalidated_at=now() WHERE seller_id=$1 AND invalidated_at IS NULL',[req.params.sellerId]);await audit(db,req.params.sellerId,req.usuario.id,'mp_oauth_disconnected_local');
  });res.json({ok:true,provider_revocation_verified:false,...blocked});
 }));
}
