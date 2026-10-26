-- Read-only marketplace preview; no offer is activated by this migration.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
ALTER TABLE marketplace_catalog_submission ADD COLUMN IF NOT EXISTS technical_attributes JSONB NOT NULL DEFAULT '{}';
ALTER TABLE marketplace_catalog_detail ADD COLUMN IF NOT EXISTS technical_attributes JSONB NOT NULL DEFAULT '{}';
CREATE TABLE IF NOT EXISTS marketplace_public_profile (
 seller_id UUID PRIMARY KEY REFERENCES marketplace_seller(id),
 biography TEXT NOT NULL DEFAULT '', city TEXT NOT NULL DEFAULT '', state TEXT NOT NULL DEFAULT '',
 consent BOOLEAN NOT NULL DEFAULT false, revision INT NOT NULL DEFAULT 1,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS marketplace_offer_presentation (
 offer_id UUID PRIMARY KEY, seller_id UUID NOT NULL,
 warranty TEXT NOT NULL DEFAULT '', handling_days INT NOT NULL DEFAULT 2 CHECK(handling_days BETWEEN 0 AND 60),
 conditions TEXT NOT NULL DEFAULT '', revision INT NOT NULL DEFAULT 1,
 review_status TEXT NOT NULL DEFAULT 'draft' CHECK(review_status IN ('draft','pending','approved','rejected')),
 review_note TEXT NOT NULL DEFAULT '', reviewed_by UUID REFERENCES app_user(id), reviewed_at TIMESTAMPTZ,
 FOREIGN KEY(offer_id,seller_id) REFERENCES marketplace_offer(id,seller_id)
);
CREATE OR REPLACE FUNCTION marketplace_invalidate_preview() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 UPDATE marketplace_offer_presentation SET review_status='draft',revision=revision+1,review_note='',reviewed_by=NULL,reviewed_at=NULL WHERE offer_id=NEW.id;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS marketplace_preview_changed ON marketplace_offer;
CREATE TRIGGER marketplace_preview_changed AFTER UPDATE OF seller_sku,price_cents,status ON marketplace_offer
 FOR EACH ROW EXECUTE FUNCTION marketplace_invalidate_preview();
CREATE INDEX IF NOT EXISTS idx_marketplace_preview_queue ON marketplace_offer_presentation(review_status,offer_id);
CREATE TABLE IF NOT EXISTS marketplace_legacy_catalog_review (
 legacy_product_id UUID PRIMARY KEY REFERENCES loja_produto(id),
 catalog_product_id UUID NOT NULL REFERENCES marketplace_catalog_product(id),
 source_snapshot JSONB NOT NULL, evidence TEXT NOT NULL,
 reviewed_by UUID NOT NULL REFERENCES app_user(id), reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO marketplace_schema_migration(version) VALUES('0005_marketplace_showcase') ON CONFLICT DO NOTHING;
COMMIT;
