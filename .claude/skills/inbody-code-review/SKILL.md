---
name: inbody-code-review
description: Comprehensive code review for the InBody Dashboard (Next.js 15 + TypeScript + PostgreSQL). Reviews diffs for bugs, type errors, security issues, and Next.js best practices. Runs tsc type check and Vitest tests. Use whenever asked to review code, audit changes, check a diff, or verify code quality in this project.
---

# InBody Dashboard Code Review

Project: Next.js 15 · TypeScript · React 19 · PostgreSQL (`pg`) · Vitest  
Root: `/Users/jaehyeonhan/Documents/inbody-dashboard`

---

## Step 1 — Gather Changes

```bash
git diff --staged          # staged changes (about to commit)
git diff HEAD              # all uncommitted changes
git diff HEAD~1 HEAD       # last commit
```

Use whichever scope the user requested. When unclear, default to `git diff HEAD`.

---

## Step 2 — TypeScript Type Check

```bash
cd /Users/jaehyeonhan/Documents/inbody-dashboard && npx tsc --noEmit 2>&1
```

Type errors are **Critical** blockers. List every error with file:line.

---

## Step 3 — Run Tests

```bash
cd /Users/jaehyeonhan/Documents/inbody-dashboard && npm run test 2>&1
```

Failing tests are **Critical** blockers. Show which tests failed and why.

---

## Step 4 — Review the Diff

For each changed file, evaluate these dimensions:

### Correctness
- Logic errors, wrong conditions, off-by-one
- Unhandled promises / missing `await`
- Error handling only at system boundaries (user input, DB calls, external APIs) — not inside internal functions

### Next.js 15 Specifics
- `'use client'` must be explicit on any component that uses browser APIs, state, or effects
- Server components should be `async` only when they fetch data
- Route handlers in `app/api/` use `NextRequest` / `NextResponse`
- No direct DB calls from client components

### Database Safety (pg)
- All user input goes through parameterized queries — `$1, $2` placeholders only; never string interpolation in SQL
- Connections released after every query (use `try/finally`)
- Multi-step writes wrapped in a transaction

### TypeScript Quality
- No unexplained `any` — if truly needed, add a comment explaining why
- Non-null assertions (`!`) on values that could realistically be null

### Test Coverage
- New public functions or API routes should have at least one test
- Tests cover both the happy path and one error/edge case

---

## Output Format

Group findings by severity:

| Severity | Meaning |
|----------|---------|
| **Critical** | Bug, security issue, broken build/test — must fix before merging |
| **Warning** | Type issue, missing error handling, likely problem in practice |
| **Info** | Minor improvement, style suggestion |

Format each finding as:
```
[Severity] path/to/file.ts:line — short description
  Why: ...
  Fix: ...
```

End with a summary line:
- `N critical, M warnings, K info issues found.`
- Or: `Review passed — no issues found.`
