# Reembolsos repetidos e fechamento semanal — procedimento seguro

## Causas confirmadas no código anterior
1. Endpoint de relatório aceitava status `relatorio_enviado`, inserindo novamente relatório e todos os reembolsos a cada POST.
2. Consulta do fechamento descartava reembolsos cujo técnico não tivesse uma oportunidade concluída e não paga.

Essas causas tornam possíveis os sintomas observados nas capturas. Somente uma análise dos registros reais pode comprovar quais lançamentos pertencem ao mesmo envio e quais despesas são legítimas.

## Auditoria de produção somente leitura
Executar primeiro em transação `READ ONLY`, usando credenciais de leitura e a base de produção conferida, **nunca no banco de staging**:

```sql
BEGIN READ ONLY;
SELECT
  oportunidade_id, tecnico_id,
  lower(trim(descricao)) AS item,
  valor_cents,
  COUNT(*) AS quantidade,
  COUNT(*) FILTER (WHERE status IN ('pre_aprovado','aprovado') AND pago_em IS NULL) AS ativos_pendentes,
  COUNT(*) FILTER (WHERE pago_em IS NOT NULL) AS pagos,
  MIN(criado_em) AS primeiro_lancamento,
  MAX(criado_em) AS ultimo_lancamento,
  ARRAY_AGG(id ORDER BY criado_em) AS ids_para_conferencia
FROM oportunidade_reembolso
WHERE lower(trim(descricao)) = 'anticloro'
GROUP BY oportunidade_id,tecnico_id,lower(trim(descricao)),valor_cents
HAVING COUNT(*) > 1
ORDER BY quantidade DESC,primeiro_lancamento DESC;
ROLLBACK;
```

**Não anular automaticamente todas as linhas repetidas.** Comparar comprovantes, datas, relatório enviado e autorização financeira. Caso comprovantes representem compras distintas, preservar ambas. Anular individualmente pelo Admin informando motivo. Não anular valores pagos ou vinculados a lotes; eventual correção de lote já pago necessita conciliação formal.

## Correção implementada
- Transição atómica `aceita -> relatorio_enviado` na mesma transação que insere relatório e reembolsos: reenvios e pedidos concorrentes não duplicam.
- Fechamento inclui reembolsos pendentes mesmo sem serviço concluído. `aguardando` não entra no pagamento sem aprovação.
- Admin pode anular um lançamento não pago, com motivo, data e utilizador; registro e comprovante permanecem para auditoria. Status `anulado` sai dos totais.
- Schema aditivo para auditoria via `SERVICOS_SCHEMA`, sem alterar dados anteriores.

## Homologação / produção
1. Backup externo recente de produção, validado com restauração isolada; identificar banco e ambiente corretos.
2. Deploy apenas em staging, testar envio simultâneo de relatório, prevenção de duplicados, aprovação/anulação, linhas sem serviços, filtros de pagos/não pagos, saldos e interface Admin.
3. Conferir serviços pagos, pendências, reembolsos, contratos Care, Academy, loja e checkout.
4. Após autorização e validação, merge PR e deploy de produção com rollback de aplicação; não apagar dados existentes.
5. Auditar registros do técnico em produção **somente leitura** e ajustar os lançamentos individualmente, com aprovação do Admin. Não realizar pagamento real durante testes.

O aviso semanal de segunda-feira é uma notificação: não marca pagamentos automaticamente. O botão de marcar pago só deve ser usado após PIX/transferência efetivamente realizada.
