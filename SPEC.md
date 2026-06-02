# SPEC — InBody Dashboard, Module 1 (MVP)

Spec-Driven Development: this document is the source of truth. Tests are derived
from the Acceptance Criteria below; implementation must satisfy them.

## 1. Goal
A single InBody-result module. A **trainer** uploads a customer's InBody image +
comment. **Customers** open one shared link, enter their personal password, and
see only their own results.

## 2. Actors & Auth
| Actor | How they get in |
|-------|-----------------|
| Trainer | Visits `/trainer`, logs in with a shared `TRAINER_PASSWORD` (env). |
| Customer | Visits the single shared link `/`, enters their personal password. The password **identifies** the customer (passwords are unique per customer). |

- Customer passwords are stored as **salted scrypt hashes** — never plaintext.
- Customer session = a signed (HMAC) cookie carrying the customer id; it cannot
  be forged to view another customer's data.

## 3. Data Model (Postgres)
```
customers(id serial pk, name text, password_hash text, created_at timestamptz default now())
records(id serial pk, customer_id int fk->customers, image_path text, comment text, created_at timestamptz default now())
```
`image_path` stores the stored filename only; images live in `UPLOAD_DIR`
(a Docker volume) and are served via `/uploads/<name>`.

## 4. User Flows
1. **Trainer** `/trainer` → log in → add customer (name + password) → see customer
   list → upload an image + comment for a chosen customer.
2. **Customer** `/` (shared link) → enter password → sees their own results
   (image + trainer comment, newest first). Wrong password → error, no access.

## 5. Acceptance Criteria (→ unit tests)
- **AC1** `createCustomer(name, pw)` persists the customer and stores a hash that
  is **not** equal to `pw` (password is hashed).
- **AC2** `authenticateCustomer(pw)` returns the matching customer for a correct
  password and `null` for a wrong password.
- **AC3** Two customers with different passwords each authenticate to **their own**
  record set only (no cross-leakage).
- **AC4** `addRecord` + `getRecordsByCustomer` round-trips, newest first.
- **AC5** `listCustomers()` returns created customers (id + name, no hash).

## 6. Non-Functional / Ops
- Runs via `docker compose up` (web + postgres). App reads `DATABASE_URL`,
  `TRAINER_PASSWORD`, `SESSION_SECRET`, `UPLOAD_DIR`.
- Postgres maps to **AWS RDS/Aurora** later by swapping `DATABASE_URL`.
- Next.js `output: "standalone"` for a small production image.
- App code target: small MVP (~200 LOC, excluding config/Docker/tests).

## 7. Out of Scope (future modules)
Structured metrics + trend charts · real per-user accounts · multi-trainer ·
password reset · S3/object storage · notifications.
