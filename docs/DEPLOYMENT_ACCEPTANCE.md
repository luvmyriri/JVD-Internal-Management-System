# Deployment acceptance gate

Production remains blocked until every row below has an owner, evidence link, and approval date. The application code can enforce technical gates; infrastructure access and business acceptance must be supplied by JVD.

| Gate | Evidence required | Owner | Status |
|---|---|---|---|
| Staging | `deployment:readiness` passes against PostgreSQL/Redis over HTTPS | IT | Pending environment |
| PayMongo | Test checkout completed and a signed `checkout_session.payment.paid` row is `processed` in `integration_events` | Accounting + IT | Checkout created; callback pending public URL |
| Reconciliation | Latest run is clean or every exception is resolved and signed | Accounting | Pending approved historical data |
| Opening balances | Maker-checker batch is approved and posted | Accounting + EVP | Pending approved figures |
| Backup | Nightly dump copied off-host; quarterly restore into temporary DB passes row-count checks | IT | Pending staging drill |
| Load | k6 thresholds pass on production-sized anonymized PostgreSQL data | IT | Pending staging data |
| Security | Dependency audits, public-route review, upload/IDOR regression suite, 2FA/RBAC test | IT + reviewer | Pending review |
| UAT | Sales, Accounting, Logistics, Travel, HR role scripts signed by department champions | Department heads | Pending staging |

Commands:

```bash
php artisan deployment:readiness --production
php artisan paymongo:verify-sandbox --amount=100
k6 run -e BASE_URL=https://staging-api.example.com/api/v1 -e AUTH_TOKEN=... tests/load/k6-sales-readiness.js
scripts/deploy/backup-db.sh
```

UAT must cover: multi-service draft/quote/confirm; joiner seat hold expiry; charter and educational allocation conflicts; PayMongo webhook replay; cancellation approval; credit-note posting; refund approval/payment; rebooking; driver leave and turnaround; invoice/receipt/SOA/manifest PDFs; reconciliation; and backup restore.
