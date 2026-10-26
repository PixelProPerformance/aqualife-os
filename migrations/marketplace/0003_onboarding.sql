-- Aditiva. Aplicação explícita após backup; nunca executada no arranque da aplicação.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
CREATE TABLE IF NOT EXISTS marketplace_seller_profile (
 seller_id UUID PRIMARY KEY REFERENCES marketplace_seller(id),
 contact_name TEXT NOT NULL, contact_email TEXT NOT NULL, contact_phone TEXT NOT NULL,
 terms_version TEXT NOT NULL, terms_accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 review_note TEXT NOT NULL DEFAULT '',
 reviewed_by UUID REFERENCES app_user(id), reviewed_at TIMESTAMPTZ,
 revision INT NOT NULL DEFAULT 1 CHECK(revision > 0),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO marketplace_schema_migration(version) VALUES ('0003_marketplace_onboarding') ON CONFLICT DO NOTHING;
COMMIT;
