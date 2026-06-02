export const meta = {
  name: 'implement-task',
  description: 'Implement a planned InBody Dashboard task — DB, BE, and FE specialists run in parallel',
  phases: [
    { title: 'Implement', detail: 'DB, BE, and FE specialists start simultaneously' },
    { title: 'Verify',    detail: 'precommit-check.sh: tsc + build + test' },
  ],
}

const taskId = args

// ── Phase 1: All 3 agents launch at the same time ─────────────────────────
phase('Implement')
log(`Task ${taskId} — launching DB, BE, and FE agents in parallel…`)

await parallel([
  () => agent(
    `Task ID: ${taskId}\n\nYou are the DB specialist. Follow your agent instructions.`,
    { label: 'DB', phase: 'Implement', agentType: 'db-agent' }
  ),
  () => agent(
    `Task ID: ${taskId}\n\nYou are the BE specialist. Follow your agent instructions.`,
    { label: 'BE', phase: 'Implement', agentType: 'be-agent' }
  ),
  () => agent(
    `Task ID: ${taskId}\n\nYou are the FE specialist. Follow your agent instructions.`,
    { label: 'FE', phase: 'Implement', agentType: 'fe-agent' }
  ),
])

// ── Phase 2: Verify combined result ───────────────────────────────────────
phase('Verify')
log('All agents done — running precommit check…')

await agent(
  `Run the precommit check for InBody Dashboard at /Users/jaehyeonhan/Documents/inbody-dashboard.

Execute: bash .claude/hooks/precommit-check.sh

This runs tsc, build, and tests — the same gate as real commits.

Report:
- If all pass: "Task ${taskId} verified — tsc clean, build ok, all tests passing."
- If anything fails: list each failure with file:line so the developer can fix before committing.`,
  { label: 'verify', phase: 'Verify' }
)
