import test from 'node:test';
import assert from 'node:assert/strict';
import { validateLegacy } from '../src/marketplace/legacy-backfill.js';
const fixture = () => ({ products:[{id:'p'}], variations:[{id:'v',produto_id:'p',preco_cents:100,estoque:2}], orders:[{id:'o',subtotal_cents:200,frete_cents:20,desconto_cents:10,total_cents:210}], items:[{pedido_id:'o',qty:2,preco_cents:100,subtotal_cents:200}], movements:[{variacao_id:'v',qty:2}] });
test('legacy reconciliation preserves discounts and stock ledger', () => assert.deepEqual(validateLegacy(fixture()), []));
test('legacy reconciliation refuses inconsistent amounts and stock', () => {
 const data = fixture(); data.orders[0].total_cents = 220; data.variations[0].estoque = 3;
 assert.deepEqual(validateLegacy(data), ['ORDER_TOTAL_MISMATCH','INVENTORY_LEDGER_MISMATCH']);
});
test('legacy reconciliation refuses orphan resources and unsafe quantities', () => {
 const data = fixture(); data.variations[0].produto_id = 'missing'; data.items[0].qty = -1; data.movements[0].variacao_id = 'missing';
 const issues = validateLegacy(data);
 assert.ok(issues.includes('ORPHAN_VARIATION')); assert.ok(issues.includes('INVALID_ORDER_ITEM')); assert.ok(issues.includes('ORPHAN_STOCK_MOVEMENT'));
});
