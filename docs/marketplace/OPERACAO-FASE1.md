# Operação da fundação Marketplace — Fase 1

## Escopo de entrega

As migrations `0001_foundation.sql` e `0002_legacy_archive.sql` são aditivas. O legado continua a processar catálogo, checkout, pagamentos, pedidos e estoque. A Fase 1 não ativa vendedores externos nem um painel de vendedor.

O backfill registra a marca legada Aqualife como vendedor da plataforma, com `status=pending` e `accepting_orders=false`. Não associa automaticamente administradores como proprietários, não aprova cadastro e mantém todas as ofertas em `draft`. A validação cadastral pertence ao onboarding posterior. Se não existir configuração fiscal no legado, o nome da marca é preservado sem inventar CNPJ ou indicar verificação jurídica; o log explicita `legalIdentityVerified=false`.

As referências históricas preservam os preços e descontos do pedido original, independentemente do preço atual da oferta. SKUs internos `legacy:<UUID>` evitam colisões e o SKU original fica em `marketplace_legacy_offer`. Itens antigos sem variante preservam o snapshot e uma referência de oferta nula. Não são recriados pagamentos, comissões, envios ou documentos fiscais. Dados de compradores não são copiados para as novas tabelas de histórico.

O estoque importado é um snapshot, com reservas zeradas; não é um segundo estoque ativo. Alterações posteriores do legado não são sincronizadas. A ativação comercial futura exige sincronização e nova reconciliação.

## Gates antes do lançamento

1. CI e auditoria aprovados, incluindo PostgreSQL 18 real e regressões de SMTP, compressão, upload, autorização e reconciliação.
2. Homologação em `clever-youth`, banco `aqualife_marketplace_staging`, com dados fictícios; uploads e navegação também conferidos pela interface.
3. Backup completo do PostgreSQL de produção em bucket privado, download/SHA256 e restauro integral num servidor PostgreSQL sem listener TCP.
4. Comparação do esquema, todas as linhas e sequências; contas temporárias removidas e desempenho observado.
5. Reconciliação comercial real sem divergências bloqueantes; ensaio transacional com rollback; só depois aplicação explícita.
6. Merge final, deploy e smoke tests sem aplicar o patch separado de remoções do Railway.

## Backfill

`node scripts/backfill-legacy.mjs` aplica as migrations e testa o backfill em transação revertida. `--apply` confirma a mesma operação. A execução aceita apenas os projetos conhecidos e o banco esperado. Em produção exige `MARKETPLACE_RELEASE_EVIDENCE` com SHA256, data recente do backup integralmente recuperado e regressões aprovadas.

O backfill utiliza snapshot consistente e bloqueio consultivo para impedir importações concorrentes. Verifica novamente a origem e a idempotência antes de confirmar. Se os dados de origem mudarem após uma importação anterior, interrompe; não sobrescreve snapshots nem tenta corrigir saldos ou pedidos automaticamente.

## Backup diário

Serviço dedicado `aqualife-daily-backup`, no projeto `positive-encouragement`, executa `ops/backup/backup.py` às **03:15 UTC**. Não possui domínio ou volume, não reinicia automaticamente e termina após cada operação. Limites: 0,5 vCPU e 1 GB.

As credenciais do bucket são referências Railway, sem cópias no código. A ligação administrativa de bootstrap é usada exclusivamente para consultar candidatos e criar/remover uma conta temporária de leitura, conforme autorização expressa de 26/10/2026. A senha dessa conta só existe em memória; expira em uma hora. Dump e leitura de dados recusam contas administrativas ou com privilégios de escrita/DDL. Os subprocessos recebem somente a credencial de leitura; o restauro recebe apenas a ligação ao socket local.

Destino: bucket privado `aqualife-production-backups`, região `ams`, com encriptação em repouso do provedor. Cada execução usa chave única `postgres/railway/<UTC>-<UUID>/database.dump` e grava um manifesto privado. Não há exclusão automática de cópias, conforme preferência do utilizador. A tarifa de armazenamento publicada é USD 0,015/GB-mês; computação e tráfego do serviço são cobrados à parte. Consulte a [documentação Railway](https://docs.railway.com/storage-buckets).

Uma execução só retorna `PASS` depois do upload, download, SHA256 e restauro integral com comparação. Uma divergência, incluindo uma sequência alterada concorrentemente, impede aprovação. Conferir o resultado mais recente no Railway antes de uma nova release; não interpretar apenas o estado `SUCCESS` de deployment como prova de que o script passou.

O dump preserva o banco, mas não é um backup de todo o cluster ou dos arquivos de uploads. Roles globais, credenciais e configuração dos serviços não estão incluídos. O ensaio restaura dados e estrutura sem aplicar proprietários e ACLs; uma recuperação efetiva deve reaplicar os privilégios apropriados no destino isolado.

## Rollback

Reimplantar o commit anterior da aplicação mantém o legado ativo. Não apagar tabelas Marketplace nem restaurar um dump por cima do banco ativo. Se for preciso recuperar o banco, restaurar o arquivo privado em outro PostgreSQL, conferir SHA256 e manifesto, validar esquema/dados/contagens/seqüências e planejar a reconciliação de transações posteriores antes de trocar a ligação. A aplicação antiga pode continuar usando o legado enquanto as tabelas aditivas ficam preservadas e inativas.

O patch Railway de três remoções é independente. Nunca usar `accept-deploy` para publicar esta release, pois isso aplicaria também aquelas remoções.
