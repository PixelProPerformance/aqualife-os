-- Fase 4 aditiva. Preparação temporária; pagamentos e expedição bloqueados.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
CREATE TABLE IF NOT EXISTS marketplace_cart (
 buyer_user_id UUID PRIMARY KEY REFERENCES app_user(id),
 revision INT NOT NULL DEFAULT 1 CHECK(revision>0), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS marketplace_cart_item (
 buyer_user_id UUID NOT NULL REFERENCES marketplace_cart(buyer_user_id),
 offer_id UUID NOT NULL REFERENCES marketplace_offer(id), qty INT NOT NULL CHECK(qty BETWEEN 1 AND 99),
 price_cents BIGINT NOT NULL CHECK(price_cents>0), presentation_revision INT NOT NULL,
 PRIMARY KEY(buyer_user_id,offer_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_mp_order_buyer ON marketplace_order(id,buyer_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_mp_child_parent_seller ON marketplace_seller_order(id,marketplace_order_id,seller_id);
CREATE TABLE IF NOT EXISTS marketplace_order_preparation (
 order_id UUID PRIMARY KEY REFERENCES marketplace_order(id), buyer_user_id UUID NOT NULL REFERENCES app_user(id),
 idempotency_key UUID NOT NULL, cart_revision INT NOT NULL, request_digest TEXT NOT NULL,
 expires_at TIMESTAMPTZ NOT NULL, closed_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(buyer_user_id,idempotency_key),
 FOREIGN KEY(order_id,buyer_user_id) REFERENCES marketplace_order(id,buyer_user_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mp_preparation_active_buyer ON marketplace_order_preparation(buyer_user_id) WHERE closed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_mp_preparation_expiry ON marketplace_order_preparation(expires_at) WHERE closed_at IS NULL;
CREATE TABLE IF NOT EXISTS marketplace_stock_reservation (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), order_id UUID NOT NULL REFERENCES marketplace_order_preparation(order_id),
 seller_order_id UUID NOT NULL, seller_id UUID NOT NULL, offer_id UUID NOT NULL,
 qty INT NOT NULL CHECK(qty BETWEEN 1 AND 99),
 state TEXT NOT NULL DEFAULT 'active' CHECK(state IN ('active','cancelled','expired')),
 released_at TIMESTAMPTZ,
 FOREIGN KEY(seller_order_id,seller_id) REFERENCES marketplace_seller_order(id,seller_id),
 FOREIGN KEY(seller_order_id,order_id,seller_id) REFERENCES marketplace_seller_order(id,marketplace_order_id,seller_id),
 FOREIGN KEY(offer_id,seller_id) REFERENCES marketplace_offer(id,seller_id),
 UNIQUE(order_id,offer_id), CHECK((state='active')=(released_at IS NULL))
);
CREATE INDEX IF NOT EXISTS idx_mp_reservation_child ON marketplace_stock_reservation(seller_order_id,state);
CREATE TABLE IF NOT EXISTS marketplace_preparation_event (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), seller_order_id UUID NOT NULL, seller_id UUID NOT NULL,
 actor_user_id UUID REFERENCES app_user(id), action TEXT NOT NULL, note TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 FOREIGN KEY(seller_order_id,seller_id) REFERENCES marketplace_seller_order(id,seller_id)
);
INSERT INTO marketplace_schema_migration(version) VALUES('0006_marketplace_cart_reservations') ON CONFLICT DO NOTHING;
COMMIT;
