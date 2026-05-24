# Señal

**Plataforma de inteligencia de demanda de mercado para Guatemala y LATAM**

Señal es un marketplace donde usuarios publican lo que necesitan contratar o comprar
("demandas"), y proveedores responden con ofertas. El modelo de negocio central es la
venta de inteligencia de mercado anonimizada y agregada a bancos, cooperativas, fintechs
e instituciones de investigación bajo licencias B2B no exclusivas.

---

## Arquitectura

```
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│  Marketplace    │   │  Portal bancario │   │   API B2B       │
│  app.senal.app  │   │ dashboard.senal  │   │  api.senal.app  │
│  Next.js 14     │   │  Next.js 14      │   │  Fastify 4      │
│  Puerto 3002    │   │  Puerto 3000     │   │  Puerto 3001    │
└────────┬────────┘   └────────┬────────┘   └────────┬────────┘
         │                     │                     │
         └──────────┬──────────┘                     │
                    │                                 │
         ┌──────────▼──────────┐         ┌───────────▼──────────┐
         │     PostgreSQL 16   │         │     PostgreSQL 16     │
         │    schema: app      │────ETL──▶   schema: analytics   │
         │  (datos crudos)     │         │    schema: b2b        │
         └─────────────────────┘         └──────────────────────┘
                                                    │
                                         ┌──────────▼──────────┐
                                         │   ETL Pipeline      │
                                         │   Python / APScheduler│
                                         └─────────────────────┘
```

| Servicio | Stack | Puerto | Propósito |
|---|---|---|---|
| `app` | Next.js 14, NextAuth, Tailwind | 3002 | Marketplace para compradores y vendedores |
| `portal` | Next.js 14, Recharts, NextAuth | 3000 | Dashboard analítico para clientes B2B |
| `api` | Fastify 4, TypeScript | 3001 | API REST para clientes institucionales |
| `etl` | Python 3.12, APScheduler | — | Pipeline de anonimización y carga al warehouse |
| `db` | PostgreSQL 16 | 5432 | Base de datos única con tres schemas separados |

### Schemas de PostgreSQL

| Schema | Contiene | Acceso |
|---|---|---|
| `app` | Datos transaccionales con PII (usuarios, demandas, ofertas, mensajes) | `app` + `etl` únicamente |
| `analytics` | Warehouse anonimizado; demandas hasheadas con SHA-256; sin PII | `portal` + `api` + `etl` |
| `b2b` | Instituciones, contratos, API keys, cuotas, logs de acceso | `api` + `portal` |

---

## Privacidad y cumplimiento

> El modelo de Señal vende **inteligencia**, no vigilancia individual.

Reglas que el código hace cumplir:

- **Separación física de datos**: PII en `app`, analíticos en `analytics`. Ninguna query B2B puede alcanzar `app`.
- **k-anonimato ≥ 5**: celdas con menos de 5 demandas se suprimen en `agg_demand_by_zone_category` — `demand_count = NULL` + `demand_count_suppressed = true`.
- **Hashing SHA-256**: los `demand_id` en el warehouse son hashes de una sola vía; no es posible cruzar de vuelta a PII.
- **Consentimiento explícito**: el ETL solo procesa usuarios con `consent_analytics = 'granted'`; cada cambio de consentimiento se audita en `user_consent_log`.
- **No se vende**: nombres, emails, teléfonos, contenido de mensajes, ni identificadores directos.
- **Licencias no exclusivas**: ninguna institución puede adquirir control total ni propiedad de la base de datos.
- **Disclaimer obligatorio**: el portal bancario muestra en cada vista que los datos son señal de mercado, no recomendación crediticia.

---

## Requisitos

- **Docker** ≥ 24 y **Docker Compose** ≥ 2.20
- **Node.js** ≥ 20 y **Python** ≥ 3.12 (solo si corres servicios fuera de Docker)
- **make** (viene incluido en macOS/Linux)

---

## Inicio rápido (desarrollo local)

```bash
# 1. Clonar y entrar al directorio
git clone <repo> senal && cd senal

# 2. Levantar todos los servicios (primera vez tarda ~2 min por las imágenes)
make dev

# 3. En otra terminal, inicializar el schema de la base de datos
make db-init

# 4. (Opcional) Correr el pipeline ETL en modo seco para verificar
make etl-dry
```

| URL | Servicio |
|---|---|
| http://localhost:3002 | Marketplace (app) |
| http://localhost:3000 | Portal bancario |
| http://localhost:3001/health | API B2B |
| `localhost:5432` | PostgreSQL (usuario: `postgres`, clave: `postgres`) |

### Solo la base de datos (desarrollo sin Docker para el resto)

```bash
make dev-db          # levanta únicamente PostgreSQL en Docker
make db-init         # carga el schema

# Luego, en terminales separadas:
cd api     && cp .env.example .env && npm install && npm run dev
cd portal  && cp .env.example .env && npm install && npm run dev
cd app     && cp .env.example .env && npm install && npm run dev
cd etl     && cp .env.example .env && pip install -r requirements.txt && python scripts/run_pipeline.py scheduler
```

---

## Estructura del proyecto

```
senal/
├── database/
│   ├── schema/
│   │   ├── 001_app.sql          # Schema transaccional (PII)
│   │   ├── 002_analytics.sql    # Warehouse anonimizado
│   │   ├── 003_b2b.sql          # Instituciones, API keys, cuotas
│   │   ├── 004_functions.sql    # ETL functions, vistas, índices de mercado
│   │   └── 005_seed.sql         # Geografía de Guatemala (22 departamentos, ~200 zonas)
│   └── run_schema.sh
│
├── api/                         # B2B REST API (Fastify + TypeScript)
│   └── src/
│       ├── plugins/             # auth, quota, audit
│       ├── routes/v1/           # demand, indices, trends, reports, account
│       └── db/queries/
│
├── portal/                      # Dashboard bancario (Next.js 14)
│   └── src/
│       ├── app/(dashboard)/     # Overview, opportunities, lookup, trends, reports
│       └── components/          # KPI cards, Recharts charts, index gauges
│
├── app/                         # Marketplace (Next.js 14)
│   └── src/
│       ├── actions/             # Server Actions: users, demands, offers
│       ├── app/                 # Feed, demand/[id], my-demands, my-offers, messages, profile
│       └── components/          # DemandCard, OfferForm, BottomNav
│
├── etl/                         # Pipeline Python
│   └── pipeline/
│       ├── anonymizer.py        # Módulo crítico de privacidad — guard contra PII
│       └── jobs/                # extract, load, refresh_aggregates, indices, trends
│
├── nginx/
│   └── nginx.conf               # Reverse proxy con TLS para producción
│
├── docker-compose.yml           # Entorno de desarrollo
├── docker-compose.prod.yml      # Entorno de producción
├── .env.prod.example            # Variables requeridas en producción
└── Makefile                     # Comandos de operación
```

---

## Comandos útiles

```bash
make help           # Lista todos los comandos disponibles

# Base de datos
make db-shell       # psql interactivo en el contenedor
make db-reset       # Destruye y recrea la BD (¡borra datos!)

# ETL
make etl-run        # Full refresh (re-procesa todo)
make etl-dry        # Simula sin insertar
make etl-validate   # Verifica privacidad y calidad de datos

# Docker
make logs           # Tail de todos los servicios
make ps             # Estado de contenedores
make clean          # Elimina todo (contenedores + volúmenes)
```

---

## API B2B

La API usa autenticación por API key en el header `Authorization: Bearer sn_live_<32chars>`.

```bash
# Health check
curl http://localhost:3001/health

# Demanda agregada por zona/categoría (requiere API key)
curl -H "Authorization: Bearer sn_live_<tu_key>" \
     "http://localhost:3001/v1/demand/aggregate?zone_id=1&period=2024-Q1"

# Índices de mercado
curl -H "Authorization: Bearer sn_live_<tu_key>" \
     "http://localhost:3001/v1/indices?zone_id=1&category_id=5"
```

### Endpoints disponibles

| Método | Ruta | Plan mínimo | Descripción |
|---|---|---|---|
| GET | `/v1/demand/aggregate` | basic | Demanda agregada con filtros |
| GET | `/v1/demand/unmet` | basic | Demanda sin respuesta (oportunidades) |
| GET | `/v1/demand/price-ranges` | basic | Distribución de presupuestos |
| GET | `/v1/indices` | pro | Índices de mercado actuales |
| GET | `/v1/indices/opportunities` | pro | Top oportunidades por score |
| GET | `/v1/indices/lookup` | pro | Análisis completo de zona+categoría |
| GET | `/v1/trends/category` | pro | Tendencias por categoría (6 meses) |
| GET | `/v1/trends/national` | research | Resumen nacional |
| GET | `/v1/reports` | basic | Lista de reportes solicitados |
| POST | `/v1/reports` | pro | Solicitar un nuevo reporte |
| GET | `/v1/account/usage` | basic | Uso de cuota actual |

---

## Pipeline ETL

El ETL corre como un daemon APScheduler con tres jobs:

| Job | Frecuencia | Descripción |
|---|---|---|
| `incremental` | Cada hora (xx:05) | Procesa demandas nuevas desde las últimas 2 h |
| `daily` | 02:10 AM | Full: dims → facts → agregados → índices → tendencias |
| `sync_dimensions` | Domingo 03:00 | Sincroniza dim_categories y dim_zones |

```bash
# Correr manualmente desde el contenedor etl
docker compose exec etl python scripts/run_pipeline.py incremental
docker compose exec etl python scripts/run_pipeline.py daily
docker compose exec etl python scripts/validate.py  # verifica privacidad
```

La validación de privacidad tiene **4 checks críticos** (exit code 2 si fallan):
1. Sin `user_id` en el warehouse
2. Sin columnas PII (`email`, `phone`, `title`, `description`, etc.) en `analytics`
3. k-anonimato ≥ 5 en todas las celdas publicadas
4. Hashes SHA-256 únicos en `fact_demands`

---

## Deploy en producción (VPS con Docker)

### 1. Preparar el servidor

```bash
# Ubuntu 22.04 / Debian 12
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

### 2. Clonar y configurar variables

```bash
git clone <repo> /opt/senal && cd /opt/senal
cp .env.prod.example .env.prod

# Generar secrets seguros
openssl rand -base64 32   # usar para PORTAL_NEXTAUTH_SECRET
openssl rand -base64 32   # usar para APP_NEXTAUTH_SECRET (diferente)
openssl rand -hex 20      # usar para POSTGRES_PASSWORD

# Editar .env.prod con los valores reales
nano .env.prod
```

### 3. TLS con Certbot

```bash
# Instalar certbot (en el host, antes de levantar nginx)
sudo apt install certbot
sudo certbot certonly --standalone -d app.senal.app -d dashboard.senal.app -d api.senal.app

mkdir -p nginx/ssl
cp /etc/letsencrypt/live/app.senal.app/fullchain.pem nginx/ssl/
cp /etc/letsencrypt/live/app.senal.app/privkey.pem   nginx/ssl/
```

### 4. Inicializar y levantar

```bash
# Primera vez: construir e inicializar BD
make build
make prod                  # levanta todos los servicios
make db-init               # solo la primera vez
make etl-run               # carga inicial del warehouse
```

### 5. Renovación automática de TLS

```bash
# Agregar al crontab del servidor
0 0 * * 0 certbot renew --quiet && \
  cp /etc/letsencrypt/live/app.senal.app/fullchain.pem /opt/senal/nginx/ssl/ && \
  cp /etc/letsencrypt/live/app.senal.app/privkey.pem   /opt/senal/nginx/ssl/ && \
  docker compose -f /opt/senal/docker-compose.prod.yml exec nginx nginx -s reload
```

### 6. Backups de la base de datos

```bash
# Crontab: backup diario a las 3 AM
0 3 * * * docker exec senal-db-1 pg_dump -U senal senal_prod | \
  gzip > /backups/senal_$(date +\%Y\%m\%d).sql.gz

# Retención de 30 días
0 4 * * * find /backups -name "senal_*.sql.gz" -mtime +30 -delete
```

---

## Deploy alternativo: Railway

Railway puede alojar todos los servicios con mínima configuración.

1. Crear un proyecto en [railway.app](https://railway.app)
2. Agregar un servicio PostgreSQL (Railway provee la variable `DATABASE_URL` automáticamente)
3. Agregar 4 servicios desde GitHub (api, portal, app, etl) — cada uno detecta su `Dockerfile`
4. En cada servicio, agregar las variables de entorno correspondientes desde `.env.prod.example`
5. En el servicio `api`, `portal` y `app`, configurar los dominios públicos en Railway Settings

---

## Agregar un cliente B2B

```sql
-- 1. Crear institución
INSERT INTO b2b.institutions (name, country_code, institution_type, contact_email)
VALUES ('Banco Industrial', 'GT', 'bank', 'data@bi.com.gt')
RETURNING id;

-- 2. Crear contrato (plan pro, 12 meses)
INSERT INTO b2b.contracts (institution_id, plan_id, starts_at, ends_at, monthly_price_usd)
VALUES (<id>, (SELECT id FROM b2b.plans WHERE code = 'pro'),
        now(), now() + interval '1 year', 1500.00);

-- 3. Crear usuario del portal
INSERT INTO b2b.institution_users (institution_id, email, password_hash, full_name, role)
VALUES (<id>, 'analista@bi.com.gt', crypt('temp_pass', gen_salt('bf')), 'Nombre Apellido', 'analyst');

-- 4. Generar API key (formato: sn_live_ + 32 chars hex)
-- La key se entrega al cliente; solo se guarda el hash argon2 + prefijo.
-- Usa el endpoint POST /v1/admin/keys o hazlo desde la app de gestión.
```

---

## Índices de mercado

El warehouse calcula 9 índices propietarios en escala 0–100 (z-score normalizado):

| Índice | Descripción |
|---|---|
| `demand_activity_index` | Volumen de demanda reciente relativo a la media |
| `unmet_demand_index` | Proporción de demandas sin oferta aceptada |
| `market_opportunity_score` | Combinación de actividad + demanda insatisfecha |
| `category_growth_score` | Crecimiento vs. período anterior |
| `local_demand_strength` | Concentración de demanda en la zona |
| `entrepreneurial_demand_signal` | Demanda de bajo presupuesto (mercado informal) |
| `price_acceptance_p10/p50/p90` | Percentiles de presupuesto aceptado |
| `offer_response_rate` | % de demandas que recibieron al menos una oferta |
| `transaction_confirmation_rate` | % de transacciones confirmadas vs. aceptadas |

---

## Seguridad

- Contraseñas de usuarios: **bcrypt** (cost 12)
- API keys B2B: **argon2id** (time=3, memory=64MB); solo el prefijo de 8 chars se indexa
- IPs en logs de acceso: **SHA-256** (one-way, no reversible)
- Mensajes de usuario: campo `content` apto para cifrado a nivel columna (pgcrypto AES-256)
- Sesiones: JWT firmado (NextAuth); 30 días en la app, 8 horas en el portal
- Headers HTTP: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, HSTS

---

## Licencia

Propietario — Señal © 2024. Todos los derechos reservados.
