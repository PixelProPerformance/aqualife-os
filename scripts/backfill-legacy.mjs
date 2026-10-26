import pg from 'pg';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { backfillLegacy, legacySnapshot } from '../src/marketplace/legacy-backfill.js';

const project = process.env.RAILWAY_PROJECT_ID;
const staging = project === 'f0a54aac-7782-432e-9339-77a261e2c4c8';
const production = project === '5b0e93d9-9212-46ad-be57-90e4106a5452';
assert.ok(staging || production, 'Project guard');
const apply = process.argv.includes('--apply');
if (production) {
 const evidence = JSON.parse(process.env.MARKETPLACE_RELEASE_EVIDENCE || '{}');
 assert.ok(evidence.fullProductionRestoreVerified === true && evidence.regressionsApproved === true && /^[a-f0-9]{64}$/.test(evidence.backupSha256 || '') && Date.now() - Date.parse(evidence.backupCreatedAt) < 24*3600*1000 && Date.parse(evidence.backupCreatedAt) <= Date.now(), 'Verified recent production backup and staging regression evidence required');
}
const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl:{ rejectUnauthorized:false }, connectionTimeoutMillis:10000 });
try {
 await db.connect();
 const database = (await db.query('SELECT current_database() name')).rows[0].name;
 assert.equal(database, staging ? 'aqualife_marketplace_staging' : process.env.MARKETPLACE_EXPECTED_DATABASE);
 await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
 await db.query("SET LOCAL lock_timeout='5s'");
 await db.query("SET LOCAL statement_timeout='60s'");
 for (const file of ['0001_foundation.sql','0002_legacy_archive.sql']) {
  const sql = await readFile(new URL(`../migrations/marketplace/${file}`,import.meta.url),'utf8');
  await db.query(sql.replace(/^BEGIN;\s*$/gm,'').replace(/^COMMIT;\s*$/gm,''));
 }
 let identity;
 if (staging) identity = { legalName:'SYNTHETIC Legacy Company',tradeName:'SYNTHETIC Aqualife Legacy' };
 else {
  const row = (await db.query("SELECT valor FROM integracao_config WHERE chave='nfe_config'")).rows[0];
  const emit = JSON.parse(row?.valor || '{}').emit;
  // Phase 1 archives the known platform brand. Legal onboarding remains pending;
  // it cannot approve the seller, assign owners or activate commercial offers.
  identity = emit?.razao?.trim() && /^\d{14}$/.test(emit?.cnpj || '')
   ? { legalName:emit.razao,tradeName:emit.fantasia || emit.razao,cnpj:emit.cnpj }
   : { legalName:'Aqualife Aquarismo',tradeName:'Aqualife Aquarismo' };
 }
 const before = await legacySnapshot(db);
 const result = await backfillLegacy(db,identity);
 const repeated = await backfillLegacy(db,identity);
 assert.equal(repeated.alreadyImported,true);
 assert.equal((await legacySnapshot(db)).fingerprint,before.fingerprint);
 const counts = (await db.query(`SELECT
  (SELECT count(*) FROM marketplace_legacy_offer WHERE seller_id=$1)::int variations,
  (SELECT count(*) FROM marketplace_legacy_order WHERE seller_id=$1)::int orders,
  (SELECT count(*) FROM marketplace_legacy_order_item WHERE seller_id=$1)::int items,
  (SELECT count(*) FROM marketplace_legacy_stock_movement WHERE seller_id=$1)::int movements`,[result.sellerId])).rows[0];
 for (const [key,value] of Object.entries(counts)) assert.equal(value,result.counts[key]);
 const seller = (await db.query('SELECT s.status,ss.accepting_orders FROM marketplace_seller s JOIN marketplace_seller_settings ss ON ss.seller_id=s.id WHERE s.id=$1',[result.sellerId])).rows[0];
 assert.equal(seller.status,'pending'); assert.equal(seller.accepting_orders,false);
 await db.query(apply ? 'COMMIT' : 'ROLLBACK');
 console.log(JSON.stringify({ result:'PASS',database,mode:apply?'APPLIED':'DRY_RUN_ROLLED_BACK',counts:result.counts,sourceFingerprint:result.fingerprint,legacyDataUnchanged:true,idempotenceVerified:true,publicMarketplaceActivated:false }));
} catch (error) {
 try { await db.query('ROLLBACK'); } catch {}
 console.error(JSON.stringify({ result:'FAIL',code:error.code || error.name,guard:error.name==='AssertionError' ? error.message.split('\n')[0] : undefined,detailsRedacted:true }));
 process.exitCode=1;
} finally { await db.end(); }
