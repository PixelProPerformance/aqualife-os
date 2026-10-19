import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source=readFileSync(new URL('../src/calendario.js',import.meta.url),'utf8');
test('cliente recebe apenas eventos da própria organização e utilizador',()=>{
 assert.match(source,/a\.user_id=\$1 AND a\.organization_id=\$2/);
});
test('pedidos de troca requerem sete dias',()=>{
 assert.match(source,/inicio >= NOW\(\)\+INTERVAL '7 days'/);
});
test('pacotes consomem apenas visitas realizadas com laudo',()=>{
 assert.match(source,/a\.estado='realizada' AND a\.leitura_id IS NOT NULL/);
});
test('confirmar pacote exige pagamento em dia',()=>{
 assert.match(source,/p\?\.status_pagamento!=='em_dia'/);
});
test('visita realizada exige laudo da organização',()=>{
 assert.match(source,/SELECT id FROM reading WHERE id=\$1 AND organization_id=\$2/);
});
test('somente administração cria pré-agendamentos e envia lembretes',()=>{
 assert.match(source,/app\.post\('\/api\/admin\/manutencao\/agenda',\.\.\.admin/);
 assert.match(source,/app\.post\('\/api\/admin\/manutencao\/agenda\/:id\/lembrete',\.\.\.admin/);
});
