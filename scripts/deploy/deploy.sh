#!/usr/bin/env bash
# Production deployment script for Hostinger VPS.
# Run on the VPS:
#   bash /opt/jvd/JVD-Internal-Management-System/scripts/deploy/deploy.sh
# or executable directly:
#   chmod +x /opt/jvd/JVD-Internal-Management-System/scripts/deploy/deploy.sh
set -euo pipefail

cd /opt/jvd/JVD-Internal-Management-System

echo "==> Pulling latest changes from main branch..."
git pull --ff-only origin main

echo "==> Building frontend assets..."
cd frontend
npm ci
npm run build
cd ..

echo "==> Rebuilding and restarting Docker containers..."
docker compose -f docker-compose.prod.yml up -d --build

echo "==> Running database migrations..."
docker compose -f docker-compose.prod.yml exec -T app php artisan migrate --force

echo "==> Clearing application caches..."
docker compose -f docker-compose.prod.yml exec -T app php artisan optimize:clear

echo "==> Restarting background workers..."
docker compose -f docker-compose.prod.yml restart worker mail-worker

echo "==> Deployment to Hostinger VPS complete!"
