# Brightloop — Backend Core API

Welcome to the backend repository for the **Brightloop Software Subscription Management System**.

This codebase provides the backend foundation, security middleware, JWT authentication, role authorization, Zod validation, and API structures.

---

## 👥 Team Collaboration Guidelines

| Member | Focus Area | Status / Hand-off |
| :--- | :--- | :--- |
| **Member 1 (Frontend)** | React / Vite UI | Connect to `http://localhost:5000/api/v1`. Send `Authorization: Bearer <token>` on protected routes. |
| **Member 2 (Core Backend - Current)** | Express Foundation, Auth, Validation, Middleware | **FOUNDATION COMPLETE & READY** |
| **Member 3 (Database)** | PostgreSQL & `schema.prisma` | Define `User`, `Customer`, `Product`, `Plan` models in `prisma/schema.prisma` and run `npx prisma generate`. |
| **Member 4 (Subscription Logic)** | Invoices, Subscriptions, Billing, Payments | Build subscription lifecycle endpoints using the existing controllers/services pattern. |

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy the `.env.example` file to `.env`:
```bash
cp .env.example .env
```
Default port is `5000`.

### 3. Start the Development Server
```bash
npm run dev
```

The server will be available at `http://localhost:5000`.

---

## 📡 API Contract & Response Format

All API endpoints strictly return a predictable JSON envelope.

### Success Response
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "c123...",
      "email": "customer@example.com",
      "name": "Jane Doe",
      "role": "Customer"
    },
    "token": "eyJhbGciOiJIUzI1Ni..."
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Request validation failed",
  "code": "VALIDATION_ERROR",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email address format"
    },
    {
      "field": "password",
      "message": "Password must be at least 8 characters long"
    }
  ]
}
```

---

## 🔒 Authentication & Role-Based Access Control (RBAC)

### Roles
- `Admin`: Full system access, can create `Staff` accounts and manage products/plans.
- `Staff`: Can create and manage customers, products, plans, and quotations.
- `Customer`: Can view available plans/products, and access only their own subscriptions and invoices.

### Header Format
Send the JWT token in the `Authorization` HTTP header for protected routes:
```http
Authorization: Bearer <your_jwt_token_here>
```

---

## 🛣️ Available Core Endpoints

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Public | System status and database readiness check |
| `POST` | `/api/v1/auth/register` | Public | Register a new user (`Customer` by default) |
| `POST` | `/api/v1/auth/login` | Public | Log in with email and password |
| `GET` | `/api/v1/auth/me` | Authenticated | Fetch current logged-in user profile |
| `POST` | `/api/v1/auth/staff` | Admin Only | Create a new `Staff` account |
| `GET` | `/api/v1/customers` | Admin, Staff | List all customers |
| `GET` | `/api/v1/customers/:id` | Admin, Staff, Owner | View a specific customer |
| `POST` | `/api/v1/customers` | Admin, Staff | Create a customer |
| `PUT` | `/api/v1/customers/:id` | Admin, Staff | Update customer details |
| `GET` | `/api/v1/products` | Public | List products and variants |
| `GET` | `/api/v1/products/:id` | Public | View a specific product |
| `POST` | `/api/v1/products` | Admin, Staff | Create product with variants |
| `PUT` | `/api/v1/products/:id` | Admin, Staff | Update product |
| `GET` | `/api/v1/plans` | Public | List subscription plans |
| `GET` | `/api/v1/plans/:id` | Public | View a specific plan |
| `POST` | `/api/v1/plans` | Admin, Staff | Create subscription plan |
| `PUT` | `/api/v1/plans/:id` | Admin, Staff | Update subscription plan |

---

## 🔌 Integration Instructions for Member 3 (Database Lead)

1. Member 3 owns `prisma/schema.prisma`.
2. Once Member 3 writes the schema and runs:
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   ```
3. The Prisma client in `src/config/db.js` will automatically link to the live models.
4. No changes to the controllers or routing structure will be required.
