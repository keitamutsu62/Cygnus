#!/bin/sh
set -e

DATABASE_URL="mysql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT:-3306}/${DB_NAME}"

echo "==> Running DB migrations..."
atlas migrate apply \
  --url "$DATABASE_URL" \
  --dir "file:///migrations" \
  2>&1 || echo "==> Migration warning (schema may already be up to date)"

echo "==> Starting server..."
exec /server
