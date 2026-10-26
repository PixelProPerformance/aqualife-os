import pg from 'pg';

const staging = process.env.RAILWAY_PROJECT_ID === 'f0a54aac-7782-432e-9339-77a261e2c4c8';
const production = process.env.RAILWAY_PROJECT_ID === '5b0e93d9-9212-46ad-be57-90e4106a5452';
if (!staging && !production) throw new Error('Project not allowed');
const connectionString = staging ? process.env.DATABASE_URL : process.env.BACKUP_DATABASE_URL;
if (!connectionString) throw new Error('Exclusive read-only connection required');
const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000 });
const checks = {
  orphan_variations: 'SELECT count(*) n FROM loja_variacao v LEFT JOIN loja_produto p ON p.id=v.produto_id WHERE p.id IS NULL',
  invalid_variation_values: 'SELECT count(*) n FROM loja_variacao WHERE preco_cents<0 OR preco_promo_cents<0 OR estoque<0 OR custo_cents<0',
  duplicate_nonempty_skus: "SELECT count(*) n FROM (SELECT trim(sku) FROM loja_variacao WHERE nullif(trim(sku),'') IS NOT NULL GROUP BY trim(sku) HAVING count(*)>1) d",
  invalid_order_items: 'SELECT count(*) n FROM loja_pedido_item WHERE qty<=0 OR preco_cents<0 OR subtotal_cents<>preco_cents::bigint*qty',
  orphan_order_items: 'SELECT count(*) n FROM loja_pedido_item i LEFT JOIN loja_pedido p ON p.id=i.pedido_id WHERE p.id IS NULL',
  order_total_mismatches: 'SELECT count(*) n FROM loja_pedido WHERE subtotal_cents::bigint+frete_cents-desconto_cents<>total_cents',
  order_subtotal_mismatches: 'SELECT count(*) n FROM loja_pedido p LEFT JOIN (SELECT pedido_id,sum(subtotal_cents)::bigint subtotal FROM loja_pedido_item GROUP BY pedido_id) i ON i.pedido_id=p.id WHERE p.subtotal_cents<>coalesce(i.subtotal,0)',
  inventory_ledger_mismatches: 'SELECT count(*) n FROM loja_variacao v LEFT JOIN (SELECT variacao_id,sum(qty)::bigint saldo FROM estoque_mov GROUP BY variacao_id) m ON m.variacao_id=v.id WHERE v.estoque<>coalesce(m.saldo,0)',
  orphan_inventory_movements: 'SELECT count(*) n FROM estoque_mov m LEFT JOIN loja_variacao v ON v.id=m.variacao_id WHERE v.id IS NULL',
  historical_items_without_variation: 'SELECT count(*) n FROM loja_pedido_item WHERE variacao_id IS NULL',
};
try {
  await client.connect();
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  await client.query("SET LOCAL statement_timeout='60s'");
  await client.query("SET LOCAL lock_timeout='5s'");
  const database = (await client.query('SELECT current_database() name')).rows[0].name;
  if (staging && database !== 'aqualife_marketplace_staging') throw new Error('Wrong staging database');
  if (production) {
    const role = (await client.query('SELECT rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls FROM pg_roles WHERE rolname=current_user')).rows[0];
    if (Object.values(role).some(Boolean)) throw new Error('Privileged role refused');
  }
  const totals = (await client.query(`SELECT
    (SELECT count(*) FROM loja_produto)::text products,
    (SELECT count(*) FROM loja_variacao)::text variations,
    (SELECT count(*) FROM loja_pedido)::text orders,
    (SELECT count(*) FROM loja_pedido_item)::text order_items,
    (SELECT count(*) FROM estoque_mov)::text inventory_movements,
    (SELECT coalesce(sum(total_cents),0) FROM loja_pedido)::text order_total_cents,
    (SELECT coalesce(sum(estoque),0) FROM loja_variacao)::text stock_units`)).rows[0];
  const findings = {};
  for (const [name, query] of Object.entries(checks)) findings[name] = Number((await client.query(query)).rows[0].n);
  const configuration = (await client.query("SELECT valor FROM integracao_config WHERE chave='nfe_config'")).rows[0]?.valor;
  let identityAvailable = false;
  try { const emit = JSON.parse(configuration || '{}').emit; identityAvailable = Boolean(emit?.razao?.trim() && /^\d{14}$/.test(emit?.cnpj || '')); } catch {}
  console.log(JSON.stringify({ result: 'INSPECTED_ONLY', database, totals, findings, legacyFiscalIdentityAvailable: identityAvailable, backfillExecuted: false, productionLaunchApproved: false }));
} catch (error) {
  console.error(JSON.stringify({ result: 'FAIL', code: error.code || error.name, detailsRedacted: true }));
  process.exitCode = 1;
} finally {
  try { await client.query('ROLLBACK'); } catch {}
  await client.end();
}
