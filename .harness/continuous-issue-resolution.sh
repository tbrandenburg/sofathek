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

  local cmd=("opencode" "run" "--format" "json")
  if [[ -n "$agent" ]]; then
    # Add agent parameter for opencode CLI
    cmd+=("--agent" "$agent")
  fi

  if [[ "$DRY_RUN" == true ]]; then
    printf 'dry-run: %s\n' "$(printf '%q ' "${cmd[@]}")"
    return 0
  fi

  printf '%s' "$prompt" | "${cmd[@]}"
}

log INFO "Starting workflow: Continuous Issue Resolution"

# Step 1: Check for open issues (bash)
step1() {
  gh issue list --limit 1 --state open | grep -q . || return 42
}

# Step 2: Switch to main and pull (bash)
step2() {
  git switch main && git pull --rebase --autostash
}

# Step 3: Follow issue fix instructions (agent)
step3() {
  local prompt='Follow the instructions in @.opencode/commands/prp-issue-fix.md for the latest open issue on Github and take its investigation comment as the implementation plan, but also check if there is already a related PR to continue.'
  local agent='build'
  run_agent "$prompt" "$agent"
}

# Step 4: Follow commit push instructions (agent)
step4() {
  local prompt='Follow the instructions in @.opencode/commands/commit-push.md'
  local agent='build'
  run_agent "$prompt" "$agent"
}

# Step 5: Resolve CI errors if needed (agent)
step5() {
  local prompt='Get the latest open Github issue and its related PR: Only the PR shows merge issues follow the instructions in @.opencode/commands/resolve-ci-errors.md'
  local agent='build'
  run_agent "$prompt" "$agent"
}

# Step 6: Follow PR review instructions (agent)
step6() {
  local prompt='Get the latest open Github issue and its related PR: Follow the instructions in @.opencode/commands/prp-review.md for the PR'
  local agent='build'
  run_agent "$prompt" "$agent"
}

# Step 7: Handle review findings and merge (agent)
step7() {
  local prompt='Get the latest open Github issue and its related PR: Raise new Github issues with `gh` CLI if the PR review comments came up with high or critical priority findings, failing CI or merge blockers. Then, try to merge it. If any PR was processed, send a telegram message on the outcome.'
  local agent='build'
  run_agent "$prompt" "$agent"
}

# Step 8: Final sync with main (bash)
step8() {
  git switch main && git pull --rebase --autostash
}

# Execute steps in YAML order
run_step step1
run_step step2
run_step step3
run_step step4
run_step step5
run_step step6
run_step step7
run_step step8

log INFO "Workflow finished: Continuous Issue Resolution"