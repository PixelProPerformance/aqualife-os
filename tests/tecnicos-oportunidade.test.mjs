import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const backend=readFileSync(new URL('../src/servicos.js',import.meta.url),'utf8');
const frontend=readFileSync(new URL('../public/servicos.html',import.meta.url),'utf8');
test('o preço fica visível antes do aceite',()=>{assert.match(frontend,/Valor desta oportunidade/);assert.match(frontend,/brl\(o.valor_cents\?\?0\)/)});
test('relatório do técnico não determina conclusão',()=>{assert.doesNotMatch(frontend,/relResolvido/);assert.match(backend,/const resolvido = null/);assert.match(backend,/app.post\("\/api\/admin\/oportunidades\/:id\/finalizar", exigeLogin, exigeAdmin/)});
test('valor por serviço vem da oportunidade',()=>{assert.match(backend,/tipo === "servico"\) return \{ valor: Number\(op.valor_cents \?\? 0\)/)});
test('retorno exige definição de valor pelo admin antes da publicação',()=>{assert.match(backend,/false,true,\$4,\$5,'rascunho'/)});
