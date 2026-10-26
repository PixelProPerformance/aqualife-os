-- Additive historical cross-references. Legacy checkout remains authoritative.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
CREATE TABLE IF NOT EXISTS marketplace_legacy_import (
 source_key TEXT PRIMARY KEY CHECK(source_key='aqualife_legacy'),
 seller_id UUID NOT NULL UNIQUE REFERENCES marketplace_seller(id),
 source_fingerprint TEXT NOT NULL CHECK(length(source_fingerprint)=64),
 counts JSONB NOT NULL,
 imported_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS marketplace_legacy_offer (
 legacy_variation_id UUID PRIMARY KEY REFERENCES loja_variacao(id) ON DELETE RESTRICT,
 offer_id UUID NOT NULL UNIQUE,
 seller_id UUID NOT NULL REFERENCES marketplace_seller(id),
 source_sku TEXT, source_price_cents BIGINT NOT NULL,
 source_stock INT NOT NULL, source_active BOOLEAN,
 FOREIGN KEY(offer_id,seller_id) REFERENCES marketplace_offer(id,seller_id)
);
CREATE TABLE IF NOT EXISTS marketplace_legacy_order (
 legacy_order_id UUID PRIMARY KEY REFERENCES loja_pedido(id) ON DELETE RESTRICT,
 seller_id UUID NOT NULL REFERENCES marketplace_seller(id),
 commercial_snapshot JSONB NOT NULL,
 UNIQUE(legacy_order_id,seller_id)
);
CREATE TABLE IF NOT EXISTS marketplace_legacy_order_item (
 legacy_item_id UUID PRIMARY KEY REFERENCES loja_pedido_item(id) ON DELETE RESTRICT,
 legacy_order_id UUID NOT NULL,
 seller_id UUID NOT NULL REFERENCES marketplace_seller(id),
 offer_id UUID,
 commercial_snapshot JSONB NOT NULL,
 FOREIGN KEY(legacy_order_id,seller_id) REFERENCES marketplace_legacy_order(legacy_order_id,seller_id),
 FOREIGN KEY(offer_id,seller_id) REFERENCES marketplace_offer(id,seller_id)
);
CREATE TABLE IF NOT EXISTS marketplace_legacy_stock_movement (
 legacy_movement_id UUID PRIMARY KEY REFERENCES estoque_mov(id) ON DELETE RESTRICT,
 seller_id UUID NOT NULL REFERENCES marketplace_seller(id),
 offer_id UUID NOT NULL,
 movement_snapshot JSONB NOT NULL,
 FOREIGN KEY(offer_id,seller_id) REFERENCES marketplace_offer(id,seller_id)
);
INSERT INTO marketplace_schema_migration(version) VALUES('0002_marketplace_legacy_archive') ON CONFLICT DO NOTHING;
COMMIT;
