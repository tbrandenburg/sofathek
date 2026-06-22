#!/usr/bin/env bash
set -euo pipefail

SCRIPT_NAME='continuous-issue-resolution.sh'
WORKFLOW_NAME="${SCRIPT_NAME%.sh}"
WORKFLOW_SLUG=$(printf '%s' "$WORKFLOW_NAME" \
  | tr '[:upper:]' '[:lower:]' \
  | sed -E 's/[^a-z0-9-]+/-/g; s/^-+//; s/-+$//; s/-+/-/g')
LOG_TIMESTAMP="$(date -u +'%Y%m%dT%H%M%SZ')"
LOG_BASENAME="flowsh-${WORKFLOW_SLUG}-${LOG_TIMESTAMP}-$$.log"

# ---------------------------------------------------------------------------
# Argument handling
# ---------------------------------------------------------------------------
DRY_RUN=false
if [[ $# -eq 1 && "$1" == "--dry-run" ]]; then
  DRY_RUN=true
elif [[ $# -gt 0 ]]; then
  printf "Usage: %s [--dry-run]\n" "$0" >&2
  exit 2
fi

# ---------------------------------------------------------------------------
# Log file setup - local by default, override with FLOWSH_LOG_DIR
# ---------------------------------------------------------------------------
LOG_DIR="${FLOWSH_LOG_DIR:-.flowsh/logs}"
mkdir -p "$LOG_DIR"
LOG_FILE="${LOG_DIR}/${LOG_BASENAME}"

# ---------------------------------------------------------------------------
# log() — ISO-8601 UTC timestamps, INFO/ERROR, stderr + log file
# ---------------------------------------------------------------------------
log() {
  local level="$1"; shift
  local message
  message="$(date -u +'%Y-%m-%dT%H:%M:%SZ') [${level}] $*"
  printf '%s\n' "$message" >&2
  printf '%s\n' "$message" >> "$LOG_FILE" 2>/dev/null || true
}

# ---------------------------------------------------------------------------
# catch() — centralized step failure hook
# ---------------------------------------------------------------------------
catch() {
  local step_name="$1"
  local exit_code="$2"
  log ERROR "Step failed: ${step_name} (exit=${exit_code})"
}

# ---------------------------------------------------------------------------
# run_step() — dry-run and failure handling; streams output via tee
# ---------------------------------------------------------------------------
run_step() {
  local step_name="$1"

  if [[ "$DRY_RUN" == true ]]; then
    log INFO "[DRY-RUN] would run: ${step_name}"
    return 0
  fi

  log INFO "Running step: ${step_name}"

  set +e
  if ( : >> "$LOG_FILE" ) 2>/dev/null; then
    "$step_name" 2>&1 | tee -a "$LOG_FILE"
    local status=${PIPESTATUS[0]}
  else
    "$step_name"
    local status=$?
  fi
  set -e

  if [[ $status -ne 0 ]]; then
    catch "$step_name" "$status"
  fi
  return "$status"
}

# ---------------------------------------------------------------------------
# run_stateful_step() — dry-run and failure handling without subshells
# ---------------------------------------------------------------------------
run_stateful_step() {
  local step_name="$1"

  if [[ "$DRY_RUN" == true ]]; then
    log INFO "[DRY-RUN] would run: ${step_name}"
    return 0
  fi

  log INFO "Running step: ${step_name}"

  set +e
  "$step_name"
  local status=$?
  set -e

  if [[ $status -ne 0 ]]; then
    catch "$step_name" "$status"
  fi
  return "$status"
}

# ---------------------------------------------------------------------------
# run_agent() — prompt handling and OpenCode CLI invocation
# ---------------------------------------------------------------------------
run_agent() {
  local prompt="$1"
  local agent="${2:-}"

  local cmd=(opencode run --format json)
  if [[ -n "$agent" ]]; then
    cmd+=(--agent "$agent")
  fi

  if [[ "$DRY_RUN" == true ]]; then
    log INFO "[DRY-RUN] would run: $(printf '%q ' "${cmd[@]}") (with prompt)"
    return 0
  fi

  printf '%s' "$prompt" | "${cmd[@]}"
}

# ---------------------------------------------------------------------------
# Starting workflow: Continuous Issue Resolution
# ---------------------------------------------------------------------------
log INFO 'Starting workflow: Continuous Issue Resolution'

# ---------------------------------------------------------------------------
# Step 1 (bash): gh issue list --limit 1 --state open | grep -q . || return 42
# ---------------------------------------------------------------------------
step_1() {
  gh issue list --limit 1 --state open | grep -q . || return 42
}
run_step step_1

# ---------------------------------------------------------------------------
# Step 2 (bash): git restore --staged . 2>/dev/null && git restore . && git switch main && git p…
# ---------------------------------------------------------------------------
step_2() {
  git restore --staged . 2>/dev/null && git restore . && git switch main && git pull --rebase --autostash
}
run_step step_2

# ---------------------------------------------------------------------------
# Step 3 (agent): Follow the instructions in @.opencode/commands/prp-issue-fix.md for the latest …
# ---------------------------------------------------------------------------
step_3() {
  local prompt
  prompt=$(cat <<'PROMPT_EOF'
Follow the instructions in @.opencode/commands/prp-issue-fix.md for the latest open issue on Github and take its investigation comment as the implementation plan, but also check if there is already a linked PR to continue.
PROMPT_EOF
  )
  local agent='build'
  run_agent "$prompt" "$agent"
}
run_step step_3

# ---------------------------------------------------------------------------
# Step 4 (agent): Follow the instructions in @.opencode/commands/commit-push.md
# ---------------------------------------------------------------------------
step_4() {
  local prompt
  prompt=$(cat <<'PROMPT_EOF'
Follow the instructions in @.opencode/commands/commit-push.md
PROMPT_EOF
  )
  local agent='build'
  run_agent "$prompt" "$agent"
}
run_step step_4

# ---------------------------------------------------------------------------
# Step 5 (agent): Get the latest open Github issue and its linked PR: Only the PR shows merge iss…
# ---------------------------------------------------------------------------
step_5() {
  local prompt
  prompt=$(cat <<'PROMPT_EOF'
Get the latest open Github issue and its linked PR: Only the PR shows merge issues follow the instructions in @.opencode/commands/resolve-ci-errors.md
PROMPT_EOF
  )
  local agent='build'
  run_agent "$prompt" "$agent"
}
run_step step_5

# ---------------------------------------------------------------------------
# Step 6 (agent): Get the latest open Github issue and its linked PR: Follow the instructions in …
# ---------------------------------------------------------------------------
step_6() {
  local prompt
  prompt=$(cat <<'PROMPT_EOF'
Get the latest open Github issue and its linked PR: Follow the instructions in @.opencode/commands/prp-review.md for the linked PR
PROMPT_EOF
  )
  local agent='build'
  run_agent "$prompt" "$agent"
}
run_step step_6

# ---------------------------------------------------------------------------
# Step 7 (agent): Get the latest open Github issue and its linked PR: Raise new Github issues (an…
# ---------------------------------------------------------------------------
step_7() {
  local prompt
  prompt=$(cat <<'PROMPT_EOF'
Get the latest open Github issue and its linked PR: Raise new Github issues (and check against present ones) with `gh` CLI if the PR review comments came up with high or critical priority findings, failing CI or merge blockers. Then, try to merge it. If any PR was processed, send a telegram message on the outcome.
PROMPT_EOF
  )
  local agent='build'
  run_agent "$prompt" "$agent"
}
run_step step_7

# ---------------------------------------------------------------------------
# Step 8 (bash): git restore --staged . 2>/dev/null && git restore . && git switch main && git p…
# ---------------------------------------------------------------------------
step_8() {
  git restore --staged . 2>/dev/null && git restore . && git switch main && git pull --rebase --autostash
}
run_step step_8

# ---------------------------------------------------------------------------
# Workflow finished: Continuous Issue Resolution
# ---------------------------------------------------------------------------
log INFO 'Workflow finished: Continuous Issue Resolution'

