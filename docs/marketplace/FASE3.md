# Marketplace — Fase 3: catálogo, ofertas e estoque

## Continuação do roteiro original — vitrine de consulta

`/marketplace.html` reúne catálogo, ficha comparativa (`?product=UUID`) e página da loja (`?seller=UUID`). A API pública `/api/marketplace/showcase` fica desabilitada por padrão; exige `MARKETPLACE_CATALOG_PREVIEW_ENABLED=true`. A habilitação da prévia não altera os bloqueios comerciais. Cada linha identifica **Vendido por**, variação, preço do produto, disponibilidade, garantia, condições e dias de preparo (não prazo de transporte). Não há carrinho, reserva, pagamento, frete, reputação ou etiqueta fictícia.

Ordenação pública: disponibilidade primeiro; menor preço do produto; menor prazo de preparo; UUID da oferta como desempate estável. Sem comissão, patrocínio ou preferência da plataforma. A consulta é paginada por 100 ofertas, com filtro de produto/loja e busca; a página informa a regra e o frete não calculado.

O proprietário prepara uma apresentação pública separada dos dados cadastrais, com autorização explícita para nome da loja, biografia, cidade e UF opcionais. CNPJ, contato, endereço completo, equipe, SKU e reservas não são projetados na API pública. Somente loja aprovada, produto aprovado, apresentação autorizada e oferta aprovada para **consulta** são exibidos. A oferta continua `draft` e `accepting_orders=false`. Suspensão/retirada remove a oferta da consulta; alterar preço/SKU/variação/estado, condições ou apresentação exige nova moderação. Ajustar estoque mantém a aprovação, atualizando apenas disponibilidade.

Produtos recebem até 20 atributos técnicos de texto. A administração corrige classificação/ficha com motivo e controle de concorrência, retornando ofertas à revisão. A fila de ofertas analisa preço, condições e apresentação da loja; aprovação e retirada têm motivo, revisão esperada e auditoria.

`0005_showcase.sql` é adicional à 0004 já ensaiada/aplicada no staging. Adiciona apresentação, moderação de ofertas, atributos e correspondências do legado. O executor ensaia/aplica ambas, sem modificar o SQL 0004 publicado anteriormente. Nenhuma migração roda no arranque.

A conferência do legado mostra IDs originais, marca/modelo, variações e imagens originais. O administrador registra correspondência com um produto novo aprovado somente após conferir os três grupos e justificar evidências; não há união por nome. A correspondência cria um vínculo reversível e auditado, sem reescrever produtos, IDs/URLs, imagens, ofertas/estoques ou pedidos antigos. A ficha da prévia pode remeter ao produto original para consulta das imagens/variações preservadas. Produtos reais exigem revisão humana de conteúdo antes de qualquer correspondência; fixtures comprovam o mecanismo, não certificam os produtos reais.

Rollback: desabilitar `MARKETPLACE_CATALOG_PREVIEW_ENABLED` e retornar a aplicação da Fase 2. Preservar tabelas/arquivos aditivos e evidências. O trigger de invalidação afeta apenas a tabela nova de moderação; não ativa comércio nem altera as tabelas legadas.

Escopo confirmado pelo utilizador: catálogo, ofertas e estoque do lojista com moderação. Vendas, publicação comercial, pagamentos e expedição continuam bloqueados.

## Fluxo real

1. Owner de loja aprovada envia imagem JPEG/PNG/WebP (até 5 MB, até 16 milhões de pixels), cria rascunho com título/descrição/categoria e GTIN opcional e envia para análise.
2. Admin/gestor registra aprovação ou correção com motivo e revisão esperada. Aprovação cria produto compartilhado ou vincula explicitamente a produto já aprovado; GTIN duplicado não cria outro produto silenciosamente.
3. Owner cria oferta de produto aprovado, com SKU por loja, variação e preço em centavos. A oferta fica em draft. Pode editar ou arquivar; não publica.
4. Owner ajusta quantidade disponível com motivo, revisão e chave de idempotência. Reserva existente não é alterada. Ledger registra antes/depois/delta, autor e data. Requisições repetidas não duplicam movimentos e revisões concorrentes desatualizadas são recusadas.
5. Administração pode retirar produto novo do catálogo; ofertas vinculadas são suspensas sem apagar preços, estoque ou histórico. Novas ofertas e restauração de ofertas desse produto são bloqueadas. Locks do produto serializam criação/edição e retirada concorrentes.

Staff consulta produtos da própria loja, ofertas, estoque e histórico, sem escrita. Lojas pendentes/suspensas e vendedor legado da plataforma não têm acesso às escritas desta etapa. Papéis globais não substituem vínculo privado seller_id. Catálogo compartilhado expõe somente produtos aprovados a utilizadores autenticados.

## Interface

A área `/lojista.html` contém Produtos, Ofertas e Estoque, além dos módulos da Fase 2. Produtos têm imagem e formulário, rascunho/edit/reenvio e motivo da decisão. Ofertas pesquisam o catálogo aprovado; estoque exibe reservas separadas e ledger. `/marketplace-catalog-admin.html` mostra fila, filtros, paginação, motivo, vinculação e retirada. Navegação administrativa funciona no celular.

Imagens são reprocessadas para JPEG, no máximo 1600 × 1600, sem conservar nome original ou metadados. SVG, arquivos inválidos, animações e imagens excessivas são recusados. Arquivos usam nomes aleatórios no volume de uploads existente, subpasta marketplace. As URLs de imagem são públicas, inclusive antes da aprovação; a interface informa para não enviar documentos/dados pessoais. Só é possível associar imagem pertencente à própria loja. Sem upload ou busca remota de imagens pela aplicação.

Limites operacionais: 500 propostas e 1000 ofertas/imagens por loja, páginas de 100 registros, tentativas por conta limitadas pelo limitador existente. GTIN tem validação algorítmica; não há consulta externa. Valores são inteiros em centavos, entre 1 e 100000000. Quantidade disponível entre 0 e 1000000. As reservas não representam integração de checkout novo nesta fase.

## Migração e gates

`0004_catalog.sql` adiciona cinco tabelas: assets, submissões, detalhes de catálogo, detalhes de oferta e movimentações. Não altera tabelas legadas nem ativa ofertas/accepting_orders. Não roda no arranque.

`node scripts/migrate-marketplace-phase3.mjs` ensaia com rollback. `--apply` exige backup recuperado recente e executa primeiro ensaio revertido do mesmo SQL, seguido da aplicação explícita; ambos verificam idempotência e fingerprint comercial legado. Produção também exige CI, staging, commit e commerce_enabled=false na evidência, a ser conferida nos logs reais.

Sequência: CI PostgreSQL 18/auditoria → backup/restauro staging → ensaio e aplicação staging → deploy fixado → SQL/API e visual, regressões legadas → backup/restauro produção → ensaio/aplicação → merge/deploy → smoke com contagens anteriores.

Rollback de aplicação: versão da Fase 2, main 7a362f8311464232c9913c62c4765964914f2302, deployment ebc200e6-7201-45ca-99bc-7e4840345f6e. Preservar tabelas aditivas e arquivos. Não executar DROP em produção nem restaurar sobre a base ativa. A aplicação anterior ignora as tabelas novas e mantém publicação bloqueada.

Preservar Postgres, volume de uploads, rotina diária e patch independente de remoções do Railway. Backup do banco não inclui uploads, roles globais ou configuração dos serviços.

## Validação

- CI inclui testes anteriores e `marketplace-catalog.integration.test.mjs` com PostgreSQL 18, imagens reais, isolamento A/B, owner/staff/inativos, moderação/revisões/GTIN, preço, FK composta, idempotência e concorrência do estoque e retirada do catálogo.
- `phase3-staging-suite.mjs` roda SQL isolado, espera a API real, verifica onboarding/legado e `validate-marketplace-phase3-staging.mjs` contra clever-youth; nenhum pagamento real. Dados fictícios são suspensos/desativados e produtos fictícios retirados do catálogo ao terminar.
- `visual-marketplace-phase3.mjs` cria fixtures restritas ao staging; `--cleanup` desativa contas/vínculos e suspende ofertas, preservando a auditoria. Credenciais de teste apenas em variável do auxiliar, nunca necessárias na produção.

Sem alteração de Care, Academy, Aquabook, loja pública ou checkout legado. Produtos importados da loja antiga não são convertidos em estoque ativo da nova operação.
