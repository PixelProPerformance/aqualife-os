import { createHash } from 'node:crypto';

const selections = {
 products: 'SELECT id,nome,marca,modelo FROM loja_produto ORDER BY id',
 variations: 'SELECT id,produto_id,sku,preco_cents,preco_promo_cents,estoque,ativo FROM loja_variacao ORDER BY id',
 orders: 'SELECT id,status,status_pagamento,subtotal_cents,frete_cents,desconto_cents,total_cents,criado_em FROM loja_pedido ORDER BY id',
 items: 'SELECT id,pedido_id,variacao_id,produto_id,produto_nome,variacao_nome,preco_cents,qty,subtotal_cents,custo_unit_cents FROM loja_pedido_item ORDER BY id',
 movements: 'SELECT id,variacao_id,tipo,qty,custo_unit_cents,saldo_after,ref_tipo,ref_id,criado_em FROM estoque_mov ORDER BY id',
};

export async function legacySnapshot(client) {
 const data = {};
 for (const [name, query] of Object.entries(selections)) data[name] = (await client.query(query)).rows;
 const fingerprint = createHash('sha256').update(JSON.stringify(data)).digest('hex');
 return { data, fingerprint, counts: Object.fromEntries(Object.entries(data).map(([name, rows]) => [name, rows.length])) };
}

export function validateLegacy(data) {
 const products = new Set(data.products.map(p => p.id)), variations = new Map(data.variations.map(v => [v.id,v]));
 const orders = new Map(data.orders.map(o => [o.id,o])), subtotals = new Map(), balances = new Map();
 const errors = new Set();
 for (const v of data.variations) {
  if (!products.has(v.produto_id)) errors.add('ORPHAN_VARIATION');
  if ([v.preco_cents,v.estoque,v.preco_promo_cents ?? 0].some(n => !Number.isSafeInteger(n) || n < 0)) errors.add('INVALID_VARIATION_VALUE');
 }
 for (const item of data.items) {
  if (!orders.has(item.pedido_id)) errors.add('ORPHAN_ORDER_ITEM');
  if (!Number.isSafeInteger(item.qty) || item.qty <= 0 || !Number.isSafeInteger(item.preco_cents) || item.preco_cents < 0 || item.subtotal_cents !== item.preco_cents * item.qty) errors.add('INVALID_ORDER_ITEM');
  subtotals.set(item.pedido_id, (subtotals.get(item.pedido_id) || 0) + item.subtotal_cents);
 }
 for (const o of data.orders) {
  if ([o.subtotal_cents,o.frete_cents,o.desconto_cents,o.total_cents].some(n => !Number.isSafeInteger(n) || n < 0) || o.total_cents !== o.subtotal_cents + o.frete_cents - o.desconto_cents || o.subtotal_cents !== (subtotals.get(o.id) || 0)) errors.add('ORDER_TOTAL_MISMATCH');
 }
 for (const m of data.movements) {
  if (!variations.has(m.variacao_id)) errors.add('ORPHAN_STOCK_MOVEMENT');
  balances.set(m.variacao_id, (balances.get(m.variacao_id) || 0) + m.qty);
 }
 for (const v of data.variations) if (v.estoque !== (balances.get(v.id) || 0)) errors.add('INVENTORY_LEDGER_MISMATCH');
 return [...errors];
}

// Caller owns a REPEATABLE READ transaction. No legacy table is ever written.
export async function backfillLegacy(client, identity) {
 const acquired = (await client.query("SELECT pg_try_advisory_xact_lock(hashtext('aqualife_legacy_backfill')) AS ok")).rows[0].ok;
 if (!acquired) throw new Error('BACKFILL_ALREADY_RUNNING');
 if (!identity?.legalName?.trim() || !identity?.tradeName?.trim() || (identity.cnpj && !/^\d{14}$/.test(identity.cnpj))) throw new Error('CONFIRMED_LEGACY_IDENTITY_REQUIRED');
 const snapshot = await legacySnapshot(client), issues = validateLegacy(snapshot.data);
 if (issues.length) throw new Error(issues.join(','));
 const previous = (await client.query("SELECT seller_id,source_fingerprint,counts FROM marketplace_legacy_import WHERE source_key='aqualife_legacy'")).rows[0];
 if (previous) {
  if (previous.source_fingerprint !== snapshot.fingerprint) throw new Error('LEGACY_SOURCE_CHANGED_SINCE_IMPORT');
  return { sellerId: previous.seller_id, counts: previous.counts, fingerprint: snapshot.fingerprint, alreadyImported: true };
 }
 const sellerId = (await client.query("INSERT INTO marketplace_seller(legal_name,trade_name,cnpj,status,is_platform_owned) VALUES($1,$2,$3,'pending',true) RETURNING id", [identity.legalName.trim(),identity.tradeName.trim(),identity.cnpj || null])).rows[0].id;
 await client.query('INSERT INTO marketplace_seller_settings(seller_id,accepting_orders) VALUES($1,false)', [sellerId]);
 const catalog = new Map(), offers = new Map();
 for (const p of snapshot.data.products) {
  const result = await client.query('INSERT INTO marketplace_catalog_product(legacy_product_id,title,brand,model) VALUES($1,$2,$3,$4) RETURNING id', [p.id,p.nome,p.marca,p.modelo]);
  catalog.set(p.id,result.rows[0].id);
 }
 for (const v of snapshot.data.variations) {
  const price = v.preco_promo_cents > 0 ? v.preco_promo_cents : v.preco_cents;
  const offer = (await client.query("INSERT INTO marketplace_offer(seller_id,catalog_product_id,legacy_variation_id,seller_sku,price_cents,status) VALUES($1,$2,$3,$4,$5,'draft') RETURNING id", [sellerId,catalog.get(v.produto_id),v.id,`legacy:${v.id}`,price])).rows[0].id;
  offers.set(v.id,offer);
  await client.query('INSERT INTO marketplace_offer_inventory(offer_id,available_qty,reserved_qty) VALUES($1,$2,0)', [offer,v.estoque]);
  await client.query('INSERT INTO marketplace_legacy_offer(legacy_variation_id,offer_id,seller_id,source_sku,source_price_cents,source_stock,source_active) VALUES($1,$2,$3,$4,$5,$6,$7)', [v.id,offer,sellerId,v.sku,v.preco_cents,v.estoque,v.ativo]);
 }
 for (const o of snapshot.data.orders) await client.query('INSERT INTO marketplace_legacy_order(legacy_order_id,seller_id,commercial_snapshot) VALUES($1,$2,$3)', [o.id,sellerId,JSON.stringify(o)]);
 for (const i of snapshot.data.items) await client.query('INSERT INTO marketplace_legacy_order_item(legacy_item_id,legacy_order_id,seller_id,offer_id,commercial_snapshot) VALUES($1,$2,$3,$4,$5)', [i.id,i.pedido_id,sellerId,offers.get(i.variacao_id) || null,JSON.stringify(i)]);
 for (const m of snapshot.data.movements) await client.query('INSERT INTO marketplace_legacy_stock_movement(legacy_movement_id,seller_id,offer_id,movement_snapshot) VALUES($1,$2,$3,$4)', [m.id,sellerId,offers.get(m.variacao_id),JSON.stringify(m)]);
 await client.query("INSERT INTO marketplace_legacy_import(source_key,seller_id,source_fingerprint,counts) VALUES('aqualife_legacy',$1,$2,$3)", [sellerId,snapshot.fingerprint,JSON.stringify(snapshot.counts)]);
 await client.query("INSERT INTO marketplace_audit_log(seller_id,action,resource_type,resource_id,metadata) VALUES($1,'legacy_snapshot_import','seller',$1,$2)", [sellerId,JSON.stringify({ fingerprint: snapshot.fingerprint, counts: snapshot.counts, legacyRemainsAuthoritative: true })]);
 if ((await legacySnapshot(client)).fingerprint !== snapshot.fingerprint) throw new Error('LEGACY_DATA_CHANGED_DURING_IMPORT');
 return { sellerId, counts: snapshot.counts, fingerprint: snapshot.fingerprint, alreadyImported: false };
}
