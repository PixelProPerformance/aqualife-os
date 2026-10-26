import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import pg from 'pg';
import {legacySnapshot} from '../src/marketplace/legacy-backfill.js';
const staging=process.env.RAILWAY_PROJECT_ID==='f0a54aac-7782-432e-9339-77a261e2c4c8';
const production=process.env.RAILWAY_PROJECT_ID==='5b0e93d9-9212-46ad-be57-90e4106a5452';
const apply=process.argv.includes('--apply');
let db;
try{
 assert.ok(staging||production,'PROJECT_GUARD');
 const evidence=JSON.parse(process.env.MARKETPLACE_RELEASE_EVIDENCE||'{}');
 if(apply){
  assert.match(evidence.backup_sha256||'',/^[a-f0-9]{64}$/);
  assert.equal(evidence.restored,true);
  assert.ok(Date.now()-Date.parse(evidence.backup_at)>=0&&Date.now()-Date.parse(evidence.backup_at)<6*3600000,'RECENT_BACKUP_REQUIRED');
  if(production){assert.equal(evidence.ci_pass,true);assert.equal(evidence.staging_pass,true);assert.match(evidence.commit||'',/^[a-f0-9]{40}$/);assert.ok(evidence.staging_deployment);}
 }
 db=new pg.Client({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}});await db.connect();
 assert.equal((await db.query('SELECT current_database() AS name')).rows[0].name,staging?'aqualife_marketplace_staging':'railway');
 const sql=(await readFile(new URL('../migrations/marketplace/0003_onboarding.sql',import.meta.url),'utf8')).replace(/^BEGIN;\s*$/gm,'').replace(/^COMMIT;\s*$/gm,'');
 await db.query('BEGIN');await db.query("SELECT pg_advisory_xact_lock(hashtext('marketplace-phase2-migration'))");
 const before=await legacySnapshot(db);
 await db.query(sql);await db.query(sql);
 assert.equal((await legacySnapshot(db)).fingerprint,before.fingerprint);
 const columns=(await db.query("SELECT column_name,data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='marketplace_seller_profile' ORDER BY ordinal_position")).rows;
 assert.equal(columns.length,11);
 await db.query(apply?'COMMIT':'ROLLBACK');
 console.log(JSON.stringify({result:'PASS',mode:apply?'APPLIED':'DRY_RUN_ROLLED_BACK',migration:'0003_marketplace_onboarding',legacyDataUnchanged:true,idempotenceVerified:true,migration_sha256:createHash('sha256').update(sql).digest('hex')}));
}catch(e){if(db)await db.query('ROLLBACK').catch(()=>{});console.error(JSON.stringify({result:'FAIL',code:e.code||e.name,details_redacted:true}));process.exitCode=1;}
finally{if(db)await db.end();}
