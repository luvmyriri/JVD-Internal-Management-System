# JVD Internal Management System - Operations Runbook

**Date:** 2026-07-04
**Target Audience:** DevOps, Val, and IT support team

This runbook outlines the steps to deploy the application, rollback changes, manage access, and handle environment variables for both staging and production environments.

## 1. Environments

The application uses two distinct environments:

### Staging Environment
- **Purpose:** Pre-production validation and user acceptance testing (UAT).
- **Deployment Strategy:** Auto-deployed from the `main` branch.
- **Database:** Stripped down, anonymized version of prod (or just seeded dummy data).
- **Access:** Internal team only.

### Production Environment
- **Purpose:** Live application used by employees and customers.
- **Deployment Strategy:** Manual, using GitHub Releases (tagged releases).
- **Database:** Live customer and operations data.
- **Access:** All registered employees with valid roles.

---

## 2. Deployment Pipelines

Deployments are designed to be zero-touch (Staging) or one-touch (Production).

### Deploying to Staging (Auto)
Every time a pull request is squash-merged into the `main` branch, a GitHub action will automatically trigger a deployment to the staging server.

1. Ensure your feature branch is tested and approved.
2. Merge the PR into `main`.
3. Monitor the GitHub Actions tab for the "Deploy to Staging" workflow.

### Deploying to Production (Manual)
Production deployments are triggered via Git Tags (Releases).

1. Go to the GitHub repository -> "Releases" -> "Draft a new release".
2. Create a new tag (e.g., `v1.2.0`).
3. Title the release and generate release notes (use the "Generate release notes" button).
4. Click "Publish release".
5. A GitHub Action will trigger, build the production Docker images, and deploy them to the production cluster.

---

## 3. Rollback Procedures

If a deployment introduces a critical bug, follow this rollback procedure:

### Code Rollback
1. Identify the last known good Git Tag (e.g., `v1.1.9`).
2. Run the deployment pipeline manually targeting the old tag OR draft a new release `v1.2.1` that reverts the commit.
3. If using Docker Compose manually:
   ```bash
   git checkout v1.1.9
   docker-compose -f docker-compose.prod.yml down
   docker-compose -f docker-compose.prod.yml up -d --build
   ```

### Database Rollback (Extreme Cases Only)
*Warning: Rolling back the database will cause data loss for any operations processed after the backup was taken.*
1. Restore the latest backup (see Backup & Restore section).
2. Manually fix any schema mismatches.

---

## 4. Access and Environment Inventories

Maintain sensitive credentials in a secure password manager (e.g., 1Password, Bitwarden). **NEVER commit `.env` files.**

### Critical Credentials to store:
- `SUPER_ADMIN_PASSWORD` (Initial admin setup)
- AWS/S3 Credentials (for backups and file storage)
- Database Master Password (`DB_PASSWORD`)
- Sentry DSN URLs (`SENTRY_LARAVEL_DSN`, `VITE_SENTRY_DSN`)
- PayMongo API Keys
- SMTP Credentials

### Environment Variables (.env)
A typical `.env` should look like this:
```env
APP_NAME="JVD System"
APP_ENV=production
APP_KEY=base64:...
APP_DEBUG=false
APP_URL=https://jvd.example.com

DB_CONNECTION=pgsql
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=jvd_erp
DB_USERNAME=postgres
DB_PASSWORD=YOUR_SECURE_PASSWORD

REDIS_HOST=redis
REDIS_PASSWORD=null
REDIS_PORT=6379

MAIL_MAILER=smtp
# ... SMTP settings

SENTRY_LARAVEL_DSN=https://...
VITE_SENTRY_DSN=https://...
```
