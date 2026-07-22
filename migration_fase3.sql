-- ============================================================
-- AQUALIFE OS — MIGRATION FASE 3 — MONETIZAÇÃO / MERCADO PAGO
-- Idempotente. Rode DEPOIS de migration.sql e migration_fase1.sql.
-- Cole no Query Editor do Railway e clique em "Run Query".
-- ============================================================

-- --------------------------------------------------------------
-- 1) PREÇOS DA OFERTA (founding_member_config)
--    Modelo definido com o cliente:
--      · Mensal recorrente (oficial): R$ 34,90  -> 3490
--      · Anual 12x (fundador):        R$ 214,80 -> 21480  (R$17,90/mês)
--      · Anual Pix (fundador):        R$ 189,00 -> 18900
-- --------------------------------------------------------------
ALTER TABLE founding_member_config ADD COLUMN IF NOT EXISTS price_mensal_cents    INTEGER NOT NULL DEFAULT 3490;
ALTER TABLE founding_member_config ADD COLUMN IF NOT EXISTS price_anual_12x_cents INTEGER NOT NULL DEFAULT 21480;
ALTER TABLE founding_member_config ADD COLUMN IF NOT EXISTS price_anual_pix_cents INTEGER NOT NULL DEFAULT 18900;

-- Garante os valores acordados na linha única (id=1), sem sobrescrever slots_used/deadline.
UPDATE founding_member_config
   SET price_mensal_cents    = 3490,
       price_anual_12x_cents = 21480,
       price_anual_pix_cents = 18900
 WHERE id = 1;

-- --------------------------------------------------------------
-- 2) ASSINATURA — campos extras de controlo de cobrança
-- --------------------------------------------------------------
ALTER TABLE subscription ADD COLUMN IF NOT EXISTS metodo            TEXT;    -- mensal_cartao | anual_12x | anual_pix
ALTER TABLE subscription ADD COLUMN IF NOT EXISTS mp_preference_id  TEXT;    -- Checkout Pro (pagamento único)
ALTER TABLE subscription ADD COLUMN IF NOT EXISTS mp_init_point     TEXT;    -- URL de pagamento devolvida pelo MP
ALTER TABLE subscription ADD COLUMN IF NOT EXISTS external_reference TEXT;   -- id que ligamos ao MP (idempotência)
CREATE INDEX IF NOT EXISTS idx_subscription_extref ON subscription(external_reference);

-- --------------------------------------------------------------
-- 3) PAGAMENTO — referência externa para casar com o webhook
-- --------------------------------------------------------------
ALTER TABLE pagamento ADD COLUMN IF NOT EXISTS external_reference TEXT;
CREATE INDEX IF NOT EXISTS idx_pagamento_mp ON pagamento(mercadopago_payment_id);

-- --------------------------------------------------------------
-- 4) CREDENCIAIS MERCADO PAGO (integracao_config)
--    Nunca ficam fixas no código — o admin cadastra pelo painel.
--    Criamos as chaves vazias para aparecerem no formulário.
-- --------------------------------------------------------------
INSERT INTO integracao_config (chave, valor) VALUES
  ('mercadopago_access_token',   NULL),
  ('mercadopago_public_key',     NULL),
  ('mercadopago_webhook_secret', NULL)
ON CONFLICT (chave) DO NOTHING;

-- ============================================================
-- FIM — migration Fase 3 concluída
-- ============================================================
