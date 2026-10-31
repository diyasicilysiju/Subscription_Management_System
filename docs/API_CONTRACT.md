# Brightloop API Contract & Specification

This document defines the REST API specification for the **Brightloop Subscription Management System**, coordinated between Member 1 (Frontend), Member 2 (Core Backend), and Member 4 (Subscriptions & Invoices).

Base URL: `http://localhost:5000/api/v1`

---

## 1. Global Standards & Envelope

All API responses follow a unified envelope.

### Success Envelope
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Envelope
```json
{
  "success": false,
  "message": "Human readable summary error message",
  "code": "VALIDATION_ERROR | NOT_FOUND | UNAUTHORIZED | FORBIDDEN | CONFLICT | BAD_REQUEST",
  "errors": [
    {
      "field": "fieldName",
      "message": "Specific field error description"
    }
  ]
}
```

### Authentication Header
Protected routes require a JSON Web Token provided in the `Authorization` header:
```http
Authorization: Bearer <jwt_token>
```

---

## 2. Authentication & Authorization

### `POST /auth/register` (Public)
Register a new customer account.
- **Request Body**:
  ```json
  {
    "email": "customer@example.com",
    "password": "Password123!",
    "name": "Acme Rep",
    "phone": "+1-555-0100"
  }
  ```
- **Response**: `201 Created`
  ```json
  {
    "success": true,
    "message": "User registered successfully",
    "data": {
      "user": { "id": "uuid", "email": "customer@example.com", "role": "CUSTOMER", "firstName": "Acme", "lastName": "Rep" },
      "token": "eyJhbGci..."
    }
  }
  ```

### `POST /auth/login` (Public)
Log in with credentials.
- **Request Body**:
  ```json
  {
    "email": "admin@brightloop.io",
    "password": "Password123!"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "user": { "id": "uuid", "email": "admin@brightloop.io", "role": "ADMIN", "firstName": "Brightloop", "lastName": "Admin" },
      "token": "eyJhbGci..."
    }
  }
  ```

### `GET /auth/me` (Authenticated)
Fetch currently authenticated user profile and associated customer record (if customer).
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "uuid",
        "email": "john.doe@acme.com",
        "role": "CUSTOMER",
        "firstName": "John",
        "lastName": "Doe",
        "customer": { "id": "uuid", "companyName": "Acme Corp", "status": "ACTIVE" }
      }
    }
  }
  ```

### `POST /auth/staff` (Admin Only)
Provision a new internal Staff account.
- **Request Body**:
  ```json
  {
    "email": "agent@brightloop.io",
    "password": "Password123!",
    "name": "Support Agent",
    "phone": "+1-555-0102"
  }
  ```

---

## 3. Customer Management

### `GET /customers` (Admin, Staff)
Query parameters: `?search=acme&status=ACTIVE&page=1&limit=20`

### `GET /customers/:id` (Admin, Staff, or Customer Owner)

### `POST /customers` (Admin, Staff)
Create customer profile.

### `PUT /customers/:id` (Admin, Staff)

### `DELETE /customers/:id` (Admin, Staff)
Soft-deactivates customer record (`status: INACTIVE`).

---

## 4. Products & Variants

### `GET /products` (Public)
Query parameters: `?search=cloud&isActive=true&page=1&limit=20`

### `GET /products/:id` (Public)
Includes all active variants and prices.

### `POST /products` (Admin, Staff)
Create product with optional initial variants.

### `PUT /products/:id` (Admin, Staff)

### `POST /products/:id/variants` (Admin, Staff)
Add variant (e.g. Odoo brand with price adjustment).

---

## 5. Subscription Plans

### `GET /plans` (Public)
Query parameters: `?billingInterval=MONTHLY&isActive=true`

### `GET /plans/:id` (Public)

### `POST /plans/:id/validate-quantity` (Public / System)
Validate `quantity >= minQuantity`.
- **Request Body**: `{ "quantity": 3 }`
- **Response**: `200 OK` `{ "valid": true, "minQuantity": 1 }` or `400 Bad Request` with error code `PLAN_MIN_QUANTITY_NOT_MET`.

### `POST /plans` (Admin, Staff)

### `PUT /plans/:id` (Admin, Staff)

---

## 6. Subscriptions, Invoices & Payments (Member 4 Integration)

- `GET /subscriptions` & `GET /subscriptions/:id`
- `POST /subscriptions/:id/pause`, `POST /subscriptions/:id/resume`, `POST /subscriptions/:id/cancel`
- `GET /quotations`, `POST /quotations`, `POST /quotations/:id/convert`
- `GET /invoices`, `GET /invoices/:id`, `POST /invoices/:id/confirm`, `POST /invoices/:id/cancel`
- `GET /payments`, `POST /payments`
- `GET /discounts`, `POST /discounts`
- `GET /taxes`, `POST /taxes`
- `GET /reports/summary`, `GET /reports/revenue`
