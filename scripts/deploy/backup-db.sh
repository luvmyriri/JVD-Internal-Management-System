#!/usr/bin/env bash
# Nightly backup for the production Postgres container. Run via cron on the VPS:
#   0 2 * * * /path/to/repo/scripts/deploy/backup-db.sh >> /var/log/jvd-backup.log 2>&1
#
# Mechanism rehearsed 2026-07-14 against a real copy of the dev DB: pg_dump ->
# pg_restore into a throwaway DB reproduced exact row counts (users/invoices/
# bookings) and an exact financial value (invoice #1 total_amount). Re-run this
# same rehearsal against the actual prod DB once it exists — this proves the
# mechanism, not that today's prod backup specifically restores cleanly.
set -euo pipefail

cd "$(dirname "$0")/../.."   # repo root
source .env

BACKUP_DIR="${BACKUP_DIR:-./backups}"
STAMP="$(date +%F_%H%M%S)"
OUT="$BACKUP_DIR/jvd-db-$STAMP.dump"

mkdir -p "$BACKUP_DIR"

docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U "$DB_USERNAME" -d "$DB_DATABASE" -F c > "$OUT"

echo "backup written: $OUT ($(du -h "$OUT" | cut -f1))"

# Push off-box — fill in once the S3-compatible bucket exists (DO Spaces / Backblaze
# B2). Never rely on backups living only on the same disk as the live DB.
# aws --endpoint-url "$BACKUP_S3_ENDPOINT" s3 cp "$OUT" "s3://$BACKUP_S3_BUCKET/"

# Keep 14 days locally regardless of offsite push.
find "$BACKUP_DIR" -name 'jvd-db-*.dump' -mtime +14 -delete
