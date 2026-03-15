#!/usr/bin/env bash
set -euo pipefail

SCRIPT_NAME="continuous-issue-resolution.sh"
WORKFLOW_NAME="Continuous Issue Resolution"

DRY_RUN=false
if [[ $# -eq 1 && "$1" == "--dry-run" ]]; then
  DRY_RUN=true
elif [[ $# -gt 0 ]]; then
  printf 'Usage: %s [--dry-run]\n' "$0" >&2
  exit 2
fi

LOG_FILE=""
PREFERRED_LOG_FILE="/var/log/${SCRIPT_NAME%.sh}.log"
FALLBACK_LOG_DIR="/tmp/made-harness-logs"
FALLBACK_LOG_FILE="${FALLBACK_LOG_DIR}/${SCRIPT_NAME%.sh}.log"

if : 2>/dev/null >>"$PREFERRED_LOG_FILE"; then
  LOG_FILE="$PREFERRED_LOG_FILE"
else
  mkdir -p "$FALLBACK_LOG_DIR" 2>/dev/null || true
  if : 2>/dev/null >>"$FALLBACK_LOG_FILE"; then
    LOG_FILE="$FALLBACK_LOG_FILE"
  fi
fi

log() {
  local level="$1"
  shift
  local message
  message=$(printf '%s [%s] %s' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$level" "$*")
  printf '%s\n' "$message" >&2 || true
  if [[ -n "$LOG_FILE" ]]; then
    printf '%s\n' "$message" >>"$LOG_FILE" 2>/dev/null || true
  fi
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

  set +e
  "$step_name"
  local status=$?
  set -e

  if [[ $status -ne 0 ]]; then
    catch "$step_name" "$status"
  fi
  return "$status"
}

run_agent() {
  local prompt="$1"
  local agent="${2:-}"
  local cmd=(opencode run --format json)

  if [[ -n "$agent" ]]; then
    cmd+=(--agent "$agent")
  fi

  if [[ "$DRY_RUN" == true ]]; then
    log INFO "[DRY-RUN] $(printf '%q ' "${cmd[@]}")"
    return 0
  fi

  printf '%s' "$prompt" | "${cmd[@]}"
}

step1() {
  git switch main && git pull --rebase --autostash
}

step2() {
  local prompt='Follow the instructions in @.opencode/commands/prp-issue-fix.md for the latest open issue on Github and take its investigation comment as the implementation plan, but also check if there is already a related PR to continue.'
  local agent='build'
  run_agent "$prompt" "$agent"
}

step3() {
  local prompt='Follow the instructions in @.opencode/commands/commit-push.md'
  local agent='build'
  run_agent "$prompt" "$agent"
}

step4() {
  local prompt='Get the latest open Github issue and its related PR: Only the PR shows merge issues follow the instructions in @.opencode/commands/resolve-ci-errors.md'
  local agent='build'
  run_agent "$prompt" "$agent"
}

step5() {
  local prompt='Get the latest open Github issue and its related PR: Follow the instructions in @.opencode/commands/prp-review.md for the PR'
  local agent='build'
  run_agent "$prompt" "$agent"
}

step6() {
  local prompt="Get the latest open Github issue and its related PR: Raise new Github issues with \`gh\` CLI if the PR review comments came up with high or critical priority findings, failing CI or merge blockers. Then, try to merge it. If any PR was processed, send a telegram message on the outcome."
  local agent='build'
  run_agent "$prompt" "$agent"
}

step7() {
  git switch main && git pull --rebase --autostash
}

log INFO "Starting workflow: ${WORKFLOW_NAME}"

run_step step1
run_step step2
run_step step3
run_step step4
run_step step5
run_step step6
run_step step7

log INFO "Workflow finished: ${WORKFLOW_NAME}"
