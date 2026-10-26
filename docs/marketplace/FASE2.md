# Marketplace — Fase 2: operação e limites

Entrega na branch `feat/marketplace-fase2-onboarding`, PR #9.

## Interface

- `/lojista.html`: seleção de lojas, cadastro, correção/reenvio, análise, catálogo e pedidos somente em consulta, equipe e histórico.
- `/marketplace-admin.html`: revisão por admin/gestor, checklist manual de empresa/contato/endereço, decisão motivada, rejeição, suspensão e reaprovação.
- Entradas pela Minha conta e Administração. Layout responsivo, rótulos, foco visível e mensagens acessíveis.

## Permissões e estados

A associação ativa é verificada por seller_id em cada operação; o papel global administrativo não concede acesso ao painel privado de uma loja. O proprietário gere equipe somente após aprovação. Funcionários consultam os módulos, mas não alteram cadastro, equipe, revisão ou publicação. O proprietário não pode ser removido/promovido pelo fluxo de staff. A adição concede acesso imediato a uma conta existente; a tela avisa o proprietário. Remoção é lógica e revoga novos acessos imediatamente.

Cadastros pending/rejected podem ser corrigidos pelo owner; cada envio incrementa a revisão e exige novo aceite. O CNPJ não é alterável por esse fluxo. Cadastros aprovados/suspensos são apenas consultáveis; correções cadastrais exigem suporte. Suspensão bloqueia alterações e suspende ofertas ativas, sem apagar histórico. Aprovação não ativa ofertas nem accepting_orders.

Transições: pending → approved/rejected; approved → suspended; rejected → pending por reenvio do owner; suspended → approved/rejected. Decisões usam revisão e estado esperado para recusar telas desatualizadas. Ações de escrita revalidam o vínculo sob lock na mesma transação e registram auditoria. Dados pessoais não entram no histórico de cadastro; motivos administrativos ficam visíveis à loja.

CNPJ: validação algorítmica do formato numérico e dígitos; não consulta a Receita Federal nem comprova existência/regularidade. O administrador deve fazer as verificações adequadas fora da aplicação e registrar a decisão. Dados e decisões de homologação são fictícios.

## Recursos indisponíveis

Sem cadastro/edição/publicação comercial de ofertas nesta entrega, integração de estoque ativo, pagamentos, saldo, repasses, cobrança, emissão fiscal, etiquetas, frete ou rastreio. As telas explicitam os limites. O endpoint de publicação responde 409 mesmo para owner aprovado. Catálogo, estoque e pedidos exibem somente registros reais da loja; estados vazios não simulam vendas.

Care, Academy, Aquabook, loja e checkout legados não são reimplementados. As únicas alterações nas telas existentes são links de navegação.

## Migração e publicação

`0003_onboarding.sql` cria apenas marketplace_seller_profile e registra a versão. Não modifica tabelas legadas; usa lock_timeout=5s e statement_timeout=30s. Não é executada automaticamente no arranque.

`node scripts/migrate-marketplace-phase2.mjs` faz ensaio com rollback, verifica identidade do banco/projeto, idempotência e fingerprint comercial legado. `--apply` exige evidência JSON em MARKETPLACE_RELEASE_EVIDENCE: backup_sha256, backup_at (menos de 6h), restored=true; produção também exige ci_pass, staging_pass, commit e staging_deployment. Esses campos não substituem a inspeção dos logs reais de backup/CI/homologação.

Ordem: CI PostgreSQL 18 e auditoria → backup externo staging com download/restauro → ensaio/aplicação staging → deploy do commit fixado → SQL/API + regressões + inspeção visual → backup externo produção com restauro → ensaio/aplicação produção → merge/deploy → smoke.

Nunca aplicar o patch Railway independente de remoções. Publicar por fonte/commit específico e manter volumes e serviço de backup diário.

Rollback da aplicação: reimplantar a versão anterior (Fase 1, main a9fb4040fbe4fa2d605cdc5141632dce24882b2b, deployment 57350ac5-519c-4c19-ae0b-0963dba3ec62), preservando a tabela aditiva. Não executar DROP em produção nem restaurar sobre o banco ativo. Restauro de dados somente em PostgreSQL isolado com conferência e reconciliação posterior.

## Validação

- `node --test tests/*.test.mjs`: validação de entradas, autorização, SMTP, uploads/compressão e regressões.
- `PG_TEST_URL=... node --test tests/marketplace-onboarding.integration.test.mjs`: SQL/HTTP reais em schema descartável, duas lojas, papéis, conflitos de revisão, suspensão, bloqueio de publicação e FK composta. Recusa projetos de produção.
- `node scripts/validate-marketplace-phase2-staging.mjs`: contra o serviço real de clever-youth e banco aqualife_marketplace_staging. Cria dados sintéticos, testa autenticação real, revoga sessões, desativa contas e suspende lojas no finally.
- `node scripts/validate-staging.mjs`: regressões legadas sem pagamentos reais.

Fase 3 requer autorização separada. Esta entrega não ativa comércio de terceiros.
