-- =============================================================================
-- SEÑAL — SCHEMA TRANSACCIONAL (app)
-- Capa de operaciones de la plataforma.
-- NUNCA exponer directamente a clientes B2B ni al warehouse sin anonimización.
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS app;

-- ---------------------------------------------------------------------------
-- TIPOS ENUMERADOS
-- ---------------------------------------------------------------------------

CREATE TYPE app.user_role          AS ENUM ('buyer', 'seller', 'both');
CREATE TYPE app.user_status        AS ENUM ('active', 'suspended', 'anonymized', 'deleted');
CREATE TYPE app.demand_status      AS ENUM ('draft', 'open', 'in_progress', 'closed', 'expired', 'cancelled');
CREATE TYPE app.urgency_level      AS ENUM ('low', 'medium', 'high', 'immediate');
CREATE TYPE app.offer_status       AS ENUM ('sent', 'viewed', 'accepted', 'rejected', 'withdrawn', 'expired');
CREATE TYPE app.transaction_status AS ENUM ('pending', 'confirmed', 'completed', 'disputed', 'refunded', 'cancelled');
CREATE TYPE app.rating_type        AS ENUM ('buyer_rates_seller', 'seller_rates_buyer');
CREATE TYPE app.consent_status     AS ENUM ('granted', 'denied', 'pending', 'withdrawn');

-- ---------------------------------------------------------------------------
-- GEOGRAFÍA
-- ---------------------------------------------------------------------------

CREATE TABLE app.countries (
    id          SERIAL PRIMARY KEY,
    code        CHAR(2)      NOT NULL UNIQUE,  -- ISO 3166-1 alpha-2
    name        VARCHAR(100) NOT NULL,
    is_active   BOOLEAN      NOT NULL DEFAULT true
);

CREATE TABLE app.departments (
    id          SERIAL PRIMARY KEY,
    country_id  INT          NOT NULL REFERENCES app.countries(id),
    name        VARCHAR(100) NOT NULL,
    code        VARCHAR(10),
    is_active   BOOLEAN      NOT NULL DEFAULT true,
    UNIQUE (country_id, name)
);

CREATE TABLE app.municipalities (
    id              SERIAL PRIMARY KEY,
    department_id   INT          NOT NULL REFERENCES app.departments(id),
    name            VARCHAR(100) NOT NULL,
    is_active       BOOLEAN      NOT NULL DEFAULT true,
    UNIQUE (department_id, name)
);

CREATE TABLE app.zones (
    id                  SERIAL PRIMARY KEY,
    municipality_id     INT           NOT NULL REFERENCES app.municipalities(id),
    name                VARCHAR(100)  NOT NULL,
    zone_type           VARCHAR(50),  -- colonia, zona, aldea, cantón, barrio
    lat_centroid        DECIMAL(9,6),
    lng_centroid        DECIMAL(9,6),
    is_active           BOOLEAN       NOT NULL DEFAULT true
);

CREATE INDEX idx_zones_municipality ON app.zones(municipality_id);

-- ---------------------------------------------------------------------------
-- CATEGORÍAS (árbol, autorreferenciado)
-- ---------------------------------------------------------------------------

CREATE TABLE app.categories (
    id          SERIAL PRIMARY KEY,
    parent_id   INT          REFERENCES app.categories(id) ON DELETE RESTRICT,
    name        VARCHAR(100) NOT NULL,
    slug        VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon_url    VARCHAR(255),
    sort_order  INT          NOT NULL DEFAULT 0,
    is_active   BOOLEAN      NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_categories_parent    ON app.categories(parent_id);
CREATE INDEX idx_categories_slug      ON app.categories(slug);
CREATE INDEX idx_categories_active    ON app.categories(is_active) WHERE is_active = true;

-- ---------------------------------------------------------------------------
-- USUARIOS
-- ---------------------------------------------------------------------------

CREATE TABLE app.users (
    id                      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identificadores — cifrados en reposo (app-level encryption recomendada)
    email                   VARCHAR(320) NOT NULL UNIQUE,
    password_hash           VARCHAR(255),
    email_verified          BOOLEAN      NOT NULL DEFAULT false,
    phone                   VARCHAR(30),
    phone_verified          BOOLEAN      NOT NULL DEFAULT false,

    display_name            VARCHAR(80)  NOT NULL,
    avatar_url              VARCHAR(500),
    bio                     TEXT,

    role                    app.user_role   NOT NULL DEFAULT 'buyer',
    status                  app.user_status NOT NULL DEFAULT 'active',

    -- Geolocalización base (solo si el usuario la comparte)
    default_zone_id         INT REFERENCES app.zones(id),

    -- Consentimientos — cada campo tiene su propia granularidad
    consent_analytics       app.consent_status NOT NULL DEFAULT 'pending',
    consent_b2b_aggregate   app.consent_status NOT NULL DEFAULT 'pending',
    consent_individual      app.consent_status NOT NULL DEFAULT 'denied',  -- fase 2
    consent_updated_at      TIMESTAMPTZ,

    -- Metadatos de ciclo de vida
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_active_at          TIMESTAMPTZ,
    anonymized_at           TIMESTAMPTZ,  -- seteado cuando ejerce derecho al olvido
    deleted_at              TIMESTAMPTZ
);

CREATE INDEX idx_users_status       ON app.users(status);
CREATE INDEX idx_users_role         ON app.users(role);
CREATE INDEX idx_users_created_at   ON app.users(created_at);
CREATE INDEX idx_users_last_active  ON app.users(last_active_at);

-- Historial de cambios de consentimiento (auditoría obligatoria)
CREATE TABLE app.user_consent_log (
    id              BIGSERIAL   PRIMARY KEY,
    user_id         UUID        NOT NULL REFERENCES app.users(id),
    consent_type    VARCHAR(50) NOT NULL,  -- analytics | b2b_aggregate | individual
    previous_status app.consent_status,
    new_status      app.consent_status NOT NULL,
    changed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    ip_hash         VARCHAR(64),
    user_agent_hash VARCHAR(64)
);

CREATE INDEX idx_consent_log_user ON app.user_consent_log(user_id, changed_at DESC);

-- ---------------------------------------------------------------------------
-- PERFIL DE OFERENTE
-- ---------------------------------------------------------------------------

CREATE TABLE app.seller_profiles (
    user_id                 UUID        PRIMARY KEY REFERENCES app.users(id),
    verified                BOOLEAN     NOT NULL DEFAULT false,
    verification_type       VARCHAR(50),  -- dpi, nit, business_license
    response_rate           DECIMAL(5,4),  -- 0.0 - 1.0
    avg_response_time_hours DECIMAL(6,2),
    avg_rating              DECIMAL(3,2),
    total_ratings           INT         NOT NULL DEFAULT 0,
    total_transactions      INT         NOT NULL DEFAULT 0,
    active_categories       INT[]       DEFAULT '{}',  -- category_ids
    primary_zone_id         INT         REFERENCES app.zones(id),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- DEMANDAS
-- ---------------------------------------------------------------------------

CREATE TABLE app.demands (
    id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID          NOT NULL REFERENCES app.users(id),
    category_id         INT           NOT NULL REFERENCES app.categories(id),
    subcategory_id      INT           REFERENCES app.categories(id),

    title               VARCHAR(200)  NOT NULL,
    description         TEXT          NOT NULL,

    budget_min          DECIMAL(12,2),
    budget_max          DECIMAL(12,2),
    currency            CHAR(3)       NOT NULL DEFAULT 'GTQ',

    -- Ubicación precisa — NUNCA sale de esta capa sin anonimizar
    zone_id             INT           REFERENCES app.zones(id),
    location_lat        DECIMAL(9,6),
    location_lng        DECIMAL(9,6),
    location_label      VARCHAR(200),  -- descripción libre del usuario

    urgency             app.urgency_level NOT NULL DEFAULT 'medium',
    status              app.demand_status NOT NULL DEFAULT 'open',

    -- Contadores denormalizados (actualizados por trigger)
    view_count          INT           NOT NULL DEFAULT 0,
    offer_count         INT           NOT NULL DEFAULT 0,

    -- Visibilidad
    is_anonymous        BOOLEAN       NOT NULL DEFAULT false,
    expires_at          TIMESTAMPTZ,

    created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
    closed_at           TIMESTAMPTZ,

    CONSTRAINT chk_budget_order CHECK (
        budget_min IS NULL OR budget_max IS NULL OR budget_min <= budget_max
    )
);

CREATE INDEX idx_demands_user        ON app.demands(user_id);
CREATE INDEX idx_demands_category    ON app.demands(category_id);
CREATE INDEX idx_demands_zone        ON app.demands(zone_id);
CREATE INDEX idx_demands_status      ON app.demands(status);
CREATE INDEX idx_demands_created_at  ON app.demands(created_at DESC);
CREATE INDEX idx_demands_status_cat  ON app.demands(status, category_id) WHERE status = 'open';

-- Etiquetas / palabras clave de demandas
CREATE TABLE app.demand_tags (
    demand_id   UUID        NOT NULL REFERENCES app.demands(id) ON DELETE CASCADE,
    tag         VARCHAR(80) NOT NULL,
    PRIMARY KEY (demand_id, tag)
);

CREATE INDEX idx_demand_tags_tag ON app.demand_tags(tag);

-- ---------------------------------------------------------------------------
-- OFERTAS
-- ---------------------------------------------------------------------------

CREATE TABLE app.offers (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    demand_id       UUID          NOT NULL REFERENCES app.demands(id),
    seller_id       UUID          NOT NULL REFERENCES app.users(id),

    price           DECIMAL(12,2) NOT NULL,
    currency        CHAR(3)       NOT NULL DEFAULT 'GTQ',
    description     TEXT,
    estimated_days  INT,

    status          app.offer_status NOT NULL DEFAULT 'sent',

    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    viewed_at       TIMESTAMPTZ,
    responded_at    TIMESTAMPTZ,

    CONSTRAINT chk_price_positive CHECK (price > 0)
);

CREATE INDEX idx_offers_demand   ON app.offers(demand_id);
CREATE INDEX idx_offers_seller   ON app.offers(seller_id);
CREATE INDEX idx_offers_status   ON app.offers(status);
CREATE INDEX idx_offers_created  ON app.offers(created_at DESC);

-- ---------------------------------------------------------------------------
-- TRANSACCIONES
-- ---------------------------------------------------------------------------

CREATE TABLE app.transactions (
    id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    demand_id           UUID          NOT NULL REFERENCES app.demands(id),
    offer_id            UUID          NOT NULL REFERENCES app.offers(id),
    buyer_id            UUID          NOT NULL REFERENCES app.users(id),
    seller_id           UUID          NOT NULL REFERENCES app.users(id),

    amount              DECIMAL(12,2) NOT NULL,
    currency            CHAR(3)       NOT NULL DEFAULT 'GTQ',
    payment_method      VARCHAR(50),

    status              app.transaction_status NOT NULL DEFAULT 'pending',

    confirmed_at        TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    disputed_at         TIMESTAMPTZ,
    dispute_reason      TEXT,

    created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),

    CONSTRAINT chk_amount_positive CHECK (amount > 0)
);

CREATE INDEX idx_transactions_demand    ON app.transactions(demand_id);
CREATE INDEX idx_transactions_buyer     ON app.transactions(buyer_id);
CREATE INDEX idx_transactions_seller    ON app.transactions(seller_id);
CREATE INDEX idx_transactions_status    ON app.transactions(status);
CREATE INDEX idx_transactions_created   ON app.transactions(created_at DESC);

-- ---------------------------------------------------------------------------
-- CALIFICACIONES
-- ---------------------------------------------------------------------------

CREATE TABLE app.ratings (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id  UUID        NOT NULL REFERENCES app.transactions(id),
    rater_id        UUID        NOT NULL REFERENCES app.users(id),
    rated_id        UUID        NOT NULL REFERENCES app.users(id),
    rating_type     app.rating_type NOT NULL,

    score           SMALLINT    NOT NULL,
    comment         TEXT,
    is_public       BOOLEAN     NOT NULL DEFAULT true,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_score_range  CHECK (score BETWEEN 1 AND 5),
    CONSTRAINT uq_one_rating_per_transaction_side UNIQUE (transaction_id, rater_id)
);

CREATE INDEX idx_ratings_rated   ON app.ratings(rated_id);
CREATE INDEX idx_ratings_created ON app.ratings(created_at DESC);

-- ---------------------------------------------------------------------------
-- MENSAJES (solo metadatos para analítica; contenido es privado)
-- ---------------------------------------------------------------------------

CREATE TABLE app.conversations (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    demand_id   UUID        NOT NULL REFERENCES app.demands(id),
    buyer_id    UUID        NOT NULL REFERENCES app.users(id),
    seller_id   UUID        NOT NULL REFERENCES app.users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_msg_at TIMESTAMPTZ,
    msg_count   INT         NOT NULL DEFAULT 0,
    UNIQUE (demand_id, buyer_id, seller_id)
);

-- El contenido de mensajes se almacena cifrado. Solo se registran metadatos.
CREATE TABLE app.messages (
    id                  BIGSERIAL   PRIMARY KEY,
    conversation_id     UUID        NOT NULL REFERENCES app.conversations(id),
    sender_id           UUID        NOT NULL REFERENCES app.users(id),
    content_encrypted   TEXT        NOT NULL,  -- cifrado AES-256 en capa de aplicación
    sent_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    read_at             TIMESTAMPTZ
);

CREATE INDEX idx_messages_conv    ON app.messages(conversation_id, sent_at DESC);
CREATE INDEX idx_messages_sender  ON app.messages(sender_id);

-- ---------------------------------------------------------------------------
-- TRIGGERS — mantener contadores denormalizados
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION app.update_demand_offer_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE app.demands SET offer_count = offer_count + 1, updated_at = now()
        WHERE id = NEW.demand_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE app.demands SET offer_count = GREATEST(offer_count - 1, 0), updated_at = now()
        WHERE id = OLD.demand_id;
    END IF;
    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_demand_offer_count
AFTER INSERT OR DELETE ON app.offers
FOR EACH ROW EXECUTE FUNCTION app.update_demand_offer_count();

CREATE OR REPLACE FUNCTION app.update_seller_stats()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    UPDATE app.seller_profiles
    SET
        avg_rating       = (SELECT AVG(score) FROM app.ratings WHERE rated_id = NEW.rated_id),
        total_ratings    = (SELECT COUNT(*)   FROM app.ratings WHERE rated_id = NEW.rated_id),
        updated_at       = now()
    WHERE user_id = NEW.rated_id;
    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_seller_rating_stats
AFTER INSERT ON app.ratings
FOR EACH ROW EXECUTE FUNCTION app.update_seller_stats();

CREATE OR REPLACE FUNCTION app.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at     BEFORE UPDATE ON app.users      FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();
CREATE TRIGGER trg_demands_updated_at   BEFORE UPDATE ON app.demands     FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();
CREATE TRIGGER trg_offers_updated_at    BEFORE UPDATE ON app.offers      FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();
CREATE TRIGGER trg_transactions_upd_at  BEFORE UPDATE ON app.transactions FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();
