import test from 'node:test';
import assert from 'node:assert/strict';
import {produtoValido,ofertaValida,gtinValido} from '../src/marketplace/catalog-validation.js';
test('catalog validates product identity and GTIN checksum without accepting truncated data',()=>{
 assert.equal(gtinValido('4006381333931'),true);for(const s of ['4006381333932','00000000','abc','123456789'])assert.equal(gtinValido(s),false);
 const p={title:'Ração para peixes',description:'Descrição suficiente do produto.',category:'Alimentação',brand:'Marca',model:'100g',gtin:'4006381333931'};assert.ok(produtoValido(p));
 for(const patch of [{title:'a'},{description:'curto'},{gtin:'4006381333932'},{category:'x'.repeat(81)},{title:'x'.repeat(181)}])assert.equal(produtoValido({...p,...patch}),null);
});
test('offers require integer cent prices and bounded SKU, never coercing money',()=>{
 const p={seller_sku:'SKU-1',price_cents:1990,variant_label:'100g'};assert.ok(ofertaValida(p));
 for(const patch of [{price_cents:0},{price_cents:1.5},{price_cents:'1990'},{price_cents:100000001},{seller_sku:''},{seller_sku:'a'.repeat(101)}])assert.equal(ofertaValida({...p,...patch}),null);
});
