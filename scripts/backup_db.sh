#!/bin/bash

# Exit on error
set -e

# Configuration
DB_HOST=${DB_HOST:-"postgres"}
DB_PORT=${DB_PORT:-"5432"}
DB_DATABASE=${DB_DATABASE:-"jvd_erp"}
DB_USERNAME=${DB_USERNAME:-"postgres"}
BACKUP_DIR=${BACKUP_DIR:-"/tmp/backups"}
S3_BUCKET=${S3_BUCKET:-"s3://jvd-db-backups"}

# Generate timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/jvd_erp_${TIMESTAMP}.sql.gz"

echo "Starting database backup at ${TIMESTAMP}..."

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Run pg_dump and compress
# Note: PGPASSWORD should be set in the environment or .pgpass
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -F p "$DB_DATABASE" | gzip > "$BACKUP_FILE"

echo "Backup created at ${BACKUP_FILE}"

# Upload to S3 if AWS CLI is available and bucket is set
if command -v aws &> /dev/null; then
    echo "Uploading to S3..."
    aws s3 cp "$BACKUP_FILE" "${S3_BUCKET}/"
    echo "Upload complete."
    
    # Optional: Clean up old local backups to save space
    find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +7 -delete
else
    echo "AWS CLI not found. Skipping S3 upload."
fi

echo "Backup process finished."
