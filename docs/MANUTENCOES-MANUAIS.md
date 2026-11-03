# Pacotes de manutenção — controlo manual (Fase inicial)

## Regras
- O pacote pertence à organização do cliente (`organization_id`), que pode ter vários utilizadores e aquários.
- Ao criar cliente no Admin: `manutencoes_total=0` significa avulsa; valor positivo cria um pacote inicial.
- No Admin → Clientes → Manutenções: criar outros pacotes, ajustar total, lançar uma visita com data, observação e URL do relatório; anular lançamento preservando auditoria.
- O saldo é sempre `total_visitas - COUNT(manutenções manuais não anuladas)`.
- **Agendamentos, relatórios existentes e pagamentos não alteram o saldo automaticamente.**
- O painel do cliente mostra pacotes e visitas com links dos relatórios; sem pacote, orienta para `/site.html#/agendar`.
- Uma visita futura não pode ser registada como utilizada; URL interna relativa ou `https://` válida. Não enviar links de relatórios cujo acesso não esteja autorizado ao cliente.
- Todos os endpoints de modificação exigem `exigeLogin` + `exigeAdmin`; consulta do cliente deriva organização do utilizador autenticado.

## Schema, rollback e compatibilidade
- Migration **aditiva**: `migrations/maintenance/0001_manual_packages.sql`; não alterar pagamentos, `solicitacao`, `reading` ou `oportunidade`.
- **Não criar tabelas em arranque**: aplicar migration controlada antes de publicar código.
- Não aplicar diretamente em produção sem backup restaurável; ensaiar em PostgreSQL isolado e verificar CI.
- O histórico de manutenções existentes NÃO é importado automaticamente. O Admin deve lançar os serviços já consumidos, com data e URL corretos.
- Rollback: retornar à versão anterior da aplicação, preservando as tabelas e os dados adicionados. Não executar DROP em produção.
- O delete de cliente foi tornado transacional; clientes com qualquer pacote ficam protegidos contra exclusão acidental.
- Quando houver integração automática futura, identificar lançamentos manuais e controlar deduplicação antes de começar a descontar via API.

## Validação antes do deploy
1. Execução do workflow `Manual maintenance packages`, incluindo PostgreSQL 18.
2. Testes em staging: criar organização cliente com 3 visitas, criar o acesso ao cliente, lançar 1 visita com PDF autorizado, verificar 3/1/2 em ambos os painéis.
3. Tentar lançar mais de 3: deve recusar; anular um lançamento e verificar restabelecimento de saldo.
4. Logar como cliente de outra organização: não deve ter acesso às manutenções desta.
5. Cliente avulso: apenas mensagem de manutenção avulsa e link de agendamento.
6. Validar criação e exclusão de clientes sem pacote; cliente com pacote não deve ser eliminado.
7. Regressão: Care, Academy, Aquabook, loja, serviços, pagamentos, histórico e login.
8. Backup antes da migration e verificação de deploy e rollback.

## Segurança dos links
URLs são fornecidas pelo administrador. Recomendado usar um relatório acessível somente ao cliente autenticado. O sistema não publica automaticamente laudos nem gera links públicos; deve-se verificar as permissões do destino antes de o anexar.
