import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { backfillLegacy, legacySnapshot } from '../src/marketplace/legacy-backfill.js';

test('PostgreSQL backfill preserves historical prices, duplicates, missing variants and source rows atomically', { skip: !process.env.PG_TEST_URL }, async () => {
 const target = new URL(process.env.PG_TEST_URL);
 assert.ok(['localhost','127.0.0.1'].includes(target.hostname) || process.env.RAILWAY_PROJECT_ID === 'f0a54aac-7782-432e-9339-77a261e2c4c8', 'Integration test refuses non-test databases');
 const db = new pg.Client({ connectionString: process.env.PG_TEST_URL });
 await db.connect();
 try {
  await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
  const schema = `test_${randomUUID().replaceAll('-','')}`;
  await db.query(`CREATE SCHEMA ${schema}; SET LOCAL search_path TO ${schema},public`);
  await db.query(`CREATE TABLE app_user(id uuid PRIMARY KEY);
   CREATE TABLE loja_produto(id uuid PRIMARY KEY,nome text NOT NULL,marca text,modelo text);
   CREATE TABLE loja_variacao(id uuid PRIMARY KEY,produto_id uuid,sku text,preco_cents int,preco_promo_cents int,estoque int,ativo bool);
   CREATE TABLE loja_pedido(id uuid PRIMARY KEY,status text,status_pagamento text,subtotal_cents int,frete_cents int,desconto_cents int,total_cents int,criado_em timestamptz);
   CREATE TABLE loja_pedido_item(id uuid PRIMARY KEY,pedido_id uuid,variacao_id uuid,produto_id uuid,produto_nome text,variacao_nome text,preco_cents int,qty int,subtotal_cents int,custo_unit_cents int);
   CREATE TABLE estoque_mov(id uuid PRIMARY KEY,variacao_id uuid,tipo text,qty int,custo_unit_cents int,saldo_after int,ref_tipo text,ref_id text,criado_em timestamptz);`);
  for (const file of ['0001_foundation.sql','0002_legacy_archive.sql']) {
   const sql = await readFile(new URL(`../migrations/marketplace/${file}`,import.meta.url),'utf8');
   const transactional = sql.replace(/^BEGIN;\s*$/gm,'').replace(/^COMMIT;\s*$/gm,'');
   await db.query(transactional); await db.query(transactional);
  }
  const [product,a,b,order,item,missingItem,movementA,movementB] = Array.from({length:8},randomUUID);
  await db.query('INSERT INTO loja_produto VALUES($1,$2,NULL,NULL)',[product,'Synthetic Legacy']);
  await db.query('INSERT INTO loja_variacao VALUES($1,$3,$4,1000,800,3,true),($2,$3,$4,1200,NULL,2,false)',[a,b,product,'DUPLICATE']);
  await db.query("INSERT INTO loja_pedido VALUES($1,'pago','approved',1100,100,50,1150,now())",[order]);
  await db.query("INSERT INTO loja_pedido_item VALUES($1,$3,$4,$5,'Historical name',NULL,600,1,600,300),($2,$3,NULL,NULL,'Deleted historical product',NULL,500,1,500,NULL)",[item,missingItem,order,a,product]);
  await db.query("INSERT INTO estoque_mov VALUES($1,$3,'inicial',3,300,3,NULL,NULL,now()),($2,$4,'inicial',2,500,2,NULL,NULL,now())",[movementA,movementB,a,b]);
  const before = await legacySnapshot(db);
  const identity = { legalName:'Synthetic Legacy Company',tradeName:'Synthetic Legacy Shop' };
  const result = await backfillLegacy(db,identity);
  assert.equal(result.alreadyImported,false);
  assert.deepEqual(result.counts,{products:1,variations:2,orders:1,items:2,movements:2});
  const repeat = await backfillLegacy(db,identity); assert.equal(repeat.alreadyImported,true); assert.equal(repeat.sellerId,result.sellerId);
  assert.equal((await legacySnapshot(db)).fingerprint,before.fingerprint);
  const seller = (await db.query('SELECT status,is_platform_owned FROM marketplace_seller WHERE id=$1',[result.sellerId])).rows[0];
  assert.equal(seller.status,'pending'); assert.equal(seller.is_platform_owned,true);
  assert.equal((await db.query('SELECT count(*)::int n FROM marketplace_offer WHERE status<>\'draft\'')).rows[0].n,0);
  assert.equal((await db.query('SELECT count(DISTINCT seller_sku)::int n FROM marketplace_offer')).rows[0].n,2);
  assert.equal((await db.query("SELECT count(*)::int n FROM marketplace_legacy_offer WHERE source_sku='DUPLICATE'")).rows[0].n,2);
  assert.equal((await db.query('SELECT price_cents::int p FROM marketplace_offer WHERE legacy_variation_id=$1',[a])).rows[0].p,800);
  assert.equal((await db.query("SELECT (commercial_snapshot->>'preco_cents')::int p FROM marketplace_legacy_order_item WHERE legacy_item_id=$1",[item])).rows[0].p,600);
  assert.equal((await db.query('SELECT count(*)::int n FROM marketplace_legacy_order_item WHERE offer_id IS NULL')).rows[0].n,1);
  assert.equal((await db.query('SELECT count(*)::int n FROM marketplace_payment')).rows[0].n,0);
  assert.equal((await db.query('SELECT count(*)::int n FROM marketplace_order')).rows[0].n,0);
  await db.query("UPDATE loja_produto SET nome='Changed after snapshot'");
  await assert.rejects(backfillLegacy(db,identity),/LEGACY_SOURCE_CHANGED_SINCE_IMPORT/);
 } finally { await db.query('ROLLBACK'); await db.end(); }
});
