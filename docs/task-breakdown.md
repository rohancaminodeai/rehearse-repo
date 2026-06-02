# InBody Dashboard — Task Breakdown

Source of truth for all work. Every task has a plan doc in `docs/plans/` before
implementation begins. Every task ships in exactly **1 PR**.

Process per task:
1. Add task here
2. Write `docs/plans/<YYYYMMDD>_<task>-<slug>.md` from `docs/TEMPLATE.md`
3. Review plan
4. `Workflow({ name: "implement-task", args: "<taskId>" })` — DB + BE + FE agents implement in parallel → verify passes → PR
5. Mark task ✅ DONE here

---

## Phase 0 — Foundation

**Goal.** App runs via `docker compose up`; tests pass; new contributor can start in ≤ 10 min.

**Exit criteria met ✅**

| Task | Title | Size | Status |
|------|-------|------|--------|
| 0.1 | Next.js 15 + TS + Vitest + Docker + Postgres scaffold | S | ✅ Done |
| 0.2 | SPEC.md + initial data model + auth decisions | S | ✅ Done |
| 0.3 | Add `docs/` structure: `task-breakdown.md`, `TEMPLATE.md`, `docs/plans/` | S | ✅ Done |

---

## Phase 1 — Auth & Core Data Layer

**Goal.** Postgres data layer with scrypt auth, HMAC sessions, upload validation, and resilience fixes.

**Exit criteria met ✅** — 12 unit tests green; robustness fixes #1–#5 shipped.

| Task | Title | Size | Status |
|------|-------|------|--------|
| 1.1 | `lib/db.ts`: customers + records CRUD, scrypt hashing (TDD AC1–AC5) | S | ✅ Done |
| 1.2 | `lib/session.ts`: HMAC-signed customer cookie | S | ✅ Done |
| 1.3 | `lib/upload.ts`: server-side size/type validation (TDD) | S | ✅ Done |
| 1.4 | Robustness fixes #1–#5: duplicate-pw rejection, ready-reset, pool error handler, corrupt-hash guard | S | ✅ Done |

---

## Phase 2 — Core Pages

**Goal.** Trainer admin + customer portal + image serving live in Docker; read-path integration-verified.

**Exit criteria met ✅**

| Task | Title | Size | Status |
|------|-------|------|--------|
| 2.1 | `app/trainer/page.tsx`: login + add customer + upload form | S | ✅ Done |
| 2.2 | `app/page.tsx`: customer portal (password gate + results list) | S | ✅ Done |
| 2.3 | `app/uploads/[name]/route.ts`: path-traversal-safe image serving | S | ✅ Done |

---

## Phase 3 — Measurement Metrics

**Goal.** Trainer inputs structured metrics (weight, muscle, body-fat%, score, date); customer sees metric cards with deltas and a body-fat trend sparkline. All logic TDD-covered.

**Exit criteria:** all AC below met; `npm test` green; Docker stack healthy.

| Task | Title | Size | PR | Status |
|------|-------|------|----|--------|
| 3.1 | Schema DDL: add metric columns + `measured_on` + `reactions` table | S | #2 | ✅ Done |
| 3.2 | `lib/measurement.ts`: `validateMeasurement` + `withDeltas` (TDD) | S | #3 | ✅ Done |
| 3.3 | Trainer form: image + metric inputs + `measured_on` date | M | #4 | ✅ Done |
| 3.4 | Customer view: metric cards with Δ deltas + body-fat trend sparkline | M | #5 | ✅ Done |

### AC per task
**3.1:** `ready()` DDL adds 4 metric columns (`weight`, `skeletal_muscle`, `body_fat_pct`, `inbody_score`), `measured_on DATE`, and `reactions` table; existing 12 tests still green.
**3.2:** `validateMeasurement` rejects out-of-range values (weight 20–300 kg, muscle 5–80 kg, body-fat 1–70%, score 0–100, date not in future); `withDeltas(records[])` annotates each record with Δ vs. prior; ≥ 8 TDD cases.
**3.3:** Trainer upload form adds 4 optional metric fields + `measured_on` date; server action calls `validateMeasurement`; invalid metric shows friendly error.
**3.4:** Customer portal shows metric card per record (`IB-<id>` key, ▲▼ Δ values); body-fat trend sparkline over last 7 records; graceful empty state when no metrics filled.

---

## Phase 4 — Emoji Reactions

**Goal.** Customer can toggle 5 emoji reactions on their own measurements. Non-owner is blocked at the DB layer (anti-IDOR). All logic TDD-covered.

**Exit criteria:** ownership check TDD-verified; reaction pills work in UI; bad emoji rejected.

| Task | Title | Size | PR | Status |
|------|-------|------|----|--------|
| 4.1 | `lib/reactions.ts` + `db.toggleReaction` + `db.getReactions` (ownership-enforced, TDD) | S | #6 | ✅ Done |
| 4.2 | Customer reaction UI: emoji pills + `toggleReaction` server action | S | #7 | ✅ Done |

### AC per task
**4.1:** `ALLOWED_EMOJI = ['👍','❤️','🔥','💪','😊']`; `validateReaction` rejects outside list; `toggleReaction(customerId, recordId, emoji)` verifies record ownership before writing (anti-IDOR B4); `getReactions(recordId)` returns `{emoji, count}`[]; ≥ 6 TDD cases (owner toggles on/off, non-owner blocked, invalid emoji rejected).
**4.2:** 5 emoji pills per record; tap toggles on/off (server action); count updates; non-owner cookie cannot react.

---

## Phase 5 — Error Handling & Robustness

**Goal.** No raw Next.js crash screen. Bad uploads and duplicate passwords surface as friendly banners. DB outage shows a graceful fallback.

**Exit criteria:** all error paths show user-friendly messages; `app/error.tsx` catches render-time failures.

| Task | Title | Size | PR | Status |
|------|-------|------|----|--------|
| 5.1 | Wire `validateUpload` + friendly error redirects + trainer banner + `app/error.tsx` | M | #8 | ✅ Done |

### AC
- `addMeasurementAction` calls `validateUpload`; invalid file → `redirect('/trainer?error=upload')` (outside try/catch)
- `createCustomerAction` catches `DUPLICATE_PASSWORD` → `redirect('/trainer?error=duppw')`
- DB/FS errors → `redirect('/trainer?error=server')`
- Trainer page reads `searchParams.error` and renders a colour-coded banner
- `app/error.tsx` renders "Something went wrong" with a retry button

---

## Phase 6 — UI Theme

**Goal.** Both pages match the Jira-style Korean health-green reference design. CSS-only PR — no logic changes.

**Exit criteria:** Pretendard font loaded; health-green tokens applied; card layout matches reference.

| Task | Title | Size | PR | Status |
|------|-------|------|----|--------|
| 6.1 | Restyle `/` + `/trainer`: health-green tokens, cards, `IB-<id>` key, Korean copy, Pretendard | M | #9 | ✅ Done |

### AC
- CSS vars: `--accent: #16a34a`, card `border-radius: 14px`, Pretendard + Bricolage Grotesque loaded
- Trainer: breadcrumb + `IB-<id>` key; customer card with upload affordance
- Customer: results as cards with metric summary, reaction pills, date stamp
- Pure CSS/layout — no server logic changes in this PR
