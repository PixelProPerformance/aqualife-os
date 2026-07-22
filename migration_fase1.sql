-- ============================================================
-- AQUALIFE OS — MIGRATION FASE 1 — FUNDAÇÃO DO MVP
-- Idempotente: pode rodar 2x sem erro.
-- Cole no Query Editor do Railway (depois de já ter rodado migration.sql)
-- e clique em "Run Query".
-- ============================================================

-- --------------------------------------------------------------
-- 1) EXTENSÃO DO AQUÁRIO (módulo "Meus Aquários")
-- --------------------------------------------------------------
ALTER TABLE asset ADD COLUMN IF NOT EXISTS name              TEXT;
ALTER TABLE asset ADD COLUMN IF NOT EXISTS foto_url          TEXT;
ALTER TABLE asset ADD COLUMN IF NOT EXISTS sistema_filtragem TEXT;
ALTER TABLE asset ADD COLUMN IF NOT EXISTS fauna             JSONB DEFAULT '[]';
ALTER TABLE asset ADD COLUMN IF NOT EXISTS flora             JSONB DEFAULT '[]';
ALTER TABLE asset ADD COLUMN IF NOT EXISTS data_montagem     DATE;
ALTER TABLE asset ADD COLUMN IF NOT EXISTS observacoes       TEXT;
ALTER TABLE asset ADD COLUMN IF NOT EXISTS owner_user_id     UUID REFERENCES app_user(id);
ALTER TABLE asset ADD COLUMN IF NOT EXISTS ativo             BOOLEAN DEFAULT true;

-- --------------------------------------------------------------
-- 2) RECUPERAÇÃO DE SENHA
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS password_reset_token (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  token       TEXT UNIQUE NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used        BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reset_token ON password_reset_token(token);

-- --------------------------------------------------------------
-- 3) NOTIFICAÇÕES / AVISOS (dashboard)
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notificacao (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES app_user(id) ON DELETE CASCADE, -- NULL = aviso global
  organization_id UUID REFERENCES organization(id),
  titulo      TEXT NOT NULL,
  mensagem    TEXT,
  tipo        TEXT DEFAULT 'info', -- info | aviso | novidade
  lida        BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notificacao_user ON notificacao(user_id, lida);

-- --------------------------------------------------------------
-- 4) SUPORTE (tickets)
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ticket (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organization(id),
  user_id         UUID NOT NULL REFERENCES app_user(id),
  assunto         TEXT NOT NULL,
  mensagem        TEXT NOT NULL,
  anexos          JSONB DEFAULT '[]', -- URLs de fotos/vídeos
  status          TEXT NOT NULL DEFAULT 'aberto', -- aberto | respondido | fechado
  resposta        TEXT,
  respondido_por  UUID REFERENCES app_user(id),
  respondido_em   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ticket_user ON ticket(user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_status ON ticket(status);

-- --------------------------------------------------------------
-- 5) AQUABOOK — sugestões de novas espécies
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS especie_sugestao (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES app_user(id),
  nome_comum      TEXT NOT NULL,
  nome_cientifico TEXT,
  categoria       TEXT,
  descricao       TEXT,
  foto_url        TEXT,
  status          TEXT NOT NULL DEFAULT 'em_moderacao', -- em_moderacao | aprovada | rejeitada
  moderado_por    UUID REFERENCES app_user(id),
  moderado_em     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------
-- 6) MONETIZAÇÃO — assinaturas + Founding Members + pagamentos
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS founding_member_config (
  id           INTEGER PRIMARY KEY DEFAULT 1,
  max_slots    INTEGER NOT NULL DEFAULT 100,
  slots_used   INTEGER NOT NULL DEFAULT 0,
  deadline     DATE,
  price_cents  INTEGER NOT NULL DEFAULT 1790,  -- R$17,90
  ativo        BOOLEAN NOT NULL DEFAULT true,
  CHECK (id = 1)
);
INSERT INTO founding_member_config (id, max_slots, slots_used, deadline, price_cents, ativo)
VALUES (1, 100, 0, '2026-08-30', 1790, true)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS subscription (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES app_user(id),
  organization_id   UUID REFERENCES organization(id),
  plano             TEXT NOT NULL DEFAULT 'aqualife_care_standard',
  founding_member   BOOLEAN DEFAULT false,
  billing_cycle     TEXT NOT NULL DEFAULT 'mensal', -- mensal | anual
  price_cents       INTEGER NOT NULL,               -- valor efetivamente cobrado
  status            TEXT NOT NULL DEFAULT 'pendente', -- pendente | ativa | atrasada | cancelada
  mercadopago_subscription_id TEXT,
  current_period_end TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_subscription_user ON subscription(user_id);

CREATE TABLE IF NOT EXISTS pagamento (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id   UUID REFERENCES subscription(id),
  user_id           UUID REFERENCES app_user(id),
  mercadopago_payment_id TEXT,
  valor_cents       INTEGER NOT NULL,
  moeda             TEXT DEFAULT 'BRL',
  status            TEXT NOT NULL DEFAULT 'pendente', -- pendente | aprovado | rejeitado | estornado
  metodo            TEXT, -- pix | cartao
  raw_payload       JSONB,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pagamento_user ON pagamento(user_id);

-- Guarda as credenciais do Mercado Pago (nunca fixas no código).
CREATE TABLE IF NOT EXISTS integracao_config (
  chave       TEXT PRIMARY KEY,  -- ex: 'mercadopago_access_token'
  valor       TEXT,
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------
-- 7) ACADEMY (placeholder de arquitetura — conteúdo na próxima fase)
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS curso (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo      TEXT NOT NULL,
  descricao   TEXT,
  ordem       INTEGER DEFAULT 0,
  publicado   BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS curso_progresso (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES app_user(id),
  curso_id    UUID NOT NULL REFERENCES curso(id),
  percentual  INTEGER DEFAULT 0,
  concluido   BOOLEAN DEFAULT false,
  atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, curso_id)
);

-- --------------------------------------------------------------
-- 8) LOJA (placeholder de arquitetura — fase futura)
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS produto (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        TEXT NOT NULL,
  descricao   TEXT,
  preco_cents INTEGER,
  foto_url    TEXT,
  ativo       BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS pedido (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES app_user(id),
  itens       JSONB NOT NULL DEFAULT '[]',
  total_cents INTEGER,
  status      TEXT DEFAULT 'pendente',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FIM — migration Fase 1 concluída
-- ============================================================
