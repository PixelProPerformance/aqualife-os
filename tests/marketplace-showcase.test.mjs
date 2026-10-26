import test from 'node:test';
import assert from 'node:assert/strict';
import {attributesValid,conditionsValid} from '../src/marketplace/showcase-validation.js';
test('technical attributes reject nested objects, excess data and prototype keys',()=>{
 assert.deepEqual({...attributesValid({Volume:'100 litros',Potência:'20 W'})},{Volume:'100 litros',Potência:'20 W'});
 for(const value of [null,[],{x:1},{x:{y:'z'}},JSON.parse('{"__proto__":"x"}'),Object.fromEntries(Array.from({length:21},(_,i)=>[i,'v']))])assert.equal(attributesValid(value),null);
});
test('offer conditions require bounded integer preparation time and actual warranty text',()=>{
 const p={warranty:'Garantia do fabricante conforme documentação.',conditions:'Produto novo; consulta sem venda.',handling_days:0};assert.ok(conditionsValid(p));
 for(const handling_days of [-1,61,1.5,'2',null])assert.equal(conditionsValid({...p,handling_days}),null);
 assert.equal(conditionsValid({...p,warranty:''}),null);
});
