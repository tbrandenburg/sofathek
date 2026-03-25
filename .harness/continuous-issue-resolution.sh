#!/usr/bin/env bash
set -euo pipefail

SCRIPT_NAME="continuous-issue-resolution.sh"

# Argument handling
DRY_RUN=false
if [[ $# -eq 1 && "$1" == "--dry-run" ]]; then
  DRY_RUN=true
elif [[ $# -gt 0 ]]; then
  printf "Usage: %s [--dry-run]\n" "$0" >&2
  exit 2
fi

# Try /var/log first, fallback to /tmp/made-harness-logs
if [[ -w "/var/log" ]]; then
  LOG_FILE="/var/log/${SCRIPT_NAME%.sh}.log"
else
  LOG_DIR="/tmp/made-harness-logs"
  mkdir -p "$LOG_DIR"
  LOG_FILE="$LOG_DIR/${SCRIPT_NAME%.sh}.log"
fi

log() {
  local level="$1"; shift
  local message
  message=$(printf '%s [%s] %s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$level" "$*")
  printf '%s\n' "$message" >&2
  # Append to log file if writable, ignore errors
  printf '%s\n' "$message" >> "$LOG_FILE" 2>/dev/null || true
}

catch() {
  local step_name="$1"
  local exit_code="$2"
  log ERROR "Step failed: ${step_name} (exit=${exit_code})"
}

run_step() {
  local step_name="$1"

  if [[ "$DRY_RUN" == true ]]; then
    log INFO "[DRY-RUN] ${step_name}"
    return 0
  fi

  # Temporarily disable exit on error to handle failures gracefully
  set +e
  "$step_name"
  local status=$?
  set -e  # Re-enable exit on error

  if [[ $status -ne 0 ]]; then
    catch "$step_name" "$status"
  fi
  return "$status"
}

run_agent() {
  local prompt="$1"
  local agent="${2:-}"  # Optional agent parameter with default empty

  # CLI: opencode — base command: opencode run --format json
  # Agent parameter: --agent <agent_name>
  # Message input: stdin
  local cmd=(opencode run --format json)
  if [[ -n "$agent" ]]; then
    cmd+=(--agent "$agent")
  fi

  if [[ "$DRY_RUN" == true ]]; then
    log INFO "[DRY-RUN] run_agent: $(printf '%q ' "${cmd[@]}")"
    return 0
  fi

  printf '%s' "$prompt" | "${cmd[@]}"
}

log INFO "Starting workflow: Continuous Issue Resolution"

# ----------------------------------------------------------------------------
# Step 1 (bash): check open issues exist
# ----------------------------------------------------------------------------
step1() {
  gh issue list --limit 1 --state open | grep -q . || return 42
}
run_step step1

# ----------------------------------------------------------------------------
# Step 2 (bash): restore workspace and sync main
# ----------------------------------------------------------------------------
step2() {
  git restore --staged . 2>/dev/null && git restore . && git switch main && git pull --rebase --autostash
}
run_step step2

# ----------------------------------------------------------------------------
# Step 3 (agent): fix latest open issue
# ----------------------------------------------------------------------------
step3() {
  local prompt='Follow the instructions in @.opencode/commands/prp-issue-fix.md for the latest open issue on Github and take its investigation comment as the implementation plan, but also check if there is already a linked PR to continue.'
  local agent='build'
  run_agent "$prompt" "$agent"
}
run_step step3

# ----------------------------------------------------------------------------
# Step 4 (agent): commit and push
# ----------------------------------------------------------------------------
step4() {
  local prompt='Follow the instructions in @.opencode/commands/commit-push.md'
  local agent='build'
  run_agent "$prompt" "$agent"
}
run_step step4

# ----------------------------------------------------------------------------
# Step 5 (agent): resolve CI errors on linked PR
# ----------------------------------------------------------------------------
step5() {
  local prompt='Get the latest open Github issue and its linked PR: Only the PR shows merge issues follow the instructions in @.opencode/commands/resolve-ci-errors.md'
  local agent='build'
  run_agent "$prompt" "$agent"
}
run_step step5

# ----------------------------------------------------------------------------
# Step 6 (agent): review linked PR
# ----------------------------------------------------------------------------
step6() {
  local prompt='Get the latest open Github issue and its linked PR: Follow the instructions in @.opencode/commands/prp-review.md for the linked PR'
  local agent='build'
  run_agent "$prompt" "$agent"
}
run_step step6

# ----------------------------------------------------------------------------
# Step 7 (agent): raise issues from review, attempt merge, notify
# ----------------------------------------------------------------------------
step7() {
  local prompt='Get the latest open Github issue and its linked PR: Raise new Github issues (and check against present ones) with gh CLI if the PR review comments came up with high or critical priority findings, failing CI or merge blockers. Then, try to merge it. If any PR was processed, send a telegram message on the outcome.'
  local agent='build'
  run_agent "$prompt" "$agent"
}
run_step step7

# ----------------------------------------------------------------------------
# Step 8 (bash): restore workspace and sync main
# ----------------------------------------------------------------------------
step8() {
  git restore --staged . 2>/dev/null && git restore . && git switch main && git pull --rebase --autostash
}
run_step step8

log INFO "Workflow finished: Continuous Issue Resolution"
