#!/usr/bin/env bash
set -euo pipefail

SCRIPT_NAME="continuous-issue-resolution.sh"

# Argument handling
DRY_RUN=false

case "${1:-}" in
  "")
    # No arguments - normal execution
    ;;
  "--dry-run")
    DRY_RUN=true
    ;;
  *)
    printf 'Usage: %s [--dry-run]\n' "$0" >&2
    printf '  --dry-run    Simulate execution without running commands\n' >&2
    exit 2
    ;;
esac

# Logging setup with fallback
LOG_DIR=""
if [[ -w /var/log ]]; then
  LOG_DIR="/var/log"
else
  LOG_DIR="/tmp/made-harness-logs"
  mkdir -p "$LOG_DIR"
fi
LOG_FILE="$LOG_DIR/${SCRIPT_NAME%.sh}.log"

log() {
  local level="$1"; shift
  local timestamp message
  timestamp="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
  message="$timestamp [$level] $*"
  
  # Always log to stderr
  printf '%s\n' "$message" >&2
  
  # Append to log file if possible (never fail on logging errors)
  if [[ -w "$LOG_DIR" ]]; then
    printf '%s\n' "$message" >> "$LOG_FILE" 2>/dev/null || true
  fi
}

need_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    log ERROR "Missing dependency: $cmd"
    exit 1
  fi
}

run_step() {
  local desc="$1"; shift
  local cmd=("$@")
  
  if [[ "$DRY_RUN" == true ]]; then
    log INFO "[DRY-RUN] $desc"
    printf '%q ' "${cmd[@]}"
    printf '\n'
  else
    log INFO "$desc"
    "${cmd[@]}"
  fi
}

# Verify dependencies
need_cmd opencode

log INFO "Starting workflow: Continuous Issue Resolution"

# Step 1: Follow the instructions in @.opencode/commands/prp-issue-fix.md for the latest open issue on Github and take its investigation comment as the implementation plan
STEP1_DESCRIPTION="Follow the instructions in @.opencode/commands/prp-issue-fix.md for the latest open issue on Github and take its investigation comment as the implementation plan"
STEP1_PROMPT="Follow the instructions in @.opencode/commands/prp-issue-fix.md for the latest open issue on Github and take its investigation comment as the implementation plan"

cmd=(opencode run --format json --agent build)
if [[ "$DRY_RUN" == true ]]; then
  run_step "$STEP1_DESCRIPTION" "${cmd[@]}"
else
  printf '%s' "$STEP1_PROMPT" | run_step "$STEP1_DESCRIPTION" "${cmd[@]}"
fi

# Step 2: Follow the instructions in @.opencode/commands/commit-push.md
STEP2_DESCRIPTION="Follow the instructions in @.opencode/commands/commit-push.md"
STEP2_PROMPT="Follow the instructions in @.opencode/commands/commit-push.md"

cmd=(opencode run --format json --agent build)
if [[ "$DRY_RUN" == true ]]; then
  run_step "$STEP2_DESCRIPTION" "${cmd[@]}"
else
  printf '%s' "$STEP2_PROMPT" | run_step "$STEP2_DESCRIPTION" "${cmd[@]}"
fi

# Step 3: Only if the latest PR shows merge issues follow the instructions in @.opencode/commands/resolve-ci-errors.md
STEP3_DESCRIPTION="Only if the latest PR shows merge issues follow the instructions in @.opencode/commands/resolve-ci-errors.md"
STEP3_PROMPT="Only if the latest PR shows merge issues follow the instructions in @.opencode/commands/resolve-ci-errors.md"

cmd=(opencode run --format json --agent build)
if [[ "$DRY_RUN" == true ]]; then
  run_step "$STEP3_DESCRIPTION" "${cmd[@]}"
else
  printf '%s' "$STEP3_PROMPT" | run_step "$STEP3_DESCRIPTION" "${cmd[@]}"
fi

# Step 4: Follow the instructions in @.opencode/commands/prp-review.md for the latest PR.
STEP4_DESCRIPTION="Follow the instructions in @.opencode/commands/prp-review.md for the latest PR."
STEP4_PROMPT="Follow the instructions in @.opencode/commands/prp-review.md for the latest PR."

cmd=(opencode run --format json --agent build)
if [[ "$DRY_RUN" == true ]]; then
  run_step "$STEP4_DESCRIPTION" "${cmd[@]}"
else
  printf '%s' "$STEP4_PROMPT" | run_step "$STEP4_DESCRIPTION" "${cmd[@]}"
fi

# Step 5: Use the `gh` CLI to merge the latest PR if it was approved by the latest comment. Send a telegram message on the outcome.
STEP5_DESCRIPTION="Use the \`gh\` CLI to merge the latest PR if it was approved by the latest comment. Send a telegram message on the outcome."
STEP5_PROMPT="Use the \`gh\` CLI to merge the latest PR if it was approved by the latest comment. Send a telegram message on the outcome."

cmd=(opencode run --format json --agent build)
if [[ "$DRY_RUN" == true ]]; then
  run_step "$STEP5_DESCRIPTION" "${cmd[@]}"
else
  printf '%s' "$STEP5_PROMPT" | run_step "$STEP5_DESCRIPTION" "${cmd[@]}"
fi

# Step 6: Switch back to main and do a fresh git pull
STEP6_DESCRIPTION="Switch back to main and do a fresh git pull"
STEP6_PROMPT="Switch back to main and do a fresh git pull"

cmd=(opencode run --format json --agent build)
if [[ "$DRY_RUN" == true ]]; then
  run_step "$STEP6_DESCRIPTION" "${cmd[@]}"
else
  printf '%s' "$STEP6_PROMPT" | run_step "$STEP6_DESCRIPTION" "${cmd[@]}"
fi

log INFO "Workflow finished: Continuous Issue Resolution"