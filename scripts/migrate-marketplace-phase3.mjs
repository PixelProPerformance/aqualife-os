import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import pg from 'pg';
import {legacySnapshot} from '../src/marketplace/legacy-backfill.js';
const staging=process.env.RAILWAY_PROJECT_ID==='f0a54aac-7782-432e-9339-77a261e2c4c8';
const production=process.env.RAILWAY_PROJECT_ID==='5b0e93d9-9212-46ad-be57-90e4106a5452';
const apply=process.argv.includes('--apply');let db;
try{
 assert.ok(staging||production,'PROJECT_GUARD');const evidence=JSON.parse(process.env.MARKETPLACE_RELEASE_EVIDENCE||'{}');
 if(apply){assert.match(evidence.backup_sha256||'',/^[a-f0-9]{64}$/);assert.equal(evidence.restored,true);const age=Date.now()-Date.parse(evidence.backup_at);assert.ok(age>=0&&age<6*3600000,'RECENT_BACKUP_REQUIRED');
  if(production){assert.equal(evidence.ci_pass,true);assert.equal(evidence.staging_pass,true);assert.equal(evidence.commerce_enabled,false);assert.match(evidence.commit||'',/^[a-f0-9]{40}$/);assert.ok(evidence.staging_deployment);}
 }
 db=new pg.Client({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false},options:'-c lock_timeout=5000 -c statement_timeout=30000'});await db.connect();
 assert.equal((await db.query('SELECT current_database() AS name')).rows[0].name,staging?'aqualife_marketplace_staging':'railway');
 const sql=(await readFile(new URL('../migrations/marketplace/0004_catalog.sql',import.meta.url),'utf8')).replace(/^BEGIN;\s*$/gm,'').replace(/^COMMIT;\s*$/gm,'');
 await db.query('BEGIN');await db.query("SELECT pg_advisory_xact_lock(hashtext('marketplace-phase3-migration'))");const before=await legacySnapshot(db);
 await db.query(sql);await db.query(sql);assert.equal((await legacySnapshot(db)).fingerprint,before.fingerprint);
 const names=['marketplace_catalog_asset','marketplace_catalog_submission','marketplace_catalog_detail','marketplace_offer_detail','marketplace_inventory_movement'];
 assert.equal((await db.query("SELECT count(*)::int n FROM information_schema.tables WHERE table_schema='public' AND table_name=ANY($1::text[])",[names])).rows[0].n,5);
 await db.query(apply?'COMMIT':'ROLLBACK');console.log(JSON.stringify({result:'PASS',mode:apply?'APPLIED':'DRY_RUN_ROLLED_BACK',migration:'0004_marketplace_catalog',legacyDataUnchanged:true,idempotenceVerified:true,commerce_enabled:false,migration_sha256:createHash('sha256').update(sql).digest('hex')}));
}catch(e){if(db)await db.query('ROLLBACK').catch(()=>{});console.error(JSON.stringify({result:'FAIL',code:e.code||e.name,details_redacted:true}));process.exitCode=1;}finally{if(db)await db.end();}
