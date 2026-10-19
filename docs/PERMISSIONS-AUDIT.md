# Auditoria de permissões — 2026-10-19

## Escopo e limitações
Análise estática das rotas Express em `src/server.js`, `src/loja.js` e `src/servicos.js`. Não foram executados testes end-to-end com banco real ou utilizadores reais. A execução do GitHub Actions ainda não foi confirmada.

## Confirmado
- `src/auth.js`: middleware `exigeLogin` verifica assinatura JWT, utilizador ativo e revogação; `exigeAdmin` admite admin e gestor.
- Aquários: várias rotas filtram por `organization_id`; `/api/aquarios/:id/autodiagnostico` exige login, assinatura e organização.
- `assetAcessivel`: aquaristas eram classificados como equipa com consulta global a `asset`. Corrigido nesta branch para excluir `aquarista`.
- Administração: rotas `/api/admin/pessoas` e catálogo de espécies requerem `exigeLogin` e `exigeAdmin`.

## Riscos não resolvidos — impedem certificação completa
1. `assetAcessivel` continua a permitir que técnicos acedam a aquários de qualquer organização sem demonstrar atribuição a uma visita. É necessário especificar e testar o modelo de atribuição de técnicos antes de restringir os filtros.
2. `GET /api/laudo/:id/cliente` autoriza admin/gestor/técnico a obter relatórios de outras organizações. Verificar a intenção de negócio e a ligação entre técnico e cliente.
3. APIs administrativas de utilizadores são globais por desenho: confirmar se administradores e gestores podem alterar qualquer organização, inclusive papéis e credenciais.
4. `GET /api/loja/pedido/:id` usa identificador de pedido + e-mail, sem autenticação. Rever exposição de dados da encomenda, imprevisibilidade do identificador e limites de tentativas.
5. `src/loja.js` tem endpoints públicos de pagamento e webhooks; confirmar idempotência, autenticação criptográfica quando disponível e correlação da transação.
6. Confirmar autorizações em uploads e acesso estático a documentos armazenados no disco do Railway.

## Testes obrigatórios antes do merge
- Duas organizações e cinco papéis; exercícios com IDs de outra organização (GET/PUT/DELETE).
- Simular técnicos atribuídos e não atribuídos, sem quebrar a gestão operacional.
- Auditoria de dados sensíveis em pedidos públicos e laudos.
- `npm test` e teste end-to-end num banco isolado.
- Confirmar JWT_SECRET com no mínimo 32 caracteres fora do conector que oculta o valor.
