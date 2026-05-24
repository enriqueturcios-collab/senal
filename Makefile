.PHONY: help dev dev-db dev-stop build prod prod-down \
        db-init db-reset db-shell \
        etl-run etl-validate etl-dry \
        logs ps clean

# ── Colores ───────────────────────────────────────────────────────────────────
GREEN  := \033[0;32m
YELLOW := \033[0;33m
RESET  := \033[0m

help:
	@echo ""
	@echo "  $(GREEN)Señal — Comandos disponibles$(RESET)"
	@echo ""
	@echo "  $(YELLOW)Desarrollo$(RESET)"
	@echo "  make dev          Levanta todos los servicios en modo desarrollo"
	@echo "  make dev-db       Solo la base de datos (para desarrollo local sin Docker)"
	@echo "  make dev-stop     Para todos los servicios"
	@echo ""
	@echo "  $(YELLOW)Base de datos$(RESET)"
	@echo "  make db-init      Crea la BD e inicializa el schema completo"
	@echo "  make db-reset     Destruye y recrea la BD desde cero"
	@echo "  make db-shell     Abre psql en el contenedor de la BD"
	@echo ""
	@echo "  $(YELLOW)ETL$(RESET)"
	@echo "  make etl-run      Corre el pipeline completo (full refresh)"
	@echo "  make etl-dry      Simulacro sin insertar datos"
	@echo "  make etl-validate Verifica privacidad y calidad de datos"
	@echo ""
	@echo "  $(YELLOW)Producción$(RESET)"
	@echo "  make build        Construye todas las imágenes Docker"
	@echo "  make prod         Levanta producción (requiere .env.prod)"
	@echo "  make prod-down    Para producción"
	@echo ""
	@echo "  $(YELLOW)Utilidades$(RESET)"
	@echo "  make logs         Muestra logs de todos los servicios"
	@echo "  make ps           Estado de los contenedores"
	@echo "  make clean        Elimina contenedores, volúmenes e imágenes locales"
	@echo ""

# ── Desarrollo ─────────────────────────────────────────────────────────────────
dev:
	docker compose up --build

dev-db:
	docker compose up db --build -d
	@echo "$(GREEN)PostgreSQL listo en localhost:5432$(RESET)"

dev-stop:
	docker compose down

# ── Base de datos ──────────────────────────────────────────────────────────────
db-init:
	@echo "$(YELLOW)Inicializando schema…$(RESET)"
	docker compose up db -d --wait
	docker compose exec db psql -U postgres -c "CREATE EXTENSION IF NOT EXISTS pgcrypto; CREATE EXTENSION IF NOT EXISTS pg_trgm;" senal_dev
	docker compose exec -T db psql -U postgres senal_dev < database/schema/001_app.sql
	docker compose exec -T db psql -U postgres senal_dev < database/schema/002_analytics.sql
	docker compose exec -T db psql -U postgres senal_dev < database/schema/003_b2b.sql
	docker compose exec -T db psql -U postgres senal_dev < database/schema/004_functions.sql
	docker compose exec -T db psql -U postgres senal_dev < database/schema/005_seed.sql
	@echo "$(GREEN)Schema listo.$(RESET)"

db-reset:
	@echo "$(YELLOW)¡Advertencia: esto elimina todos los datos!$(RESET)"
	@read -p "¿Continuar? [s/N] " ans && [ "$$ans" = "s" ] || exit 1
	docker compose down -v
	$(MAKE) db-init

db-shell:
	docker compose exec db psql -U postgres senal_dev

# ── ETL ────────────────────────────────────────────────────────────────────────
etl-run:
	docker compose run --rm etl python scripts/run_pipeline.py full-refresh

etl-dry:
	docker compose run --rm -e DRY_RUN=true etl python scripts/run_pipeline.py full-refresh

etl-validate:
	docker compose run --rm etl python scripts/validate.py

# ── Producción ─────────────────────────────────────────────────────────────────
build:
	docker compose -f docker-compose.prod.yml build

prod:
	@test -f .env.prod || (echo "$(YELLOW)Crea .env.prod primero (ver .env.prod.example)$(RESET)" && exit 1)
	docker compose -f docker-compose.prod.yml --env-file .env.prod up -d

prod-down:
	docker compose -f docker-compose.prod.yml down

# ── Utilidades ─────────────────────────────────────────────────────────────────
logs:
	docker compose logs -f

ps:
	docker compose ps

clean:
	docker compose down -v --rmi local
