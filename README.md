# InBody Dashboard — MVP (Module 1)

A trainer uploads a customer's InBody result (image + comment). Each customer
opens **one shared link**, enters their personal password, and sees **only their
own** results. Built spec-first ([SPEC.md](SPEC.md)) with TDD; runs in Docker and
is ready to migrate to AWS.

## Stack
- **Next.js 15** (App Router, TypeScript) — UI + Server Actions in one app
- **Postgres** — maps directly to AWS RDS/Aurora later (just change `DATABASE_URL`)
- **scrypt** password hashing + **HMAC-signed** session cookie (Node stdlib)
- **Vitest** + **pg-mem** for TDD on the data layer (no DB needed to run tests)

## Run with Docker (recommended)
```bash
docker compose up --build        # starts web + postgres
# open http://localhost:3000          (customer shared link)
#      http://localhost:3000/trainer  (trainer admin)
```
Stop and wipe data: `docker compose down -v`.

Default secrets (override via env or a `.env` file — see [.env.example](.env.example)):
`TRAINER_PASSWORD=trainer123`, `SESSION_SECRET=dev-secret-change-me`.

## Run locally (without Docker)
```bash
npm install
# point DATABASE_URL at a local Postgres, then:
npm run dev      # http://localhost:3000
npm test         # 5/5 acceptance tests (SPEC AC1–AC5)
```

## How it works
| Role | Flow |
|------|------|
| **Trainer** | `/trainer` → log in (`TRAINER_PASSWORD`) → add a customer (name + password) → upload an image + comment for them |
| **Customer** | `/` (shared link) → enter their password → see their results (image + trainer comment, newest first) |

The password **identifies** the customer (passwords are unique per customer).
A wrong password is rejected; a customer can never see another customer's data.

## Architecture
```
SPEC.md                      source of truth (acceptance criteria)
lib/db.ts                    Postgres data layer + scrypt hashing   ← unit-tested
lib/session.ts               HMAC sign/verify of the customer cookie
app/actions.ts               server actions (trainer + customer auth, upload)
app/page.tsx                 customer portal (shared link, password gate)
app/trainer/page.tsx         trainer admin
app/uploads/[name]/route.ts  serves images from UPLOAD_DIR (path-traversal safe)
Dockerfile / docker-compose  web (Next standalone) + postgres:16 + volumes
```
Data model:
```
customers(id, name, password_hash, created_at)
records(id, customer_id, image_path, comment, created_at)
```
Images are stored in `UPLOAD_DIR` (a Docker volume) and served via `/uploads/<name>`.

## Migrating to AWS later
- **DB**: point `DATABASE_URL` at RDS/Aurora — no code change.
- **Images**: swap the `UPLOAD_DIR` volume for S3 in `app/actions.ts` +
  `app/uploads/[name]/route.ts`.
- **Web**: the standalone image runs on ECS/Fargate or App Runner as-is.

## Environment variables
| Var | Purpose |
|-----|---------|
| `DATABASE_URL` | Postgres connection string |
| `TRAINER_PASSWORD` | Shared trainer login password |
| `SESSION_SECRET` | Signs the customer session cookie |
| `UPLOAD_DIR` | Where uploaded images are stored |

## Security notes (MVP scope)
Auth is intentionally minimal: a shared trainer password, and password-as-identity
for customers. Passwords are scrypt-hashed and sessions are HMAC-signed (cookies
can't be forged), but real per-user accounts / password reset are a future module.

## Future modules (out of scope)
Structured metrics + trend charts · real per-user auth · multi-trainer · S3
storage · notifications.
