import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
assert.equal(process.env.RAILWAY_PROJECT_ID,'f0a54aac-7782-432e-9339-77a261e2c4c8');
async function run(args){assert.equal(await new Promise((resolve,reject)=>{const p=spawn(process.execPath,args,{stdio:'inherit',env:process.env});p.on('error',reject);p.on('exit',resolve);}),0,args[0]);}
try{
 await run(['--test','--test-concurrency=1','tests/marketplace-mp-security.test.mjs','tests/marketplace-mp-oauth.integration.test.mjs']);
 await run(['scripts/phase4-staging-suite.mjs']);
 console.log(JSON.stringify({result:'PASS',scope:'PHASE5_OAUTH_STAGING_BASE',external_provider_validated:false,payments_enabled:false,phase_complete:false}));
}catch(e){console.error(JSON.stringify({result:'FAIL',scope:'PHASE5_OAUTH_STAGING_BASE',code:e.code||e.name}));process.exitCode=1;}
