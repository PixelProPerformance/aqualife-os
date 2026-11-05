-- Fase 5, primeira entrega: conexão OAuth em homologação; não libera cobranças.
BEGIN;
CREATE TABLE IF NOT EXISTS marketplace_mp_connection (
 seller_id UUID PRIMARY KEY REFERENCES marketplace_seller(id),
 provider_user_id TEXT NOT NULL UNIQUE CHECK(provider_user_id ~ '^[0-9]{1,20}$'),
 state TEXT NOT NULL CHECK(state IN ('connected','disconnected','reauthorization_required')),
 mode TEXT NOT NULL DEFAULT 'test' CHECK(mode='test'),
 access_cipher TEXT, refresh_cipher TEXT, expires_at TIMESTAMPTZ,
 revision INT NOT NULL DEFAULT 1 CHECK(revision>0),
 connected_by UUID NOT NULL REFERENCES app_user(id),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK((state='connected' AND access_cipher IS NOT NULL AND refresh_cipher IS NOT NULL AND expires_at IS NOT NULL)
  OR (state<>'connected' AND access_cipher IS NULL AND refresh_cipher IS NULL))
);
CREATE TABLE IF NOT EXISTS marketplace_mp_oauth_attempt (
 state_hash TEXT PRIMARY KEY CHECK(state_hash ~ '^[a-f0-9]{64}$'),
 seller_id UUID NOT NULL REFERENCES marketplace_seller(id),
 actor_user_id UUID NOT NULL REFERENCES app_user(id),
 browser_hash TEXT NOT NULL CHECK(browser_hash ~ '^[a-f0-9]{64}$'),
 verifier_cipher TEXT,
 expires_at TIMESTAMPTZ NOT NULL, consumed_at TIMESTAMPTZ,
 invalidated_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK((consumed_at IS NULL AND verifier_cipher IS NOT NULL) OR (consumed_at IS NOT NULL AND verifier_cipher IS NULL))
);
CREATE INDEX IF NOT EXISTS idx_mp_oauth_seller ON marketplace_mp_oauth_attempt(seller_id,expires_at) WHERE consumed_at IS NULL;
INSERT INTO marketplace_schema_migration(version) VALUES('0007_marketplace_payment_oauth') ON CONFLICT DO NOTHING;
COMMIT;
