.PHONY: install dev incremental daily validate scheduler backfill

install:
	pip install -r requirements.txt

dev:
	cp -n .env.example .env || true
	@echo "Edita .env con tu DATABASE_URL antes de continuar."

# Ejecuciones manuales
incremental:
	python scripts/run_pipeline.py incremental

daily:
	python scripts/run_pipeline.py daily

sync-dimensions:
	python scripts/run_pipeline.py sync-dimensions

scheduler:
	python scripts/run_pipeline.py scheduler

# Backfill — ajustar fechas según necesidad
backfill:
	python scripts/run_pipeline.py full-refresh --from 2024-01-01 --to $(shell date +%Y-%m-%d)

# Validación de privacidad
validate:
	python scripts/validate.py

# Dry run — lee y transforma pero NO escribe
dry-incremental:
	DRY_RUN=true python scripts/run_pipeline.py incremental

dry-daily:
	DRY_RUN=true python scripts/run_pipeline.py daily
