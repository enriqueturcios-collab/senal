-- ============================================================================
-- SEÑAL — ENTREPRENEUR SCHEMA  v1.0
-- Capa operativa para vendedores, freelancers y pequeños negocios.
-- IMPORTANTE: No contiene datos institucionales ni reportes bancarios.
-- Los emprendedores NUNCA acceden a b2b.* ni a dashboards institucionales.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS entrepreneur;

-- ---------------------------------------------------------------------------
-- PLAN DEFINITIONS  (source of truth de precios y límites)
-- Los precios son en centavos (GTQ). 4900 = Q49.00
-- ---------------------------------------------------------------------------
CREATE TABLE entrepreneur.plan_definitions (
  id                  SERIAL      PRIMARY KEY,
  plan                TEXT        NOT NULL UNIQUE,
  name                TEXT        NOT NULL,
  monthly_price_cents INT         NOT NULL DEFAULT 0,
  currency            TEXT        NOT NULL DEFAULT 'GTQ',
  description         TEXT,
  limits_json         JSONB       NOT NULL DEFAULT '{}',
  features_json       JSONB       NOT NULL DEFAULT '[]',
  is_active           BOOLEAN     NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- ENTREPRENEUR PROFILES
-- ---------------------------------------------------------------------------
CREATE TABLE entrepreneur.profiles (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID         NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
  business_name         TEXT,
  business_type         TEXT,
  description           TEXT,
  primary_category_ids  INT[]        NOT NULL DEFAULT '{}',
  service_zones_json    JSONB        NOT NULL DEFAULT '[]',
  default_location      TEXT,
  response_preference   TEXT         NOT NULL DEFAULT 'manual',
  accepts_auto_drafts   BOOLEAN      NOT NULL DEFAULT false,
  accepts_semi_auto     BOOLEAN      NOT NULL DEFAULT false,
  reputation_score      NUMERIC(4,2) NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- ---------------------------------------------------------------------------
-- SUBSCRIPTIONS
-- ---------------------------------------------------------------------------
CREATE TABLE entrepreneur.subscriptions (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID        NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
  plan                     TEXT        NOT NULL DEFAULT 'free',
  status                   TEXT        NOT NULL DEFAULT 'active',
  current_period_start     TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end       TIMESTAMPTZ,
  cancel_at_period_end     BOOLEAN     NOT NULL DEFAULT false,
  billing_provider         TEXT,
  billing_customer_id      TEXT,
  billing_subscription_id  TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- ---------------------------------------------------------------------------
-- INVENTORY ITEMS
-- ---------------------------------------------------------------------------
CREATE TABLE entrepreneur.inventory_items (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID         NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
  profile_id        UUID         NOT NULL REFERENCES entrepreneur.profiles(id) ON DELETE CASCADE,
  sku               TEXT,
  title             TEXT         NOT NULL,
  description       TEXT,
  category_id       INT          REFERENCES app.categories(id),
  price             NUMERIC(12,2),
  min_price         NUMERIC(12,2),
  currency          TEXT         NOT NULL DEFAULT 'GTQ',
  stock_quantity    INT          NOT NULL DEFAULT 1,
  condition         TEXT         NOT NULL DEFAULT 'new',
  location          TEXT,
  service_area_json JSONB,
  images_json       JSONB        NOT NULL DEFAULT '[]',
  tags_json         JSONB        NOT NULL DEFAULT '[]',
  is_active         BOOLEAN      NOT NULL DEFAULT true,
  external_id       TEXT,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_inv_user     ON entrepreneur.inventory_items(user_id);
CREATE INDEX idx_inv_category ON entrepreneur.inventory_items(category_id);
CREATE INDEX idx_inv_active   ON entrepreneur.inventory_items(is_active) WHERE is_active;

-- ---------------------------------------------------------------------------
-- ALERT RULES
-- ---------------------------------------------------------------------------
CREATE TABLE entrepreneur.alert_rules (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
  profile_id      UUID        NOT NULL REFERENCES entrepreneur.profiles(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  category_ids    INT[]       NOT NULL DEFAULT '{}',
  keywords        TEXT[]      NOT NULL DEFAULT '{}',
  location_json   JSONB       NOT NULL DEFAULT '{}',
  min_budget      NUMERIC(12,2),
  max_budget      NUMERIC(12,2),
  urgency_levels  TEXT[]      NOT NULL DEFAULT '{}',
  min_match_score INT         NOT NULL DEFAULT 50,
  frequency       TEXT        NOT NULL DEFAULT 'daily',
  channel         TEXT        NOT NULL DEFAULT 'in_app',
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- OPPORTUNITY MATCHES  (demand ↔ entrepreneur)
-- ---------------------------------------------------------------------------
CREATE TABLE entrepreneur.opportunity_matches (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
  profile_id        UUID        NOT NULL REFERENCES entrepreneur.profiles(id) ON DELETE CASCADE,
  demand_id         UUID        NOT NULL REFERENCES app.demands(id) ON DELETE CASCADE,
  inventory_item_id UUID        REFERENCES entrepreneur.inventory_items(id),
  match_type        TEXT        NOT NULL DEFAULT 'profile_match',
  match_score       INT         NOT NULL DEFAULT 0,
  match_reasons     JSONB       NOT NULL DEFAULT '[]',
  category_fit      INT         NOT NULL DEFAULT 0,
  location_fit      INT         NOT NULL DEFAULT 0,
  price_fit         INT         NOT NULL DEFAULT 0,
  urgency_fit       INT         NOT NULL DEFAULT 0,
  availability_fit  INT         NOT NULL DEFAULT 0,
  status            TEXT        NOT NULL DEFAULT 'new',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, demand_id)
);

CREATE INDEX idx_matches_user   ON entrepreneur.opportunity_matches(user_id, status);
CREATE INDEX idx_matches_demand ON entrepreneur.opportunity_matches(demand_id);
CREATE INDEX idx_matches_score  ON entrepreneur.opportunity_matches(match_score DESC);

-- ---------------------------------------------------------------------------
-- OFFER DRAFTS
-- ---------------------------------------------------------------------------
CREATE TABLE entrepreneur.offer_drafts (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES app.users(id),
  profile_id        UUID        NOT NULL REFERENCES entrepreneur.profiles(id),
  demand_id         UUID        NOT NULL REFERENCES app.demands(id),
  inventory_item_id UUID        REFERENCES entrepreneur.inventory_items(id),
  suggested_price   NUMERIC(12,2),
  suggested_message TEXT,
  suggested_days    INT,
  confidence_score  INT         NOT NULL DEFAULT 0,
  reasons           JSONB       NOT NULL DEFAULT '[]',
  status            TEXT        NOT NULL DEFAULT 'draft',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- FULFILLMENT RULES  (Scale only)
-- ---------------------------------------------------------------------------
CREATE TABLE entrepreneur.fulfillment_rules (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID        NOT NULL REFERENCES app.users(id),
  profile_id              UUID        NOT NULL REFERENCES entrepreneur.profiles(id),
  name                    TEXT        NOT NULL,
  category_ids            INT[]       NOT NULL DEFAULT '{}',
  location_json           JSONB       NOT NULL DEFAULT '{}',
  min_match_score         INT         NOT NULL DEFAULT 70,
  min_price               NUMERIC(12,2),
  max_price               NUMERIC(12,2),
  require_stock           BOOLEAN     NOT NULL DEFAULT true,
  max_auto_drafts_day     INT         NOT NULL DEFAULT 10,
  max_auto_sends_day      INT         NOT NULL DEFAULT 0,
  auto_draft_enabled      BOOLEAN     NOT NULL DEFAULT false,
  auto_send_enabled       BOOLEAN     NOT NULL DEFAULT false,
  human_approval_required BOOLEAN     NOT NULL DEFAULT true,
  message_template        TEXT,
  is_active               BOOLEAN     NOT NULL DEFAULT true,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- FEATURE USAGE  (tracking mensual de límites)
-- ---------------------------------------------------------------------------
CREATE TABLE entrepreneur.feature_usage (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES app.users(id),
  feature_key  TEXT        NOT NULL,
  usage_count  INT         NOT NULL DEFAULT 0,
  period_start TIMESTAMPTZ NOT NULL,
  period_end   TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, feature_key, period_start)
);

-- ---------------------------------------------------------------------------
-- TEAM MEMBERS  (Scale only)
-- ---------------------------------------------------------------------------
CREATE TABLE entrepreneur.team_members (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID        NOT NULL REFERENCES entrepreneur.profiles(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES app.users(id),
  role        TEXT        NOT NULL DEFAULT 'sales_agent',
  invited_by  UUID        REFERENCES app.users(id),
  status      TEXT        NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id, user_id)
);

-- ============================================================================
-- SEED: PLAN DEFINITIONS
-- Precios editables desde aquí sin tocar código.
-- ============================================================================
INSERT INTO entrepreneur.plan_definitions
  (plan, name, monthly_price_cents, currency, description, limits_json, features_json)
VALUES
('free', 'Marketplace Basic', 0, 'GTQ',
  'Probá Signal como marketplace básico. Sin costo.',
  '{"monthly_offer_responses":5,"inventory_items":0,"alert_rules":0,"categories":1,"zones":1,"team_members":0}',
  '["marketplace_basic","demand_response"]'),

('starter', 'Entrepreneur Starter', 4900, 'GTQ',
  'Recibí alertas de demanda y encontrá tus primeras oportunidades.',
  '{"monthly_offer_responses":30,"inventory_items":30,"alert_rules":3,"categories":3,"zones":3,"team_members":0}',
  '["marketplace_basic","demand_response","opportunity_inbox","demand_alerts","alert_rules","inventory_manager","inventory_demand_matching","market_pulse_lite","own_analytics_basic"]'),

('growth', 'Entrepreneur Growth', 14900, 'GTQ',
  'Conectá inventario, generá ofertas más rápido y entendé qué pide tu mercado.',
  '{"monthly_offer_responses":150,"inventory_items":250,"alert_rules":10,"categories":10,"zones":10,"team_members":0}',
  '["marketplace_basic","demand_response","opportunity_inbox","demand_alerts","alert_rules","inventory_manager","inventory_csv_import","inventory_demand_matching","fulfillment_assistant","offer_auto_draft","market_pulse_pro","own_analytics_advanced","own_data_export"]'),

('scale', 'Entrepreneur Scale', 39900, 'GTQ',
  'Convertí Signal en un motor de ventas con equipo, reglas y fulfillment semi-automatizado.',
  '{"monthly_offer_responses":500,"inventory_items":2000,"alert_rules":50,"categories":30,"zones":30,"team_members":5}',
  '["marketplace_basic","demand_response","opportunity_inbox","demand_alerts","alert_rules","inventory_manager","inventory_csv_import","inventory_demand_matching","fulfillment_assistant","offer_auto_draft","market_pulse_advanced","own_analytics_advanced","own_data_export","team_users"]');

-- ============================================================================
-- SEED: DEMO USERS  (contraseña: demo123)
-- bcrypt hash de "demo123":
-- $2b$10$rOsKzmjMoRNn3B5M0DTtpu0TXR7t.1QHJ8FVnmrMEf2GJXL1hXECa
-- ============================================================================
INSERT INTO app.users (email, password_hash, display_name, role, status, consent_analytics, consent_b2b_aggregate)
VALUES
  ('free_seller@demo.gt',    '$2b$10$rOsKzmjMoRNn3B5M0DTtpu0TXR7t.1QHJ8FVnmrMEf2GJXL1hXECa',
   'Usuario Free',           'seller', 'active', 'granted', 'granted'),
  ('starter_seller@demo.gt', '$2b$10$rOsKzmjMoRNn3B5M0DTtpu0TXR7t.1QHJ8FVnmrMEf2GJXL1hXECa',
   'Heladería San Marcos',   'seller', 'active', 'granted', 'granted'),
  ('growth_seller@demo.gt',  '$2b$10$rOsKzmjMoRNn3B5M0DTtpu0TXR7t.1QHJ8FVnmrMEf2GJXL1hXECa',
   'TecnoFix GT',            'seller', 'active', 'granted', 'granted'),
  ('scale_seller@demo.gt',   '$2b$10$rOsKzmjMoRNn3B5M0DTtpu0TXR7t.1QHJ8FVnmrMEf2GJXL1hXECa',
   'Carpintería El Cedro',   'seller', 'active', 'granted', 'granted')
ON CONFLICT (email) DO NOTHING;

-- Perfiles
INSERT INTO entrepreneur.profiles (user_id, business_name, business_type, description, primary_category_ids)
SELECT u.id,
  CASE u.email
    WHEN 'free_seller@demo.gt'    THEN 'Usuario Free'
    WHEN 'starter_seller@demo.gt' THEN 'Heladería San Marcos'
    WHEN 'growth_seller@demo.gt'  THEN 'TecnoFix GT'
    WHEN 'scale_seller@demo.gt'   THEN 'Carpintería El Cedro'
  END,
  CASE u.email
    WHEN 'free_seller@demo.gt'    THEN 'freelancer'
    WHEN 'starter_seller@demo.gt' THEN 'food'
    WHEN 'growth_seller@demo.gt'  THEN 'tech_repair'
    WHEN 'scale_seller@demo.gt'   THEN 'services'
  END,
  CASE u.email
    WHEN 'free_seller@demo.gt'    THEN 'Cuenta demo del plan Free.'
    WHEN 'starter_seller@demo.gt' THEN 'Helados artesanales para eventos y celebraciones en Guatemala.'
    WHEN 'growth_seller@demo.gt'  THEN 'Reparación de celulares y accesorios en Villa Nueva y Ciudad de Guatemala.'
    WHEN 'scale_seller@demo.gt'   THEN 'Carpintería, reparación de puertas y muebles a medida en Mixco.'
  END,
  CASE u.email
    WHEN 'starter_seller@demo.gt' THEN '{905,906}'
    WHEN 'growth_seller@demo.gt'  THEN '{910,911}'
    WHEN 'scale_seller@demo.gt'   THEN '{917,207}'
    ELSE '{}'
  END
FROM app.users u
WHERE u.email IN ('free_seller@demo.gt','starter_seller@demo.gt','growth_seller@demo.gt','scale_seller@demo.gt')
ON CONFLICT (user_id) DO NOTHING;

-- Suscripciones
INSERT INTO entrepreneur.subscriptions (user_id, plan, status, current_period_start, current_period_end)
SELECT u.id,
  CASE u.email
    WHEN 'free_seller@demo.gt'    THEN 'free'
    WHEN 'starter_seller@demo.gt' THEN 'starter'
    WHEN 'growth_seller@demo.gt'  THEN 'growth'
    WHEN 'scale_seller@demo.gt'   THEN 'scale'
  END,
  'active', now(), now() + interval '30 days'
FROM app.users u
WHERE u.email IN ('free_seller@demo.gt','starter_seller@demo.gt','growth_seller@demo.gt','scale_seller@demo.gt')
ON CONFLICT (user_id) DO NOTHING;

-- Inventario de growth_seller (TecnoFix GT)
INSERT INTO entrepreneur.inventory_items
  (user_id, profile_id, title, description, category_id, price, currency, stock_quantity, condition, tags_json)
SELECT u.id, p.id, v.title, v.descr, v.cat_id, v.price, 'GTQ', v.stock, 'new', v.tags::jsonb
FROM app.users u
JOIN entrepreneur.profiles p ON p.user_id = u.id
CROSS JOIN (VALUES
  ('Cambio de pantalla iPhone',  'Reparación de pantalla rota para todos los modelos iPhone. Garantía 90 días.', 910, 350, 5,  '["pantalla","iphone","reparacion","celular"]'),
  ('Cambio de batería iPhone',   'Reemplazo de batería desgastada o dañada. Garantía 90 días.',                  910, 180, 10, '["bateria","iphone","reparacion","celular"]'),
  ('Reparación puerto de carga', 'Limpieza y reparación del puerto de carga para cualquier marca de celular.',   910, 120, 8,  '["carga","puerto","reparacion","celular"]')
) AS v(title, descr, cat_id, price, stock, tags)
WHERE u.email = 'growth_seller@demo.gt';

-- Inventario de starter_seller (Heladería San Marcos)
INSERT INTO entrepreneur.inventory_items
  (user_id, profile_id, title, description, category_id, price, currency, stock_quantity, condition, tags_json)
SELECT u.id, p.id, v.title, v.descr, v.cat_id, v.price, 'GTQ', v.stock, 'new', v.tags::jsonb
FROM app.users u
JOIN entrepreneur.profiles p ON p.user_id = u.id
CROSS JOIN (VALUES
  ('Paquete helados para eventos', 'Paquete de 50 helados artesanales ideales para cumpleaños y eventos.',  905, 250, 20, '["helados","eventos","artesanal","postre"]'),
  ('Carrito de helados',           'Renta de carrito con operador para eventos de 2-4 horas en la ciudad.', 905, 450, 3,  '["carrito","helados","renta","eventos"]')
) AS v(title, descr, cat_id, price, stock, tags)
WHERE u.email = 'starter_seller@demo.gt';

-- Inventario de scale_seller (Carpintería El Cedro)
INSERT INTO entrepreneur.inventory_items
  (user_id, profile_id, title, description, category_id, price, currency, stock_quantity, condition, tags_json)
SELECT u.id, p.id, v.title, v.descr, v.cat_id, v.price, 'GTQ', v.stock, 'new', v.tags::jsonb
FROM app.users u
JOIN entrepreneur.profiles p ON p.user_id = u.id
CROSS JOIN (VALUES
  ('Reparación de puerta',     'Reparación de puertas de madera: bisagras, marco, cierre y acabado.',       917, 200, 10, '["puerta","carpinteria","reparacion","madera"]'),
  ('Instalación de cerradura', 'Instalación de cerraduras de seguridad para puertas interiores/exteriores.',917, 150, 15, '["cerradura","seguridad","instalacion"]'),
  ('Mueble a medida',          'Fabricación de muebles de madera a medida según planos del cliente.',       917, 800, 2,  '["mueble","madera","medida","carpinteria"]')
) AS v(title, descr, cat_id, price, stock, tags)
WHERE u.email = 'scale_seller@demo.gt';
