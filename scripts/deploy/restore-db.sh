#!/usr/bin/env bash
# Restore a backup produced by backup-db.sh. DESTRUCTIVE — drops and recreates the
# target database. Usage: scripts/deploy/restore-db.sh ./backups/jvd-db-2026-07-14_020000.dump
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "usage: $0 <path-to-dump-file>" >&2
  exit 1
fi

DUMP_FILE="$1"
cd "$(dirname "$0")/../.."   # repo root
source .env

if [ ! -f "$DUMP_FILE" ]; then
  echo "not found: $DUMP_FILE" >&2
  exit 1
fi

read -r -p "This will DROP and recreate '$DB_DATABASE'. Type the database name to confirm: " CONFIRM
if [ "$CONFIRM" != "$DB_DATABASE" ]; then
  echo "confirmation did not match, aborting."
  exit 1
fi

docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U "$DB_USERNAME" -d postgres -c "DROP DATABASE IF EXISTS \"$DB_DATABASE\";"
docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U "$DB_USERNAME" -d postgres -c "CREATE DATABASE \"$DB_DATABASE\";"

docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_restore -U "$DB_USERNAME" -d "$DB_DATABASE" --no-owner --no-privileges < "$DUMP_FILE"

echo "restore complete."
