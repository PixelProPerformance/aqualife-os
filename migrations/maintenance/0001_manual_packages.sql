-- Aqualife OS: pacotes de manutenção e lançamentos manuais.
-- Incremental: não altera pagamentos, agendamentos nem laudos antigos.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS manutencao_pacote_manual (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id UUID NOT NULL REFERENCES organization(id) ON DELETE RESTRICT,
 descricao TEXT NOT NULL DEFAULT 'Pacote de manutenção',
 total_visitas INTEGER NOT NULL CHECK (total_visitas > 0),
 ativo BOOLEAN NOT NULL DEFAULT true,
 criado_por UUID REFERENCES app_user(id) ON DELETE SET NULL,
 criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE(id,organization_id)
);
CREATE INDEX IF NOT EXISTS idx_manutencao_pacote_manual_org ON manutencao_pacote_manual(organization_id,ativo,criado_em DESC);
CREATE TABLE IF NOT EXISTS manutencao_uso_manual (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 pacote_id UUID NOT NULL,
 organization_id UUID NOT NULL,
 data_visita DATE NOT NULL,
 relatorio_url TEXT NOT NULL,
 observacao TEXT,
 criado_por UUID REFERENCES app_user(id) ON DELETE SET NULL,
 criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 anulado_em TIMESTAMPTZ,
 anulado_por UUID REFERENCES app_user(id) ON DELETE SET NULL,
 CONSTRAINT fk_uso_pacote_org FOREIGN KEY (pacote_id,organization_id)
   REFERENCES manutencao_pacote_manual(id,organization_id) ON DELETE RESTRICT,
 CONSTRAINT ck_relatorio_url CHECK (length(relatorio_url) BETWEEN 1 AND 2048)
);
CREATE INDEX IF NOT EXISTS idx_manutencao_uso_manual_pacote
 ON manutencao_uso_manual(pacote_id,data_visita DESC) WHERE anulado_em IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_manutencao_uso_manual_duplicado
 ON manutencao_uso_manual(pacote_id,data_visita,relatorio_url) WHERE anulado_em IS NULL;
COMMIT;
