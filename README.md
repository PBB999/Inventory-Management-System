# RetailOS — Omnichannel POS & Inventory Management System

Production-ready, cloud-native Point of Sale and Inventory Management platform for multi-location retail.

---

## Full Project Structure

```
pos-system/
├── backend/
│   ├── src/
│   │   ├── config/           database.ts, redis.ts
│   │   ├── controllers/      auth, product, order, inventory, report,
│   │   │                     customer, forecast
│   │   ├── middleware/        auth (JWT + RBAC), errorHandler, notFound
│   │   ├── models/           User, Store, Product, Inventory, Order, Customer
│   │   ├── routes/           auth, products, orders, inventory, reports,
│   │   │                     customers, stores, users
│   │   ├── tests/            auth.test.ts, inventory.test.ts
│   │   └── utils/            logger.ts, seed.ts
│   ├── Dockerfile, jest.config.js, package.json, tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── components/       Layout, LowStockBanner, ui (Modal/Table/Pagination),
│   │   │                     pos/CustomerLookup, inventory/TransferModal
│   │   ├── context/          OfflineContext (queue + auto-sync)
│   │   ├── hooks/            useApi, useBarcodeScanner, useLocalStorage
│   │   ├── pages/            Login, Dashboard, POS, Orders, Inventory,
│   │   │                     Products, Customers, Reports, Users, Stores
│   │   ├── store/            authStore (JWT), cartStore (computed totals)
│   │   ├── types/            index.ts (all shared interfaces)
│   │   └── utils/            api.ts (Axios), helpers.ts
│   ├── Dockerfile, nginx.conf, package.json, vite.config.ts,
│     tailwind.config.js, postcss.config.js, tsconfig.json
│
├── .github/workflows/ci.yml
├── docker-compose.yml
└── README.md
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, Zustand, TanStack Query, Recharts |
| Backend | Node.js 20, Express.js, TypeScript |
| Database | MongoDB 7 via Mongoose (ACID transactions) |
| Cache | Redis 7 — product catalog (5-min TTL), inventory (1-min TTL) |
| Auth | JWT — roles: admin / inventory_manager / cashier |
| Deployment | Docker Compose, Nginx, GitHub Actions CI/CD |

---

## Quick Start

### Docker (recommended)
```bash
cd pos-system
cp backend/.env.example backend/.env
docker-compose up -d
# App → http://localhost:3000
# API → http://localhost:5000/health
```

### Local Development
```bash
# Infra (Docker)
docker run -d -p 27017:27017 mongo:7.0
docker run -d -p 6379:6379 redis:7.2-alpine

# Backend
cd backend && npm install
cp .env.example .env
npm run seed      # populate demo data
npm run dev       # http://localhost:5000

# Frontend
cd frontend && npm install
npm run dev       # http://localhost:3000
```

---

## Demo Accounts (post-seed)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@retailos.com | password123 |
| Inventory Manager | inventory@retailos.com | password123 |
| Cashier (Mumbai) | cashier.mumbai@retailos.com | password123 |
| Cashier (Pune) | cashier.pune@retailos.com | password123 |

Seed data includes: 3 stores, 8 products (32 variants), full inventory for each store, 5 customers.

---

## API Endpoints

**Auth** — POST /login · GET /me · PATCH /change-password  
**Products** — GET / · GET /barcode/:code · POST · PUT /:id · DELETE /:id  
**Orders** — POST / · GET / · GET /:id · PATCH /:id/refund · POST /sync-offline  
**Inventory** — GET / · GET /low-stock · GET /store/:id · POST /adjust · POST /transfer  
**Reports** — GET /kpis · GET /sales · GET /top-products · GET /payments · GET /forecast  
**Customers** — GET / · GET /top · GET /phone/:phone · POST · PUT /:id  
**Stores / Users** — Full CRUD (admin only)

---

## Key Features

- **ACID Transactions** — MongoDB sessions on order creation and stock transfers; full rollback on any failure
- **Redis Caching** — Product catalog (5-min TTL) and inventory (1-min TTL) with automatic write-through invalidation
- **Offline POS** — Orders queued in `localStorage`; auto-synced to server on reconnect via `OfflineContext`
- **Barcode Scanner** — `useBarcodeScanner` hook detects HID scanner input (rapid keystrokes + Enter) without blocking normal typing
- **Sales Forecasting** — 30-day velocity analysis per SKU/store; computes reorder urgency and suggests reorder parameters
- **RBAC** — Three roles enforced at middleware level on every protected route
- **Customer Loyalty** — Auto-upsert on checkout; loyalty points (₹100 = 1 point), tier badges (Bronze/Silver/Gold/Platinum)

---

## Tests

```bash
cd backend
npm test                    # unit tests
npm test -- --coverage      # coverage report
```
