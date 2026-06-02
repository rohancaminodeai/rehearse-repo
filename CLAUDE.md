# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Next.js dev server on :3000
npm run build      # production build (Next standalone output)
npm test           # full Vitest suite (uses pg-mem, no DB needed)
npx vitest run lib/db.test.ts                       # single file
npx vitest run -t "AC3"                              # single test by name
npx tsc --noEmit   # type check only (no emit; tsconfig has noEmit: true)
```

Docker (full stack with Postgres):
```bash
docker compose up --build       # web + postgres on :3000
docker compose down -v          # stop and wipe volumes
```

## Pre-commit hook

`.claude/hooks/precommit-check.sh` is wired in `.claude/settings.json` as a `PreToolUse` hook on `Bash`. Before any `git commit` runs, it executes **`tsc --noEmit` → `npm run build` → `npm test`** and blocks the commit on failure. Fix the underlying issue rather than bypassing — `--no-verify` does not skip this hook (it's at the harness layer, not git).

## Architecture

**Single Next.js 15 App Router app**, server-rendered + Server Actions. There is no separate API layer and no client-side data fetching — all mutations go through `app/actions.ts` (`"use server"`), all reads happen in server components that call `lib/db.ts` directly. Pages are marked `export const dynamic = "force-dynamic"` because they depend on cookies.

**Auth model** (intentionally minimal — MVP):
- **Trainer**: shared `TRAINER_PASSWORD` env var. Login sets a plain `trainer=1` cookie (no signing — the cookie just records that the env-password check passed).
- **Customer**: password **is** the identity. `authenticateCustomer(pw)` scans all customers and verifies via scrypt. On success, sets `cust=<id>.<hmac>` via `lib/session.ts` — HMAC-signed so the id cannot be forged.

**Critical invariants** — break these and the security model collapses:
1. **Customer passwords must be unique.** `createCustomer` rejects with `DUPLICATE_PASSWORD` if `authenticateCustomer(pw)` already matches. If you bypass this, two customers with the same password become indistinguishable and one will see the other's data.
2. **Ownership before mutation.** `db.toggleReaction(customerId, recordId, emoji)` verifies `recordId` belongs to `customerId` before writing, and silently no-ops otherwise (anti-IDOR — see `lib/db.test.ts` "non-owner cannot react"). Any new per-record mutation must do the same.
3. **Server-side upload validation.** `accept="image/*"` in the form is client-only. `validateUpload` enforces size (≤5MB) and extension allowlist server-side in `addRecordAction`. Validation redirects (`/trainer?error=upload`) happen **outside** any try/catch — Next.js implements `redirect()` by throwing, and a catch would swallow it.
4. **Path-traversal-safe image serving.** `app/uploads/[name]/route.ts` strips everything but `[\w.-]` from the filename before `join(UPLOAD_DIR, ...)`. Stored filenames are also random-prefixed by `addRecordAction` (`randomBytes(8).toString("hex") + "-" + sanitized`).

**`lib/db.ts` pool/ready pattern** — non-obvious:
- `setPool(p)` lets tests inject a `pg-mem` pool; **it also resets `_ready`** so the schema is re-initialized against the fresh in-memory DB. New tests must `beforeEach(() => db.setPool(new pg.Pool()))` (see `lib/db.test.ts:6-9`).
- `ready()` deliberately clears `_ready` on failure (the `.catch` in `lib/db.ts`) so a transient DB error (Postgres warming up) doesn't permanently poison the cached promise. Don't "simplify" this to a one-shot init.
- The pg `Pool` has an `error` handler attached — without it, an idle-client error from a Postgres restart crashes the Node process.

**Schema is created by `ready()`**, not by migrations. There is no migration tool. To add a column, edit the `CREATE TABLE IF NOT EXISTS` in `ready()` *and* add an `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for existing DBs (or document a `docker compose down -v` reset for MVP).

## Spec-Driven Development workflow

This project follows the process in `docs/task-breakdown.md`:
1. Add the task to `docs/task-breakdown.md` with size + AC.
2. Write a plan doc at `docs/plans/<YYYYMMDD>_<task>-<slug>.md` using `docs/TEMPLATE.md` (must include Business-rule check covering the 4 invariants above).
3. Review plan — if the task adds new DB functions that FE must import, specify exact signatures in the plan's "Approach → Interface contract" table before proceeding.
4. `Workflow({ name: "implement-task", args: "<taskId>" })` — DB, BE, and FE agents implement in parallel → verify gate passes → PR.
5. Mark task ✅ DONE in `docs/task-breakdown.md`.

`SPEC.md` is the source of truth for Module 1 acceptance criteria; do not change AC1–AC5 semantics without updating SPEC.md.

## Implementation agents

Three persistent specialists implement each task simultaneously. Do not implement tasks manually — always invoke via the workflow above.

| Agent | Files owned | Responsibility |
|-------|-------------|----------------|
| `db-agent` | `lib/db.ts`, `lib/db.test.ts` | Schema DDL, all Postgres queries, pg-mem TDD |
| `be-agent` | `lib/measurement.ts`, `lib/session.ts`, `lib/upload.ts`, `lib/reactions.ts` + their test files | Pure business logic, validators, TDD |
| `fe-agent` | all `app/` files | Pages, server actions, CSS, error banners |

Each agent reads the plan doc independently and implements only its layer. If a task has no work for a given layer, that agent outputs "no changes for task \<id\>" and exits cleanly.

**Inter-agent coordination:** All three start at the same time — no agent can read another's live output. The plan doc is the coordination mechanism. Both the DB agent and the FE agent derive new function names and signatures from the plan's interface contract table. TypeScript in the verify phase (`tsc --noEmit`) catches any mismatch between what DB wrote and what FE imported.

## Path alias

`@/*` resolves to the project root (see `tsconfig.json:18`). Server components import as `@/lib/db`, `@/lib/session`, etc.

## Agents

**Implementation** — invoke via skill or workflow:
```
Skill({ skill: "implement-task", args: "<taskId>" })
// or equivalently:
Workflow({ name: "implement-task", args: "<taskId>" })
```
Launches `db-agent`, `be-agent`, and `fe-agent` in parallel. See "Implementation agents" section above.

**Code review** — invoke via skill:
```
Skill({ skill: "inbody-code-review" })
```
Runs `tsc --noEmit` + `npm test` + structured diff review (correctness / Next.js 15 / `pg` safety / TypeScript / test coverage).
