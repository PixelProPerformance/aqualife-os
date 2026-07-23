-- ============================================================
-- AQUALIFE OS · FASE 9 — Taxas do Mercado Pago (bruto / taxa / líquido)
-- Idempotente. Rode no Query editor do Railway.
-- ============================================================

-- Agendamentos (solicitacao)
ALTER TABLE solicitacao ADD COLUMN IF NOT EXISTS taxa_cents    INTEGER;
ALTER TABLE solicitacao ADD COLUMN IF NOT EXISTS liquido_cents INTEGER;

-- Pagamentos de assinatura (pagamento)
ALTER TABLE pagamento   ADD COLUMN IF NOT EXISTS taxa_cents    INTEGER;
ALTER TABLE pagamento   ADD COLUMN IF NOT EXISTS liquido_cents INTEGER;

-- Percentual de taxa padrão (usado só como ESTIMATIVA quando o valor real
-- do Mercado Pago ainda não chegou). O valor real, quando disponível, sempre prevalece.
INSERT INTO integracao_config (chave, valor, atualizado_em)
VALUES ('mp_taxa_percent', '4.99', NOW())
ON CONFLICT (chave) DO NOTHING;

-- FIM Fase 9
