import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
assert.equal(process.env.RAILWAY_PROJECT_ID,'f0a54aac-7782-432e-9339-77a261e2c4c8');
async function node(args){const code=await new Promise((resolve,reject)=>{const p=spawn(process.execPath,args,{stdio:'inherit',env:process.env});p.on('error',reject);p.on('exit',resolve);});assert.equal(code,0,args.join(' '));}
try{
 await node(['--test','--test-concurrency=1','tests/marketplace-onboarding.integration.test.mjs']);
 // Wait only for the staging app's real deployment; never treat build status as readiness.
 let ready=false;
 for(let i=0;i<180;i++){
  const r=await fetch('https://aqualife-os-production-a81a.up.railway.app/lojista.html',{signal:AbortSignal.timeout(15000)}).catch(()=>null);
  if(r?.status===200&&(await r.text()).includes('data-marketplace="seller"')){
   const api=await fetch('https://aqualife-os-production-a81a.up.railway.app/api/marketplace/my-sellers',{signal:AbortSignal.timeout(15000)}).catch(()=>null);
   if(api?.status===401){ready=true;break;}
  }
  await new Promise(r=>setTimeout(r,5000));
 }
 assert.ok(ready,'STAGING_APP_NOT_READY');
 await node(['scripts/validate-marketplace-phase2-staging.mjs']);
 await node(['scripts/validate-staging.mjs']);
 if(process.env.QA_PASSWORD)await node(['scripts/visual-marketplace-phase2.mjs']);
 console.log(JSON.stringify({result:'PASS',scope:'PHASE2_STAGING_SUITE',legacyRegression:true}));
}catch(e){console.error(JSON.stringify({result:'FAIL',scope:'PHASE2_STAGING_SUITE',code:e.code||e.name}));process.exitCode=1;}
