-- ============================================================
-- AQUALIFE OS — MIGRATION FASE 7 — PAGAMENTO DO AGENDAMENTO
-- Idempotente. Rode DEPOIS das migrations anteriores.
-- ============================================================

-- Garante a tabela de solicitações/agendamentos (idempotente — se já existir, mantém).
CREATE TABLE IF NOT EXISTS solicitacao (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            TEXT,
  email           TEXT,
  telefone        TEXT,
  pais            TEXT,
  cidade          TEXT,
  cep             TEXT,
  water_type      TEXT,
  volume_litros   NUMERIC,
  plano           TEXT,
  forma_pagamento TEXT,
  data_opcao1     DATE,
  data_opcao2     DATE,
  valor_visita    NUMERIC,
  moeda           TEXT,
  regiao          TEXT,
  pricing_version TEXT,
  status          TEXT DEFAULT 'novo',
  organization_id UUID,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Pagamento online da visita/plano direto no agendamento (solicitacao).
ALTER TABLE solicitacao ADD COLUMN IF NOT EXISTS valor_total_cents   INTEGER;
ALTER TABLE solicitacao ADD COLUMN IF NOT EXISTS valor_cobrado_cents INTEGER;   -- o que o MP cobra (mensal=mensal, resto=total)
ALTER TABLE solicitacao ADD COLUMN IF NOT EXISTS mp_preference_id    TEXT;
ALTER TABLE solicitacao ADD COLUMN IF NOT EXISTS mp_preapproval_id   TEXT;
ALTER TABLE solicitacao ADD COLUMN IF NOT EXISTS mp_init_point       TEXT;
ALTER TABLE solicitacao ADD COLUMN IF NOT EXISTS external_reference  TEXT;
ALTER TABLE solicitacao ADD COLUMN IF NOT EXISTS status_pagamento    TEXT DEFAULT 'nao_iniciado'; -- nao_iniciado | pendente | pago | falhou
CREATE INDEX IF NOT EXISTS idx_solicitacao_extref ON solicitacao(external_reference);

-- ============================================================
-- FIM — migration Fase 7 concluída
-- ============================================================
