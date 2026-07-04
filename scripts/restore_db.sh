#!/bin/bash

# Exit on error
set -e

if [ -z "$1" ]; then
    echo "Usage: ./restore_db.sh <backup_file_path_or_s3_url>"
    exit 1
fi

INPUT_SRC=$1
BACKUP_FILE="/tmp/latest_restore.sql.gz"

# Configuration
DB_HOST=${DB_HOST:-"postgres"}
DB_PORT=${DB_PORT:-"5432"}
DB_DATABASE=${DB_DATABASE:-"jvd_erp"}
DB_USERNAME=${DB_USERNAME:-"postgres"}

echo "Starting database restore process..."

if [[ "$INPUT_SRC" == s3://* ]]; then
    echo "Downloading backup from S3..."
    aws s3 cp "$INPUT_SRC" "$BACKUP_FILE"
else
    echo "Using local file: $INPUT_SRC"
    cp "$INPUT_SRC" "$BACKUP_FILE"
fi

# Note: PGPASSWORD should be set in the environment
echo "Restoring database (this will drop existing objects)..."

# We use gzip -dc to decompress on the fly and pipe to psql
gzip -dc "$BACKUP_FILE" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_DATABASE"

echo "Database restore completed successfully."
