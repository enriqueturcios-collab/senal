-- ============================================================================
-- SEÑAL — TABLAS FALTANTES (migración)
-- Crea entrepreneur.proactive_offers y payments.plan_requests
-- ============================================================================

-- ---------------------------------------------------------------------------
-- PROACTIVE OFFERS  (ofertas proactivas de emprendedores en el marketplace)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS entrepreneur.proactive_offers (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID         NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
  profile_id       UUID         NOT NULL REFERENCES entrepreneur.profiles(id) ON DELETE CASCADE,
  title            TEXT         NOT NULL,
  description      TEXT,
  category_id      INT          REFERENCES app.categories(id),
  price            NUMERIC(12,2),
  max_price        NUMERIC(12,2),
  currency         TEXT         NOT NULL DEFAULT 'GTQ',
  condition        TEXT         NOT NULL DEFAULT 'service',
  tags_json        JSONB        NOT NULL DEFAULT '[]',
  images_json      JSONB        NOT NULL DEFAULT '[]',
  municipality_ids JSONB        NOT NULL DEFAULT '[]',
  expires_at       TIMESTAMPTZ,
  is_active        BOOLEAN      NOT NULL DEFAULT true,
  view_count       INT          NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proactive_offers_user     ON entrepreneur.proactive_offers(user_id);
CREATE INDEX IF NOT EXISTS idx_proactive_offers_category ON entrepreneur.proactive_offers(category_id);
CREATE INDEX IF NOT EXISTS idx_proactive_offers_active   ON entrepreneur.proactive_offers(is_active) WHERE is_active;

-- ---------------------------------------------------------------------------
-- PAYMENTS SCHEMA + PLAN REQUESTS  (solicitudes manuales de upgrade de plan)
-- ---------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS payments;

CREATE TABLE IF NOT EXISTS payments.plan_requests (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES app.users(id),
  from_plan     TEXT        NOT NULL,
  to_plan       TEXT        NOT NULL,
  amount_cents  INT         NOT NULL,
  currency      TEXT        NOT NULL DEFAULT 'gtq',
  proof_url     TEXT        NOT NULL,
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  status        TEXT        NOT NULL DEFAULT 'review',
  reviewed_by   UUID        REFERENCES app.users(id),
  review_note   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plan_requests_user   ON payments.plan_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_requests_status ON payments.plan_requests(status);
