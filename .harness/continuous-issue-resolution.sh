#!/usr/bin/env bash
set -euo pipefail

SCRIPT_NAME="continuous-issue-resolution.sh"
WORKFLOW_NAME="Continuous Issue Resolution"
WORKFLOW_SLUG="continuous-issue-resolution"

DRY_RUN=false
RUN_STEP_PROMPT=""

usage() {
  printf 'Usage: %s [--dry-run]\n' "$SCRIPT_NAME" >&2
}

if [[ $# -eq 0 ]]; then
  :
elif [[ $# -eq 1 ]]; then
  case "$1" in
    --dry-run)
      DRY_RUN=true
      ;;
    *)
      usage
      exit 2
      ;;
  esac
else
  usage
  exit 2
fi

PREFERRED_LOG_FILE="/var/log/${WORKFLOW_SLUG}.log"
FALLBACK_LOG_DIR="/tmp/made-harness-logs"
FALLBACK_LOG_FILE="${FALLBACK_LOG_DIR}/${WORKFLOW_SLUG}.log"

LOG_FILE=""
if { [[ -e "$PREFERRED_LOG_FILE" ]] && [[ -w "$PREFERRED_LOG_FILE" ]]; } || { [[ ! -e "$PREFERRED_LOG_FILE" ]] && [[ -d /var/log ]] && [[ -w /var/log ]]; }; then
  LOG_FILE="$PREFERRED_LOG_FILE"
else
  mkdir -p "$FALLBACK_LOG_DIR" 2>/dev/null || true
  if : >>"$FALLBACK_LOG_FILE" 2>/dev/null; then
    LOG_FILE="$FALLBACK_LOG_FILE"
  fi
fi

log() {
  local level="$1"
  shift
  local timestamp message line

  timestamp="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
  message="$*"
  line="${timestamp} [${level}] ${message}"

  printf '%s\n' "$line" >&2 || true
  if [[ -n "$LOG_FILE" ]]; then
    printf '%s\n' "$line" >>"$LOG_FILE" 2>/dev/null || true
  fi
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    log ERROR "Missing dependency: $1"
    exit 1
  }
}

run_step() {
  local desc="$1"
  shift
  local cmd=("$@")

  if [[ "$DRY_RUN" == true ]]; then
    log INFO "[DRY-RUN] $desc"
    printf '%q ' "${cmd[@]}"
    printf '\n'
    return 0
  fi

  log INFO "$desc"
  if [[ -n "$RUN_STEP_PROMPT" ]]; then
    printf '%s' "$RUN_STEP_PROMPT" | "${cmd[@]}"
  else
    "${cmd[@]}"
  fi
}

need_cmd opencode

log INFO "Starting workflow: ${WORKFLOW_NAME}"

# Step 1: agent build
STEP1_DESCRIPTION="If not on main, switch back to main and do a fresh git pull"
STEP1_PROMPT="If not on main, switch back to main and do a fresh git pull"
cmd=(opencode run --format json --agent build)
RUN_STEP_PROMPT="$STEP1_PROMPT"
run_step "$STEP1_DESCRIPTION" "${cmd[@]}"

# Step 2: agent build
STEP2_DESCRIPTION="Follow the instructions in @.opencode/commands/prp-issue-fix.md for the latest open issue on Github and take its investigation comment as the implementation plan"
STEP2_PROMPT="Follow the instructions in @.opencode/commands/prp-issue-fix.md for the latest open issue on Github and take its investigation comment as the implementation plan"
cmd=(opencode run --format json --agent build)
RUN_STEP_PROMPT="$STEP2_PROMPT"
run_step "$STEP2_DESCRIPTION" "${cmd[@]}"

# Step 3: agent build
STEP3_DESCRIPTION="Follow the instructions in @.opencode/commands/commit-push.md"
STEP3_PROMPT="Follow the instructions in @.opencode/commands/commit-push.md"
cmd=(opencode run --format json --agent build)
RUN_STEP_PROMPT="$STEP3_PROMPT"
run_step "$STEP3_DESCRIPTION" "${cmd[@]}"

# Step 4: agent build
STEP4_DESCRIPTION="Only if the latest PR shows merge issues follow the instructions in @.opencode/commands/resolve-ci-errors.md"
STEP4_PROMPT="Only if the latest PR shows merge issues follow the instructions in @.opencode/commands/resolve-ci-errors.md"
cmd=(opencode run --format json --agent build)
RUN_STEP_PROMPT="$STEP4_PROMPT"
run_step "$STEP4_DESCRIPTION" "${cmd[@]}"

# Step 5: agent build
STEP5_DESCRIPTION="Follow the instructions in @.opencode/commands/prp-review.md for the latest PR."
STEP5_PROMPT="Follow the instructions in @.opencode/commands/prp-review.md for the latest PR."
cmd=(opencode run --format json --agent build)
RUN_STEP_PROMPT="$STEP5_PROMPT"
run_step "$STEP5_DESCRIPTION" "${cmd[@]}"

# Step 6: agent build
STEP6_DESCRIPTION="Raise new Github issues with \`gh\` CLI if the PR review comments of the latest PR came up with high or critical priority findings, failing CI or merge blockers."
STEP6_PROMPT="Raise new Github issues with \`gh\` CLI if the PR review comments of the latest PR came up with high or critical priority findings, failing CI or merge blockers."
cmd=(opencode run --format json --agent build)
RUN_STEP_PROMPT="$STEP6_PROMPT"
run_step "$STEP6_DESCRIPTION" "${cmd[@]}"

# Step 7: agent build
STEP7_DESCRIPTION="Use the \`gh\` CLI to try to merge the latest PR. If any PR was processed, send a telegram message on the outcome."
STEP7_PROMPT="Use the \`gh\` CLI to try to merge the latest PR. If any PR was processed, send a telegram message on the outcome."
cmd=(opencode run --format json --agent build)
RUN_STEP_PROMPT="$STEP7_PROMPT"
run_step "$STEP7_DESCRIPTION" "${cmd[@]}"

# Step 8: agent build
STEP8_DESCRIPTION="Switch back to main and do a fresh git pull"
STEP8_PROMPT="Switch back to main and do a fresh git pull"
cmd=(opencode run --format json --agent build)
RUN_STEP_PROMPT="$STEP8_PROMPT"
run_step "$STEP8_DESCRIPTION" "${cmd[@]}"

log INFO "Workflow finished: ${WORKFLOW_NAME}"
