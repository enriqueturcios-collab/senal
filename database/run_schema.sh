#!/bin/bash
# Ejecutar el schema completo en orden.
# Uso: ./run_schema.sh [nombre_base_de_datos]
# Ejemplo: ./run_schema.sh senal_dev

DB=${1:-senal_dev}

echo "==> Creando base de datos '$DB'..."
createdb "$DB" 2>/dev/null || echo "  (ya existe, continuando)"

echo "==> Habilitando extensiones..."
psql "$DB" -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
psql "$DB" -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"

echo "==> [1/5] Schema transaccional (app)..."
psql "$DB" -f schema/001_app.sql

echo "==> [2/5] Schema analítico (analytics)..."
psql "$DB" -f schema/002_analytics.sql

echo "==> [3/5] Schema institucional (b2b)..."
psql "$DB" -f schema/003_b2b.sql

echo "==> [4/5] Funciones ETL y vistas..."
psql "$DB" -f schema/004_functions.sql

echo "==> [5/5] Datos semilla..."
psql "$DB" -f schema/005_seed.sql

echo ""
echo "Schema de Señal listo en base de datos '$DB'."
echo ""
echo "Schemas creados:"
psql "$DB" -c "\dn"
echo ""
echo "Tablas por schema:"
psql "$DB" -c "SELECT schemaname, tablename FROM pg_tables WHERE schemaname IN ('app','analytics','b2b') ORDER BY schemaname, tablename;"
