import test from 'node:test';
import assert from 'node:assert/strict';
import {paymentConfiguration,seal,unseal,authorization,mercadoPagoProvider,validatedTestTokens,STAGING_PROJECT,CALLBACK_PATH} from '../src/marketplace/mp-security.js';
const env={RAILWAY_PROJECT_ID:STAGING_PROJECT,MARKETPLACE_MP_OAUTH_ENABLED:'true',MARKETPLACE_MP_CLIENT_ID:'12345',MARKETPLACE_MP_CLIENT_SECRET:'synthetic-app-secret',MARKETPLACE_MP_ENCRYPTION_KEY:'ab'.repeat(32),MARKETPLACE_MP_TEST_USER_IDS:'123,456',MARKETPLACE_MP_REDIRECT_URI:'https://aqualife-os-production-a81a.up.railway.app'+CALLBACK_PATH};
test('MP configuration fails closed outside staging, with missing secrets, malformed IDs or unsafe redirects',()=>{
 assert.ok(paymentConfiguration(env));for(const key of Object.keys(env))assert.equal(paymentConfiguration({...env,[key]:''}),null,key);
 for(const changes of [{RAILWAY_PROJECT_ID:'5b0e93d9-9212-46ad-be57-90e4106a5452'},{MARKETPLACE_MP_OAUTH_ENABLED:'false'},{MARKETPLACE_MP_REDIRECT_URI:'https://evil.invalid'+CALLBACK_PATH},{MARKETPLACE_MP_REDIRECT_URI:env.MARKETPLACE_MP_REDIRECT_URI+'?return=https://evil.invalid'},{MARKETPLACE_MP_TEST_USER_IDS:'123,abc'},{MARKETPLACE_MP_ENCRYPTION_KEY:'not-a-key'}])assert.equal(paymentConfiguration({...env,...changes}),null);
});
test('encrypted tokens are randomized and bound to seller/purpose; tampering and wrong keys fail',()=>{
 const key=env.MARKETPLACE_MP_ENCRYPTION_KEY,a=seal('synthetic-token',key,'access:seller-a'),b=seal('synthetic-token',key,'access:seller-a');assert.notEqual(a,b);assert.ok(!a.includes('synthetic-token'));assert.equal(unseal(a,key,'access:seller-a'),'synthetic-token');
 assert.throws(()=>unseal(a,key,'access:seller-b'));assert.throws(()=>unseal(a,key,'refresh:seller-a'));assert.throws(()=>unseal(a,'cd'.repeat(32),'access:seller-a'));
 const parts=a.split('.');parts[2]=(parts[2][0]==='A'?'B':'A')+parts[2].slice(1);assert.throws(()=>unseal(parts.join('.'),key,'access:seller-a'));assert.throws(()=>seal('token','short','access:a'));
});
test('authorization uses HTTPS provider, state and PKCE without exposing client secret',()=>{
 const url=new URL(authorization(paymentConfiguration(env),'synthetic-state','a'.repeat(64)));assert.equal(url.origin,'https://auth.mercadopago.com.br');assert.equal(url.searchParams.get('code_challenge_method'),'S256');assert.equal(url.searchParams.get('state'),'synthetic-state');assert.equal(url.searchParams.get('code_challenge').length,43);assert.ok(!url.href.includes(env.MARKETPLACE_MP_CLIENT_SECRET));
});
test('provider adapter restricts endpoints, keeps secrets out of URLs and redacts provider errors',async()=>{
 const calls=[],provider=mercadoPagoProvider(async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>({id:123})};}),c=paymentConfiguration(env);
 await provider.exchange(c,'synthetic-code','v'.repeat(64));await provider.refresh(c,'synthetic-refresh');await provider.identity('synthetic-access');
 assert.deepEqual(calls.map(c=>c.url),['https://api.mercadopago.com/oauth/token','https://api.mercadopago.com/oauth/token','https://api.mercadopago.com/users/me']);assert.equal(calls[2].options.headers.authorization,'Bearer synthetic-access');assert.ok(calls.every(c=>c.options.redirect==='error'&&c.options.signal));
 const bad=mercadoPagoProvider(async()=>({ok:false,status:400,json:async()=>({error:'invalid_grant',error_description:'SECRET-MUST-NOT-LEAK'})}));await assert.rejects(bad.refresh(c,'test'),e=>e.providerUnauthorized===true&&!e.message.includes('SECRET'));
});
test('only allowlisted test-user identity with matching token owner can connect',()=>{
 const c=paymentConfiguration(env),t={access_token:'test-access',refresh_token:'test-refresh',expires_in:3600,user_id:123},i={id:123,tags:['test_user']};assert.equal(validatedTestTokens(t,i,c).uid,'123');
 for(const [tokens,identity] of [[t,{...i,tags:[]}],[t,{...i,id:456}],[{...t,user_id:789},{id:789,tags:['test_user']}],[{...t,expires_in:0},i],[{...t,refresh_token:''},i]])assert.throws(()=>validatedTestTokens(tokens,identity,c));
});
