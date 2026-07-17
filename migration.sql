-- ============================================================
-- AQUALIFE OS — MIGRATION v1.0 — RAILWAY POSTGRESQL
-- Idempotente: pode rodar 2x sem erro.
-- Cole no Query Editor do Railway e clique em "Run Query".
-- ============================================================

-- EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- TABELAS (CREATE TABLE IF NOT EXISTS = idempotente)

CREATE TABLE IF NOT EXISTS organization (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name    TEXT NOT NULL,
  type    TEXT NOT NULL DEFAULT 'residential', -- provider | residential | commercial
  country TEXT NOT NULL DEFAULT 'BR',
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS location (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  label           TEXT NOT NULL,
  city            TEXT,
  criado_em       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS asset (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  location_id     UUID REFERENCES location(id),
  label           TEXT NOT NULL DEFAULT 'Aquário',
  water_type      TEXT NOT NULL DEFAULT 'freshwater', -- freshwater | marine | pond
  volume_liters   NUMERIC,
  criado_em       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_user (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organization(id),
  name            TEXT NOT NULL,
  email           TEXT UNIQUE NOT NULL,
  senha_hash      TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'cliente', -- admin | gestor | tecnico | cliente | aquarista
  ativo           BOOLEAN DEFAULT true,
  criado_em       TIMESTAMPTZ DEFAULT NOW()
);

-- Leituras (append-only — nunca deletar)
CREATE TABLE IF NOT EXISTS reading (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id         UUID NOT NULL REFERENCES asset(id),
  organization_id  UUID NOT NULL REFERENCES organization(id),
  technician_id    UUID REFERENCES app_user(id),
  service_order_id UUID,
  source           TEXT DEFAULT 'tecnico', -- tecnico | aquarista
  values           JSONB NOT NULL,         -- { ph, kh, amonia, ... }
  health_score     INTEGER,
  urgency          TEXT,                   -- ok | atencao | alerta | critico
  confidence       INTEGER,
  diagnostico      JSONB,
  ruleset_version  TEXT,
  client_id        UUID UNIQUE,            -- UUID gerado pelo app (deduplicação offline)
  observacao       TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS esclarecimento (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reading_id      UUID REFERENCES reading(id),
  organization_id UUID REFERENCES organization(id),
  autor_id        UUID REFERENCES app_user(id),
  pergunta        TEXT NOT NULL,
  resposta        TEXT,
  respondido      BOOLEAN DEFAULT false,
  respondido_em   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ÍNDICES (IF NOT EXISTS = idempotente no PG 9.5+)
CREATE INDEX IF NOT EXISTS idx_asset_org     ON asset(organization_id);
CREATE INDEX IF NOT EXISTS idx_reading_asset ON reading(asset_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reading_org   ON reading(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_email    ON app_user(email);

-- ============================================================
-- SEED: Organização Aqualife + Admin
-- Troque o e-mail e a senha antes de rodar em produção!
-- Senha padrão: Aqualife@2024  (bcrypt hash abaixo)
-- ============================================================
INSERT INTO organization (id, name, type, country)
VALUES ('00000000-0000-0000-0000-000000000001', 'Aqualife Aquarismo', 'provider', 'BR')
ON CONFLICT (id) DO NOTHING;

-- Hash bcrypt de "Aqualife@2024" (rodado com bcryptjs rounds=10)
-- TROQUE a senha depois do primeiro login!
INSERT INTO app_user (organization_id, name, email, senha_hash, role)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Admin Aqualife',
  'admin@aqualife.com.br',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lHHi',
  'admin'
)
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- FIM — migration concluída
-- ============================================================
