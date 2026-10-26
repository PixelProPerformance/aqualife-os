-- Fase 3: aditiva, aplicação explícita após backup/restauro. Comércio continua bloqueado.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
CREATE TABLE IF NOT EXISTS marketplace_catalog_asset (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 seller_id UUID NOT NULL REFERENCES marketplace_seller(id),
 storage_key TEXT NOT NULL UNIQUE,
 bytes INT NOT NULL CHECK(bytes > 0),
 actor_user_id UUID NOT NULL REFERENCES app_user(id),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(id,seller_id)
);
CREATE TABLE IF NOT EXISTS marketplace_catalog_submission (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 seller_id UUID NOT NULL REFERENCES marketplace_seller(id),
 title TEXT NOT NULL, description TEXT NOT NULL, category TEXT NOT NULL,
 brand TEXT NOT NULL DEFAULT '', model TEXT NOT NULL DEFAULT '', gtin TEXT,
 image_asset_id UUID,
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','pending','approved','rejected')),
 revision INT NOT NULL DEFAULT 1 CHECK(revision > 0),
 review_note TEXT NOT NULL DEFAULT '',
 reviewed_by UUID REFERENCES app_user(id), reviewed_at TIMESTAMPTZ,
 catalog_product_id UUID REFERENCES marketplace_catalog_product(id),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 FOREIGN KEY(image_asset_id,seller_id) REFERENCES marketplace_catalog_asset(id,seller_id)
);
CREATE INDEX IF NOT EXISTS idx_mp_submission_seller ON marketplace_catalog_submission(seller_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mp_submission_queue ON marketplace_catalog_submission(status,created_at);
CREATE TABLE IF NOT EXISTS marketplace_catalog_detail (
 catalog_product_id UUID PRIMARY KEY REFERENCES marketplace_catalog_product(id),
 description TEXT NOT NULL, category TEXT NOT NULL,
 image_asset_id UUID REFERENCES marketplace_catalog_asset(id),
 withdrawal_note TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS marketplace_offer_detail (
 offer_id UUID PRIMARY KEY,
 seller_id UUID NOT NULL,
 variant_label TEXT NOT NULL DEFAULT '',
 revision INT NOT NULL DEFAULT 1 CHECK(revision > 0),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 FOREIGN KEY(offer_id,seller_id) REFERENCES marketplace_offer(id,seller_id)
);
CREATE TABLE IF NOT EXISTS marketplace_inventory_movement (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 offer_id UUID NOT NULL, seller_id UUID NOT NULL,
 before_qty INT NOT NULL CHECK(before_qty >= 0),
 after_qty INT NOT NULL CHECK(after_qty >= 0),
 delta INT NOT NULL CHECK(delta=after_qty-before_qty),
 reason TEXT NOT NULL,
 idempotency_key UUID NOT NULL,
 actor_user_id UUID NOT NULL REFERENCES app_user(id),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(seller_id,idempotency_key),
 FOREIGN KEY(offer_id,seller_id) REFERENCES marketplace_offer(id,seller_id)
);
CREATE INDEX IF NOT EXISTS idx_mp_inventory_history ON marketplace_inventory_movement(seller_id,created_at DESC);
INSERT INTO marketplace_schema_migration(version) VALUES ('0004_marketplace_catalog') ON CONFLICT DO NOTHING;
COMMIT;
