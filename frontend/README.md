# Brightloop Subscription Management System — Frontend (Member 1)

Modern, responsive Single Page Application (SPA) built for Brightloop Software to manage the full subscription lifecycle: customer management, product catalogs & variants, recurring subscription plans, quotations, automated billing invoices, payment processing, discount policies, taxes, finance reports, and a self-service customer portal.

---

## 🛠️ Tech Stack
- **Framework:** React 19 (SPA)
- **Tooling:** Vite 6
- **Routing:** React Router v7
- **Styling:** Tailwind CSS v3
- **Data Fetching:** Axios (with central JWT request/response interceptors)
- **Icons:** Lucide React
- **Data Visualization & Charts:** Recharts

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` (defaults to backend running on port 5000):
```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

### 3. Start Development Server
```bash
npm run dev
```
The frontend will start at `http://localhost:5173`.

### 4. Build for Production
```bash
npm run build
```

---

## 🔑 Demo & Test Accounts (Pre-Seeded)

All seeded test accounts use the password: `Password123!`

| Role | Email | Password | Access Scope |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@brightloop.io` | `Password123!` | Full system administration, staff provisioning, plan and discount creation |
| **Staff** | `staff@brightloop.io` | `Password123!` | Day-to-day operations: customers, products, plans, quotes, billing, reports |
| **Customer** | `john.doe@acme.com` | `Password123!` | Dedicated customer portal: subscriptions, invoices, and online card payments |

*Note: The login page includes 1-click quick fill buttons for each role for instant verification.*

---

## 🧭 Page Routes & Role Access

### 1. Authentication
- `/login` — Login with email and password
- `/register` — Customer account creation with live password complexity validation (>8 characters, uppercase, lowercase, special character/number)
- `/forgot-password` — Password reset request dispatcher
- `/reset-password` — Password update with token verification

### 2. Admin & Staff Operations (Protected by `ADMIN` & `STAFF`)
- `/dashboard` — Live operational dashboard with MRR, active contracts, overdue alerts, and Recharts trends
- `/customers` — Paginated customer directory with search, status filters, creation, and deactivation
- `/products` — Software product catalog, base sales and cost margins, and SKU variant tier configuration (e.g. Odoo brand +$560 delta)
- `/plans` — Recurring billing cadences (Daily, Weekly, Monthly, Yearly), trial days, and `minQuantity` seat constraint validation
- `/quotations` — Quotation generator from templates, validity windows, and 1-click conversion to live subscriptions
- `/subscriptions` — Subscription lifecycle manager: active, paused, cancelled, and auto-renewals
- `/invoices` — Itemized billing statements with frozen tax snapshots, confirming, sending, and printable invoice viewer
- `/payments` — Multi-method payment ledger (Credit Card, Wire Transfer, Stripe, Cash) allocated against invoices
- `/discounts` — Admin-exclusive discount policies: percentage or fixed reduction, seat volume triggers, and expiration caps
- `/taxes` — Tax jurisdictions and automated billing tax calculation preview
- `/reports` — End-of-month finance overview: gross/net recognized revenue, cash collected, and AR aging
- `/staff` — Internal staff provisioning (`POST /api/v1/auth/staff`) — **Admin Only**
- `/settings` — Company invoicing identity and backend API health monitor

### 3. Customer Portal (Protected by `CUSTOMER`)
- `/portal/dashboard` — Portal home: active subscriptions, next renewal date, and open balance
- `/portal/subscriptions` — Self-service plan viewer: pause, resume, cancel, or renew
- `/portal/invoices` — Billing history, downloadable receipts, and online payment settlement
- `/portal/payments` — Receipt ledger with transaction references
- `/portal/profile` — Corporate billing address and tax ID management
