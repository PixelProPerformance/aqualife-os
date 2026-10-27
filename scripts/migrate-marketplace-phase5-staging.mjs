import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import pg from 'pg';
import {legacySnapshot} from '../src/marketplace/legacy-backfill.js';
let db;
try{
 assert.equal(process.env.RAILWAY_PROJECT_ID,'f0a54aac-7782-432e-9339-77a261e2c4c8');
 const apply=process.argv.includes('--apply'),e=JSON.parse(process.env.MARKETPLACE_RELEASE_EVIDENCE||'{}');
 if(apply){assert.match(e.backup_sha256||'',/^[a-f0-9]{64}$/);assert.equal(e.restored,true);const age=Date.now()-Date.parse(e.backup_at);assert.ok(age>=0&&age<6*3600000);}
 db=new pg.Client({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false},options:'-c lock_timeout=5000 -c statement_timeout=30000'});await db.connect();assert.equal((await db.query('SELECT current_database() AS name')).rows[0].name,'aqualife_marketplace_staging');
 const sql=(await readFile(new URL('../migrations/marketplace/0007_payment_oauth.sql',import.meta.url),'utf8')).replace(/^BEGIN;\s*$/gm,'').replace(/^COMMIT;\s*$/gm,'');
 for(const mode of (apply?['REHEARSAL_ROLLED_BACK','APPLIED']:['DRY_RUN_ROLLED_BACK'])){
  await db.query('BEGIN');await db.query("SELECT pg_advisory_xact_lock(hashtext('marketplace-phase5-migration'))");const before=await legacySnapshot(db);
  await db.query(sql);await db.query(sql);assert.equal((await legacySnapshot(db)).fingerprint,before.fingerprint);
  assert.equal((await db.query("SELECT count(*)::int n FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('marketplace_mp_connection','marketplace_mp_oauth_attempt')")).rows[0].n,2);
  assert.equal((await db.query("SELECT count(*)::int n FROM marketplace_schema_migration WHERE version='0007_marketplace_payment_oauth'")).rows[0].n,1);
  await db.query(mode==='APPLIED'?'COMMIT':'ROLLBACK');console.log(JSON.stringify({result:'PASS',scope:'PHASE5_STAGING_OAUTH_MIGRATION',mode,legacyDataUnchanged:true,idempotenceVerified:true,commerce_enabled:false,phase_complete:false,migration_sha256:createHash('sha256').update(sql).digest('hex')}));
 }
}catch(e){if(db)await db.query('ROLLBACK').catch(()=>{});console.error(JSON.stringify({result:'FAIL',code:e.code||e.name,details_redacted:true}));process.exitCode=1;}finally{if(db)await db.end();}
