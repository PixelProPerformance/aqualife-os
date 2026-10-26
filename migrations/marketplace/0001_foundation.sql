-- Fase 1: fundação aditiva; executar apenas em PostgreSQL isolado após backup.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS marketplace_schema_migration (
 version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS marketplace_seller (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 legal_name TEXT NOT NULL,
 trade_name TEXT NOT NULL,
 cnpj TEXT UNIQUE,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','suspended','rejected')),
 is_platform_owned BOOLEAN NOT NULL DEFAULT false,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK(cnpj IS NULL OR cnpj ~ '^[0-9]{14}$')
);
CREATE TABLE IF NOT EXISTS marketplace_seller_user (
 seller_id UUID NOT NULL REFERENCES marketplace_seller(id) ON DELETE RESTRICT,
 user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE RESTRICT,
 role TEXT NOT NULL CHECK(role IN ('owner','staff')),
 active BOOLEAN NOT NULL DEFAULT true,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(seller_id,user_id)
);
CREATE INDEX IF NOT EXISTS idx_marketplace_member_user ON marketplace_seller_user(user_id,seller_id) WHERE active;
CREATE TABLE IF NOT EXISTS marketplace_seller_address (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 seller_id UUID NOT NULL REFERENCES marketplace_seller(id),
 label TEXT NOT NULL DEFAULT 'Origem',
 zip_code TEXT NOT NULL, street TEXT NOT NULL, number TEXT, city TEXT NOT NULL, state TEXT NOT NULL,
 is_default BOOLEAN NOT NULL DEFAULT false,
 created_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_marketplace_seller_default_address ON marketplace_seller_address(seller_id) WHERE is_default;
CREATE TABLE IF NOT EXISTS marketplace_seller_settings (
 seller_id UUID PRIMARY KEY REFERENCES marketplace_seller(id),
 handling_days INT NOT NULL DEFAULT 2 CHECK(handling_days BETWEEN 0 AND 60),
 accepting_orders BOOLEAN NOT NULL DEFAULT false,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS marketplace_catalog_product (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 legacy_product_id UUID UNIQUE REFERENCES loja_produto(id) ON DELETE RESTRICT,
 title TEXT NOT NULL, brand TEXT, model TEXT, gtin TEXT,
 moderation_status TEXT NOT NULL DEFAULT 'pending' CHECK(moderation_status IN ('pending','approved','rejected')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mp_catalog_gtin ON marketplace_catalog_product(gtin) WHERE gtin IS NOT NULL;
CREATE TABLE IF NOT EXISTS marketplace_offer (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 seller_id UUID NOT NULL REFERENCES marketplace_seller(id) ON DELETE RESTRICT,
 catalog_product_id UUID NOT NULL REFERENCES marketplace_catalog_product(id) ON DELETE RESTRICT,
 legacy_variation_id UUID UNIQUE REFERENCES loja_variacao(id) ON DELETE RESTRICT,
 seller_sku TEXT NOT NULL,
 price_cents BIGINT NOT NULL CHECK(price_cents >= 0),
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','active','suspended')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(seller_id,seller_sku),
 UNIQUE(id,seller_id)
);
CREATE INDEX IF NOT EXISTS idx_mp_offer_catalog ON marketplace_offer(catalog_product_id,status);
CREATE TABLE IF NOT EXISTS marketplace_offer_inventory (
 offer_id UUID PRIMARY KEY REFERENCES marketplace_offer(id) ON DELETE RESTRICT,
 available_qty INT NOT NULL DEFAULT 0 CHECK(available_qty >= 0),
 reserved_qty INT NOT NULL DEFAULT 0 CHECK(reserved_qty >= 0),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS marketplace_order (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 buyer_user_id UUID REFERENCES app_user(id),
 state TEXT NOT NULL DEFAULT 'draft',
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS marketplace_seller_order (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 marketplace_order_id UUID NOT NULL REFERENCES marketplace_order(id),
 seller_id UUID NOT NULL REFERENCES marketplace_seller(id),
 state TEXT NOT NULL DEFAULT 'draft', currency CHAR(3) NOT NULL DEFAULT 'BRL',
 subtotal_cents BIGINT NOT NULL DEFAULT 0 CHECK(subtotal_cents >= 0),
 shipping_cents BIGINT NOT NULL DEFAULT 0 CHECK(shipping_cents >= 0),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(id,seller_id)
);
CREATE INDEX IF NOT EXISTS idx_mp_seller_order_seller ON marketplace_seller_order(seller_id,created_at DESC);
CREATE TABLE IF NOT EXISTS marketplace_seller_order_item (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 seller_order_id UUID NOT NULL REFERENCES marketplace_seller_order(id),
 offer_id UUID NOT NULL REFERENCES marketplace_offer(id),
 seller_id UUID NOT NULL REFERENCES marketplace_seller(id),
 product_snapshot JSONB NOT NULL, unit_price_cents BIGINT NOT NULL CHECK(unit_price_cents >= 0),
 qty INT NOT NULL CHECK(qty > 0),
 FOREIGN KEY (seller_order_id,seller_id) REFERENCES marketplace_seller_order(id,seller_id),
 FOREIGN KEY (offer_id,seller_id) REFERENCES marketplace_offer(id,seller_id)
);
CREATE TABLE IF NOT EXISTS marketplace_payment (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 seller_order_id UUID NOT NULL REFERENCES marketplace_seller_order(id),
 provider TEXT NOT NULL, provider_payment_id TEXT,
 idempotency_key TEXT NOT NULL UNIQUE, state TEXT NOT NULL DEFAULT 'pending',
 amount_cents BIGINT NOT NULL CHECK(amount_cents >= 0),
 created_at TIMESTAMPTZ DEFAULT now(),
 UNIQUE(provider,provider_payment_id)
);
CREATE TABLE IF NOT EXISTS marketplace_commission (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 payment_id UUID NOT NULL REFERENCES marketplace_payment(id),
 amount_cents BIGINT NOT NULL CHECK(amount_cents >= 0),
 created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS marketplace_shipping (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 seller_order_id UUID NOT NULL REFERENCES marketplace_seller_order(id),
 origin_address_id UUID REFERENCES marketplace_seller_address(id),
 state TEXT NOT NULL DEFAULT 'pending',
 tracking_code TEXT, created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS marketplace_fiscal_document (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 seller_order_id UUID NOT NULL REFERENCES marketplace_seller_order(id),
 issuer_seller_id UUID NOT NULL REFERENCES marketplace_seller(id),
 document_type TEXT NOT NULL, reference TEXT,
 created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS marketplace_audit_log (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 seller_id UUID REFERENCES marketplace_seller(id),
 actor_user_id UUID REFERENCES app_user(id),
 action TEXT NOT NULL, resource_type TEXT NOT NULL, resource_id UUID,
 metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mp_audit_seller ON marketplace_audit_log(seller_id,created_at DESC);
-- Sem backfill automático: preservar histórico existente e realizar conciliação por lote.
INSERT INTO marketplace_schema_migration(version) VALUES ('0001_marketplace_foundation') ON CONFLICT(version) DO NOTHING;
COMMIT;
