---
task: <task number, e.g., 3.2>
title: <task title>
size: <S | M | L>
status: draft  # draft → in-progress → complete
depends-on: <prior task numbers>
pr: <PR number when opened>
---

# <Task title>

> Copy this template to `docs/plans/<YYYYMMDD>_<task>-<slug>.md`. Do not edit `TEMPLATE.md` itself.

## Context

Why this work, now. Which Phase exit criterion in
[`docs/task-breakdown.md`](../task-breakdown.md) does this advance?

## Goals

- Observable outcome 1
- Observable outcome 2

## Non-Goals

- Explicitly out of scope for this PR (prevents scope creep)

## Approach

**Files touched:**

| File | Agent | Change |
|------|-------|--------|
| `lib/db.ts` | db-agent | added / modified |
| `lib/....ts` | be-agent | added / modified |
| `app/....tsx` | fe-agent | added / modified |

**Inter-agent interface contract** (fill in for any new DB functions that FE or BE must import — both agents derive signatures from this table, not from reading each other's files):

| Function | Full signature | Imported by |
|----------|---------------|-------------|
| `fnName` | `fnName(arg: Type): Promise<ReturnType>` | fe-agent via `import { fnName } from "@/lib/db"` |

Delete this table if the task adds no new DB exports.

**Implementation steps:**

1. Step 1
2. Step 2

## Business-rule check

For each rule that applies, state how the implementation honors it.

- [ ] Duplicate password uniqueness — how enforced
- [ ] Ownership / IDOR — how enforced
- [ ] Input validation (Zod or validate* helper) — where applied
- [ ] Auth boundary — customer sees only their own data

## Risks

- Risk and mitigation

## Open Questions

Items that need a decision **before** implementation. Do not assume defaults.

1. Question 1

## Test Plan

- [ ] `npm test` passes (all existing tests + new TDD cases)
- [ ] `docker compose up --build` → web + db healthy
- [ ] Feature-specific verification 1
- [ ] Feature-specific verification 2

## Rollout

- **Branch:** `feat/<task>-<short-slug>`
- **Migration / env changes:** list or "None"
- **Post-merge follow-ups:** list or "None"

## Summary (fill in after completion)

- **What changed:** files/modules touched
- **Outcome:** user-facing behavior change, test count
