# JVD Internal Management System

> Internal Paperless Operations Platform for JVD Events and Travels Management Co.

## Architecture

| Layer | Stack |
|-------|-------|
| **Frontend** | React 19 + TypeScript + Vite + Tailwind CSS v4 |
| **Backend** | Laravel 13 (PHP 8.4) |
| **Database** | PostgreSQL |
| **Auth** | Laravel Sanctum + Google Authenticator TOTP (2FA) |

## Project Structure

```
JVD-Internal-Management-System/
├── api-contracts/           # OpenAPI/YAML API specs (the bridge between FE & BE)
│   ├── auth.yaml
│   ├── users.yaml
│   ├── purchase-orders.yaml
│   ├── job-orders.yaml
│   ├── work-orders.yaml
│   └── ...
├── frontend/                # React + TypeScript + Vite
│   └── src/
│       ├── api/             # Axios client + endpoint wrappers
│       ├── components/      # Reusable UI (ui/, layout/, forms/)
│       ├── pages/           # Route-level page components
│       │   ├── accounting/
│       │   ├── procurement/
│       │   ├── inventory/
│       │   ├── travel/
│       │   ├── hr/
│       │   └── admin/
│       ├── context/         # AuthProvider (React Context)
│       ├── guards/          # AuthGuard, RoleGuard
│       ├── hooks/           # Custom React hooks
│       ├── types/           # TypeScript interfaces (from API contracts)
│       ├── constants/       # Roles, statuses, config
│       └── utils/           # Helper functions
├── backend/                 # Laravel 13
│   └── app/
│       ├── Http/
│       │   ├── Controllers/ # Thin controllers by department
│       │   ├── Middleware/  # CheckRole, AuditLogger, VerifyTwoFactor
│       │   ├── Services/    # Business logic layer
│       │   ├── Requests/    # Form request validation
│       │   └── Resources/   # API response transformers
│       ├── Models/          # Eloquent models (all ER entities)
│       ├── Policies/        # Authorization policies per model
│       └── ...
└── README.md
```

## Quick Start

### Frontend
```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev        # → http://localhost:3000
```

### Backend
```bash
cd backend
cp .env.example .env
# Configure DB_CONNECTION=pgsql and PostgreSQL credentials in .env
composer install
php artisan key:generate
php artisan migrate
php artisan serve   # → http://localhost:8000
```

## Team

| Developer | Track | Responsibilities |
|-----------|-------|-------------------|
| **Val Javez Lamsen** | Lead / Fullstack | Architecture, API contracts, code reviews, DevOps |
| **John Emmanuel Nalang** | Backend (Laravel) | API endpoints, migrations, business logic, 2FA, PDF |
| **Jerald Galdiano** | Frontend Lead (React) | Component architecture, routing, state, API integration |
| **Gregory Estioko Jr.** | Frontend Dev (React) | UI implementation, forms, tables, dashboards, responsive |

## Development Workflow

1. **API Contract-First** — Val maintains `api-contracts/*.yaml` specs
2. **Feature Branches** — `feature/[FE|BE]-[number]-short-description`
3. **PR-Based** — All merges through Pull Requests with approval
4. **Squash Merge** — One commit per feature in `develop`

See `JVD_Development_Guide.pdf` for full standards.

---

*JVD Events and Travels Management Co. — Confidential*