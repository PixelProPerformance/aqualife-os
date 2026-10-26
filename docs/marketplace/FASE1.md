# Aqualife Marketplace — Fase 1 (fundação, não ativada)

## Escopo
Fundação aditiva: o checkout, catálogo, pedidos e livro-razão legados continuam a ser a fonte ativa. O lançamento aplica migrations controladas e não ativa uma vitrine multivendedor.
A migration aditiva 0001 cria entidades de seller, associações de conta, endereços, settings, catálogo, ofertas, estoque por oferta, pedidos/subpedidos, pagamento, comissão, envio, fiscal e log.

## Dependências e limites
- Tabelas existentes confirmadas no código: app_user, loja_produto, loja_variacao, loja_pedido, loja_pedido_item, estoque_mov.
- NÃO executar a migração sem restaurar e verificar um backup do esquema real numa base isolada.
- O backfill é operacional e explícito, sem execução no boot. `scripts/backfill-legacy.mjs` reconcilia os dados antes da carga e exige evidência de backup recuperado para produção.
- O módulo de autorização é preparado para uso por novas rotas; não concede acesso por confiar apenas no role global.
- Sem endpoints de vendedor, integração de pagamentos ou alteração da vitrine nesta fase.
- O modelo de autorização exige seller_id na rota e associação ativa (owner/staff) de uma loja aprovada.
- Validar o princípio da minimização de dados e proteção de CNPJ/endereços; a verificação cadastral acontecerá em fase posterior.
- Confirmar que os índices únicos por SKU não bloqueiam variantes legítimas do mesmo vendedor antes de homologar.

## Implantação controlada
1. Confirmar ambiente staging separado, backup recuperável e inventário completo do esquema atual.
2. Rodar migrations legadas necessárias no staging e verificar existência das tabelas dependentes.
3. Aplicar migrations/marketplace/0001_foundation.sql com controlo operacional de versão.
4. Reaplicar apenas em staging e confirmar que não duplica dados nem objetos.
5. Executar testes de integração com PostgreSQL real e contas de lojas A/B; testar owner/staff, inativos, suspensos e requisições cruzadas.
6. Verificar continuidade de loja, Care, Academy, Aquabook e agendamentos.
7. Fazer snapshot do schema, analisar índices, contagens e dados pré-existentes.
8. Merge e produção apenas após aprovação expressa.

## Rollback
As tabelas são aditivas; desativar qualquer futura feature flag e reverter o código não requer apagar essas tabelas. Não executar DROP em produção. Para uma falha no banco, usar backup/restauro ensaiado e preservar transações posteriores.

## Testes
`node --test tests/marketplace-authorization.test.mjs`.
Estes testes exercitam a autorização com query simulada; não substituem testes end-to-end SQL com duas lojas.

## Critérios de conclusão
- CI verde e testes PostgreSQL com duas lojas.
- Auditoria de dados legados real e backfill não destrutivo controlado.
- Homologação isolada e validação de reversão.
- Auditoria de privilégios mínimos do papel de acesso ao banco.

O procedimento atualizado e os limites da fundação estão em [OPERACAO-FASE1.md](OPERACAO-FASE1.md).
