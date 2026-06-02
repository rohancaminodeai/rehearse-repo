#!/usr/bin/env bash
# Claude Code PreToolUse hook — runs before any git commit bash command.
# Receives JSON on stdin: { "tool_name": "Bash", "tool_input": { "command": "..." } }
# Exit 0 = allow, exit 2 = block with message shown to Claude.

INPUT=$(cat)

COMMAND=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('tool_input', {}).get('command', ''))
except Exception:
    print('')
" 2>/dev/null)

# Only intercept actual git commit commands
if ! echo "$COMMAND" | grep -qE 'git\s+commit'; then
  exit 0
fi

PROJECT_DIR="/Users/jaehyeonhan/Documents/inbody-dashboard"

echo "━━━ Pre-commit checks ━━━" >&2

# 1. TypeScript type check
echo "[1/3] TypeScript type check..." >&2
cd "$PROJECT_DIR" && npx tsc --noEmit 2>&1
TSC_EXIT=$?
if [ $TSC_EXIT -ne 0 ]; then
  echo "" >&2
  echo "BLOCKED: TypeScript type check failed. Fix type errors before committing." >&2
  exit 2
fi
echo "      ✓ Type check passed" >&2

# 2. Build
echo "[2/3] Build check..." >&2
cd "$PROJECT_DIR" && npm run build 2>&1
BUILD_EXIT=$?
if [ $BUILD_EXIT -ne 0 ]; then
  echo "" >&2
  echo "BLOCKED: Build failed. Fix build errors before committing." >&2
  exit 2
fi
echo "      ✓ Build passed" >&2

# 3. Tests
echo "[3/3] Tests..." >&2
cd "$PROJECT_DIR" && npm run test 2>&1
TEST_EXIT=$?
if [ $TEST_EXIT -ne 0 ]; then
  echo "" >&2
  echo "BLOCKED: Tests failed. Fix failing tests before committing." >&2
  exit 2
fi
echo "      ✓ Tests passed" >&2

echo "━━━ All checks passed — commit allowed ━━━" >&2
exit 0
