-- =============================================================================
-- SEÑAL — SCHEMA INSTITUCIONAL (b2b)
-- Multi-tenant. Gestión de bancos, fintechs y otras instituciones.
-- Auditoría completa de acceso. Licencias no exclusivas.
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS b2b;

-- ---------------------------------------------------------------------------
-- TIPOS ENUMERADOS
-- ---------------------------------------------------------------------------

CREATE TYPE b2b.institution_type AS ENUM (
    'bank', 'fintech', 'cooperative', 'insurer',
    'research_firm', 'regulatory', 'other'
);

CREATE TYPE b2b.plan_tier AS ENUM ('basic', 'pro', 'enterprise', 'research');

CREATE TYPE b2b.institution_status AS ENUM (
    'active', 'suspended', 'expired', 'pending_contract'
);

CREATE TYPE b2b.user_role AS ENUM ('admin', 'analyst', 'viewer');

CREATE TYPE b2b.report_type AS ENUM (
    'weekly_demand', 'monthly_sector', 'zone_report',
    'unmet_demand', 'price_analysis', 'opportunity',
    'trend_analysis', 'national_summary', 'custom'
);

CREATE TYPE b2b.report_status AS ENUM ('queued', 'generating', 'ready', 'failed', 'expired');

-- ---------------------------------------------------------------------------
-- PLANES COMERCIALES
-- ---------------------------------------------------------------------------

CREATE TABLE b2b.plans (
    id                          SERIAL      PRIMARY KEY,
    tier                        b2b.plan_tier NOT NULL UNIQUE,
    name                        VARCHAR(80) NOT NULL,
    description                 TEXT,

    -- Límites de uso mensual
    api_calls_monthly           INT,        -- NULL = ilimitado
    report_downloads_monthly    INT,
    dashboard_queries_monthly   INT,
    historical_months_access    SMALLINT    NOT NULL DEFAULT 3,

    -- Features habilitados
    has_api_access              BOOLEAN     NOT NULL DEFAULT false,
    has_data_export             BOOLEAN     NOT NULL DEFAULT false,
    has_custom_reports          BOOLEAN     NOT NULL DEFAULT false,
    has_predictive_models       BOOLEAN     NOT NULL DEFAULT false,
    has_individual_data         BOOLEAN     NOT NULL DEFAULT false,  -- fase 2
    has_raw_api                 BOOLEAN     NOT NULL DEFAULT false,  -- enterprise only

    -- Scopes de API permitidos (array de strings)
    allowed_api_scopes          TEXT[]      NOT NULL DEFAULT '{}',

    -- Precio (referencia; contrato real es en contracts)
    price_monthly_usd           DECIMAL(10,2),
    price_annual_usd            DECIMAL(10,2),

    is_active                   BOOLEAN     NOT NULL DEFAULT true,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO b2b.plans (tier, name, description,
    api_calls_monthly, report_downloads_monthly, dashboard_queries_monthly,
    historical_months_access,
    has_api_access, has_data_export, has_custom_reports,
    has_predictive_models, has_raw_api,
    allowed_api_scopes,
    price_monthly_usd, price_annual_usd)
VALUES
(
    'basic', 'Basic', 'Dashboard general de demanda y reportes mensuales',
    0, 5, 500,
    3,
    false, false, false, false, false,
    '{}',
    299, 2990
),
(
    'pro', 'Pro', 'Dashboard avanzado, reportes semanales, exportación y filtros completos',
    0, 20, 2000,
    12,
    false, true, false, false, false,
    '{}',
    799, 7990
),
(
    'enterprise', 'Enterprise', 'API completa, integraciones, modelos predictivos, soporte dedicado',
    50000, NULL, NULL,
    36,
    true, true, true, true, true,
    ARRAY['demand:read', 'indices:read', 'trends:read', 'reports:read', 'export:read'],
    2499, 24990
),
(
    'research', 'Research & Regulatory', 'Series históricas, análisis macro, datos anonimizados para investigación',
    10000, 50, 5000,
    60,
    true, true, false, false, false,
    ARRAY['demand:read', 'indices:read', 'trends:read', 'reports:read', 'national:read'],
    1299, 12990
);

-- ---------------------------------------------------------------------------
-- INSTITUCIONES
-- ---------------------------------------------------------------------------

CREATE TABLE b2b.institutions (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(200) NOT NULL,
    legal_name          VARCHAR(300),
    institution_type    b2b.institution_type NOT NULL,
    plan_id             INT         NOT NULL REFERENCES b2b.plans(id),
    status              b2b.institution_status NOT NULL DEFAULT 'pending_contract',

    country_code        CHAR(2)     NOT NULL DEFAULT 'GT',
    city                VARCHAR(100),

    -- Contacto principal
    primary_contact_name    VARCHAR(150),
    primary_contact_email   VARCHAR(320),
    primary_contact_phone   VARCHAR(30),

    -- Facturación
    tax_id              VARCHAR(50),  -- NIT u equivalente
    billing_email       VARCHAR(320),
    billing_address     TEXT,

    -- Metadatos de cuenta
    max_users           SMALLINT    NOT NULL DEFAULT 5,
    notes               TEXT,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    activated_at        TIMESTAMPTZ,
    suspended_at        TIMESTAMPTZ,
    suspension_reason   TEXT
);

CREATE INDEX idx_institutions_status ON b2b.institutions(status);
CREATE INDEX idx_institutions_type   ON b2b.institutions(institution_type);
CREATE INDEX idx_institutions_plan   ON b2b.institutions(plan_id);

-- ---------------------------------------------------------------------------
-- CONTRATOS (historial de licencias)
-- ---------------------------------------------------------------------------

CREATE TABLE b2b.contracts (
    id                  BIGSERIAL   PRIMARY KEY,
    institution_id      UUID        NOT NULL REFERENCES b2b.institutions(id),
    plan_id             INT         NOT NULL REFERENCES b2b.plans(id),
    contract_number     VARCHAR(50) NOT NULL UNIQUE,

    start_date          DATE        NOT NULL,
    end_date            DATE        NOT NULL,
    auto_renew          BOOLEAN     NOT NULL DEFAULT false,

    -- Precio negociado (puede diferir del catálogo)
    agreed_price_usd    DECIMAL(10,2) NOT NULL,
    billing_period      VARCHAR(10) NOT NULL DEFAULT 'monthly',  -- monthly|annual

    -- Cláusulas especiales en JSON
    special_terms       JSONB,

    status              VARCHAR(20) NOT NULL DEFAULT 'active',  -- active|expired|terminated
    signed_at           TIMESTAMPTZ,
    terminated_at       TIMESTAMPTZ,
    termination_reason  TEXT,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_contract_dates CHECK (end_date > start_date)
);

CREATE INDEX idx_contracts_institution ON b2b.contracts(institution_id, start_date DESC);
CREATE INDEX idx_contracts_status      ON b2b.contracts(status, end_date);

-- ---------------------------------------------------------------------------
-- USUARIOS INSTITUCIONALES
-- ---------------------------------------------------------------------------

CREATE TABLE b2b.institution_users (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id      UUID        NOT NULL REFERENCES b2b.institutions(id),
    email               VARCHAR(320) NOT NULL,
    name                VARCHAR(150) NOT NULL,
    role                b2b.user_role NOT NULL DEFAULT 'viewer',

    -- Permisos granulares adicionales (override al rol)
    allowed_categories  INT[],      -- NULL = todas las permitidas por plan
    allowed_zones       INT[],      -- NULL = todas las permitidas por plan

    is_active           BOOLEAN     NOT NULL DEFAULT true,
    password_hash       VARCHAR(255),
    mfa_enabled         BOOLEAN     NOT NULL DEFAULT false,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_login_at       TIMESTAMPTZ,
    invited_by          UUID        REFERENCES b2b.institution_users(id),

    UNIQUE (institution_id, email)
);

CREATE INDEX idx_inst_users_institution ON b2b.institution_users(institution_id);
CREATE INDEX idx_inst_users_email       ON b2b.institution_users(email);

-- ---------------------------------------------------------------------------
-- API KEYS
-- ---------------------------------------------------------------------------

CREATE TABLE b2b.api_keys (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id  UUID        NOT NULL REFERENCES b2b.institutions(id),
    created_by      UUID        NOT NULL REFERENCES b2b.institution_users(id),

    key_hash        VARCHAR(255) NOT NULL UNIQUE,  -- hash argon2 de la clave
    key_prefix      CHAR(8)     NOT NULL,           -- primeros 8 chars, para identificación
    label           VARCHAR(100),

    scopes          TEXT[]      NOT NULL DEFAULT '{}',

    is_active       BOOLEAN     NOT NULL DEFAULT true,
    expires_at      TIMESTAMPTZ,
    last_used_at    TIMESTAMPTZ,
    last_used_ip    VARCHAR(45),  -- IPv6 max length

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at      TIMESTAMPTZ,
    revoked_by      UUID        REFERENCES b2b.institution_users(id),
    revoke_reason   TEXT
);

CREATE INDEX idx_api_keys_institution ON b2b.api_keys(institution_id);
CREATE INDEX idx_api_keys_prefix      ON b2b.api_keys(key_prefix);
CREATE INDEX idx_api_keys_active      ON b2b.api_keys(is_active, expires_at) WHERE is_active = true;

-- ---------------------------------------------------------------------------
-- CUOTAS DE USO
-- ---------------------------------------------------------------------------

CREATE TABLE b2b.usage_quotas (
    id                          BIGSERIAL   PRIMARY KEY,
    institution_id              UUID        NOT NULL REFERENCES b2b.institutions(id),
    period                      CHAR(7)     NOT NULL,  -- 'YYYY-MM'

    api_calls_used              INT         NOT NULL DEFAULT 0,
    api_calls_limit             INT,
    report_downloads_used       INT         NOT NULL DEFAULT 0,
    report_downloads_limit      INT,
    dashboard_queries_used      INT         NOT NULL DEFAULT 0,
    dashboard_queries_limit     INT,

    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (institution_id, period)
);

CREATE INDEX idx_usage_quotas_inst_period ON b2b.usage_quotas(institution_id, period DESC);

-- Función para incrementar contador de uso y verificar límite
CREATE OR REPLACE FUNCTION b2b.increment_usage(
    p_institution_id UUID,
    p_counter VARCHAR(30),  -- 'api_calls' | 'report_downloads' | 'dashboard_queries'
    p_amount INT DEFAULT 1
)
RETURNS BOOLEAN  -- true si está dentro del límite, false si lo supera
LANGUAGE plpgsql AS $$
DECLARE
    v_period  CHAR(7) := TO_CHAR(now(), 'YYYY-MM');
    v_used    INT;
    v_limit   INT;
BEGIN
    INSERT INTO b2b.usage_quotas (institution_id, period)
    VALUES (p_institution_id, v_period)
    ON CONFLICT (institution_id, period) DO NOTHING;

    IF p_counter = 'api_calls' THEN
        UPDATE b2b.usage_quotas
        SET api_calls_used = api_calls_used + p_amount, updated_at = now()
        WHERE institution_id = p_institution_id AND period = v_period
        RETURNING api_calls_used, api_calls_limit INTO v_used, v_limit;

    ELSIF p_counter = 'report_downloads' THEN
        UPDATE b2b.usage_quotas
        SET report_downloads_used = report_downloads_used + p_amount, updated_at = now()
        WHERE institution_id = p_institution_id AND period = v_period
        RETURNING report_downloads_used, report_downloads_limit INTO v_used, v_limit;

    ELSIF p_counter = 'dashboard_queries' THEN
        UPDATE b2b.usage_quotas
        SET dashboard_queries_used = dashboard_queries_used + p_amount, updated_at = now()
        WHERE institution_id = p_institution_id AND period = v_period
        RETURNING dashboard_queries_used, dashboard_queries_limit INTO v_used, v_limit;
    END IF;

    RETURN (v_limit IS NULL OR v_used <= v_limit);
END;
$$;

-- ---------------------------------------------------------------------------
-- LOGS DE ACCESO — auditoría completa (particionado por mes)
-- ---------------------------------------------------------------------------

CREATE TABLE b2b.access_logs (
    id                  BIGSERIAL,
    institution_id      UUID        NOT NULL,
    user_id             UUID,       -- NULL si fue por API key
    api_key_id          UUID,       -- NULL si fue por portal web
    endpoint            VARCHAR(200) NOT NULL,
    http_method         VARCHAR(10) NOT NULL,
    params_hash         CHAR(64),   -- SHA-256 de los parámetros, para auditoría sin exponer valores
    response_rows       INT,
    response_time_ms    INT,
    http_status         SMALLINT    NOT NULL,
    error_code          VARCHAR(50),
    accessed_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    ip_hash             CHAR(64)    -- SHA-256 de la IP, no la IP directa
) PARTITION BY RANGE (accessed_at);

-- Crear particiones mensuales para los próximos 2 años
CREATE TABLE b2b.access_logs_2025_01 PARTITION OF b2b.access_logs FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE b2b.access_logs_2025_02 PARTITION OF b2b.access_logs FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE b2b.access_logs_2025_03 PARTITION OF b2b.access_logs FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');
CREATE TABLE b2b.access_logs_2025_04 PARTITION OF b2b.access_logs FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');
CREATE TABLE b2b.access_logs_2025_05 PARTITION OF b2b.access_logs FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');
CREATE TABLE b2b.access_logs_2025_06 PARTITION OF b2b.access_logs FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');
CREATE TABLE b2b.access_logs_2025_07 PARTITION OF b2b.access_logs FOR VALUES FROM ('2025-07-01') TO ('2025-08-01');
CREATE TABLE b2b.access_logs_2025_08 PARTITION OF b2b.access_logs FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');
CREATE TABLE b2b.access_logs_2025_09 PARTITION OF b2b.access_logs FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');
CREATE TABLE b2b.access_logs_2025_10 PARTITION OF b2b.access_logs FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
CREATE TABLE b2b.access_logs_2025_11 PARTITION OF b2b.access_logs FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
CREATE TABLE b2b.access_logs_2025_12 PARTITION OF b2b.access_logs FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');
CREATE TABLE b2b.access_logs_2026_01 PARTITION OF b2b.access_logs FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE b2b.access_logs_2026_02 PARTITION OF b2b.access_logs FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE b2b.access_logs_2026_03 PARTITION OF b2b.access_logs FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE b2b.access_logs_2026_04 PARTITION OF b2b.access_logs FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE b2b.access_logs_2026_05 PARTITION OF b2b.access_logs FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE b2b.access_logs_2026_06 PARTITION OF b2b.access_logs FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE b2b.access_logs_2026_07 PARTITION OF b2b.access_logs FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE b2b.access_logs_2026_08 PARTITION OF b2b.access_logs FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE b2b.access_logs_2026_09 PARTITION OF b2b.access_logs FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE b2b.access_logs_2026_10 PARTITION OF b2b.access_logs FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE b2b.access_logs_2026_11 PARTITION OF b2b.access_logs FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE TABLE b2b.access_logs_2026_12 PARTITION OF b2b.access_logs FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');

CREATE INDEX idx_access_logs_institution ON b2b.access_logs(institution_id, accessed_at DESC);
CREATE INDEX idx_access_logs_endpoint    ON b2b.access_logs(endpoint, accessed_at DESC);

-- ---------------------------------------------------------------------------
-- REPORTES — generados por la plataforma
-- ---------------------------------------------------------------------------

CREATE TABLE b2b.reports (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id      UUID        NOT NULL REFERENCES b2b.institutions(id),
    requested_by        UUID        REFERENCES b2b.institution_users(id),

    report_type         b2b.report_type  NOT NULL,
    title               VARCHAR(300) NOT NULL,
    description         TEXT,

    -- Parámetros del reporte
    period_start        DATE,
    period_end          DATE,
    filters             JSONB,      -- {categories: [...], zones: [...], ...}

    status              b2b.report_status NOT NULL DEFAULT 'queued',

    -- Almacenamiento (ruta cifrada a S3 o storage equivalente)
    storage_path        VARCHAR(500),
    file_size_bytes     BIGINT,
    file_format         VARCHAR(10) DEFAULT 'pdf',  -- pdf|xlsx|csv

    -- Control de acceso
    expires_at          TIMESTAMPTZ,
    download_count      INT         NOT NULL DEFAULT 0,
    max_downloads       INT,

    generated_at        TIMESTAMPTZ,
    error_message       TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reports_institution ON b2b.reports(institution_id, created_at DESC);
CREATE INDEX idx_reports_status      ON b2b.reports(status) WHERE status IN ('queued','generating');

-- Historial de descargas de reportes
CREATE TABLE b2b.report_downloads (
    id              BIGSERIAL   PRIMARY KEY,
    report_id       UUID        NOT NULL REFERENCES b2b.reports(id),
    user_id         UUID        NOT NULL REFERENCES b2b.institution_users(id),
    downloaded_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    ip_hash         CHAR(64)
);

CREATE INDEX idx_report_dl_report ON b2b.report_downloads(report_id, downloaded_at DESC);

-- ---------------------------------------------------------------------------
-- FASE 2: PERFIL COMERCIAL INDIVIDUAL CON CONSENTIMIENTO
-- Solo activo cuando el usuario de la app autoriza explícitamente.
-- No forma parte del producto de datos agregados.
-- ---------------------------------------------------------------------------

CREATE TABLE b2b.user_commercial_profiles (
    -- Referencia al usuario de app.users, pero solo expuesto bajo consentimiento
    user_id_hash            CHAR(64)    PRIMARY KEY,  -- hash SHA-256 del UUID original

    -- Metadatos de consentimiento (cuándo y para quién autorizó)
    consent_granted_at      TIMESTAMPTZ NOT NULL,
    consent_expires_at      TIMESTAMPTZ,
    consented_institutions  UUID[]      NOT NULL DEFAULT '{}',  -- institution IDs autorizados

    -- Estadísticas comerciales (sin PII)
    tenure_months           SMALLINT    NOT NULL,
    demands_responded       INT         NOT NULL DEFAULT 0,
    transaction_count       INT         NOT NULL DEFAULT 0,
    avg_rating              DECIMAL(3,2),
    rating_count            INT         NOT NULL DEFAULT 0,
    response_rate           DECIMAL(5,4),
    avg_response_time_h     DECIMAL(6,2),

    -- Actividad geográfica (solo zonas, sin lat/lng)
    primary_zone_ids        INT[],
    active_category_ids     INT[],

    -- Indicadores de confiabilidad
    verified_identity       BOOLEAN     NOT NULL DEFAULT false,
    account_standing        VARCHAR(20) NOT NULL DEFAULT 'good',  -- good|warning|restricted

    -- Control
    last_updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at              TIMESTAMPTZ  -- si el usuario retiró el consentimiento
);

CREATE INDEX idx_user_profiles_consent ON b2b.user_commercial_profiles(consent_granted_at);

-- ---------------------------------------------------------------------------
-- TRIGGERS
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION b2b.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_institutions_updated_at
BEFORE UPDATE ON b2b.institutions
FOR EACH ROW EXECUTE FUNCTION b2b.set_updated_at();

CREATE TRIGGER trg_inst_users_updated_at
BEFORE UPDATE ON b2b.institution_users
FOR EACH ROW EXECUTE FUNCTION b2b.set_updated_at();
