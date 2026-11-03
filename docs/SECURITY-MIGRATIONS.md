# Segurança, dados e migrações — plano de implantação

Esta branch **não modifica automaticamente tabelas de produção** e não substitui o processo existente `garantirSchema()` sem validação prévia.

## JWT e contas iniciais
- Configurar `JWT_SECRET` aleatório (>=32 caracteres) nas Variables do Railway, em todos os ambientes.
- Verificar a configuração **antes de fazer merge/deploy**: a aplicação recusará iniciar sem o segredo.
- Alterar/revogar quaisquer palavras-passe iniciais usadas e investigar outros locais/histórico onde tenham sido publicadas. Remover do README não apaga commits antigos.
- Verificar a expiração/revogação de sessões; a rotação de JWT_SECRET invalida os tokens existentes.

## Migrações
- Fazer backup e verificar recuperação do PostgreSQL antes de qualquer DDL.
- Inventariar migrations já executadas e DDL gerado em `garantirSchema`, `LOJA_SCHEMA` e `SERVICOS_SCHEMA`.
- Criar tabela `schema_migration` e script executor transacional somente após estabelecer o estado real do banco; não executar ficheiros antigos indiscriminadamente.
- Depois de reconciliar a base de dados real, migrar o DDL de arranque para migrations versionadas. Evitar mudar para falha fatal antes dessa reconciliação: instalação existente pode depender do auto-reparo.
- Nunca ignorar uma falha de migration. Verificar integridade, backups e capacidade de rollback antes de ativar migrations automáticas.

## Isolamento por organização
- Revisar cada rota autenticada para comprovar tanto permissão por papel quanto propriedade do recurso (JOIN/FK por `organization_id`).
- Dar atenção a leitura e mutação de `asset`, `reading`, `habitante`, `ticket`, `app_user`, serviços, administração e uploads.
- Endpoints administrativos globais devem ter uma política explícita e documentada; não inserir filtros de organização cegamente sem estudar o domínio.
- Testar com duas organizações e os papéis admin, gestor, técnico, cliente, aquarista: leituras cruzadas e operações cruzadas devem ser recusadas, exceto casos globais explicitamente autorizados.
- Considerar PostgreSQL RLS apenas após inventariar os fluxos e políticas, pois ativá-lo sem políticas completas pode interromper o serviço.

## Duplicações e ficheiros legados
- Fonte principal do diagnóstico: `src/motor/engine.mjs`, `src/motor/regras.json`.
- Existem ficheiros duplicados de espécies/incompatibilidades em `src/data`, `src/motor` e dados embutidos no servidor.
- `src/motor/server.js` não é o entrypoint do `package.json`; **não eliminar** até verificar referências e histórico.
- Centralizar os dados apenas depois de testes de compatibilidade dos endpoints e do frontend.

## Testes e deploy
- Executar `npm test` em CI/ambiente com Node 20+ e `npm install`.
- Expandir cobertura com banco efémero de duas organizações e simulação de webhooks de pagamento.
- Não habilitar deploy automático da branch de correções; rever diferenças e fazer deploy gradual.
