#!/usr/bin/env bash
set -euo pipefail
umask 077

SCRIPT_NAME='mmozh3te_a0828.sh'
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
# refuse_symlink_path() - keep generated logs inside plain relative paths
# ---------------------------------------------------------------------------
refuse_symlink_path() {
  local target="$1"

  if [[ -z "$target" ]]; then
    printf "ERROR: Log directory must not be empty\n" >&2
    return 1
  fi
  if [[ "$target" == /* ]]; then
    printf "ERROR: Log directory must be relative: %s\n" "$target" >&2
    return 1
  fi

  local current=
  local part
  IFS=/ read -r -a path_parts <<< "$target"
  for part in "${path_parts[@]}"; do
    if [[ -z "$part" || "$part" == "." ]]; then
      continue
    fi
    if [[ "$part" == ".." ]]; then
      printf '%s: %s\n' "ERROR: Log directory must not contain .. path segments" "$target" >&2
      return 1
    fi
    current="${current:+${current}/}${part}"
    if [[ -L "$current" ]]; then
      printf "ERROR: Refusing to write logs through symlinked path: %s\n" "$current" >&2
      return 1
    fi
  done
}

# ---------------------------------------------------------------------------
# Log file setup - local by default, override with FLOWSH_LOG_DIR
# ---------------------------------------------------------------------------
LOG_DIR="${FLOWSH_LOG_DIR:-.flowsh/logs}"
LOG_FILE=
if [[ "$DRY_RUN" == false ]]; then
  refuse_symlink_path "$LOG_DIR" || exit 1
  if [[ -e "$LOG_DIR" && ! -d "$LOG_DIR" ]]; then
    printf "ERROR: Log path exists but is not a directory: %s\n" "$LOG_DIR" >&2
    exit 1
  fi
  if ! mkdir -p "$LOG_DIR"; then
    printf "ERROR: Cannot create log directory: %s\n" "$LOG_DIR" >&2
    exit 1
  fi
  refuse_symlink_path "$LOG_DIR" || exit 1
  if [[ ! -d "$LOG_DIR" ]]; then
    printf "ERROR: Log path exists but is not a directory: %s\n" "$LOG_DIR" >&2
    exit 1
  fi
  if ! chmod 700 "$LOG_DIR"; then
    printf "ERROR: Cannot set log directory permissions: %s\n" "$LOG_DIR" >&2
    exit 1
  fi
  LOG_FILE="${LOG_DIR}/${LOG_BASENAME}"
  if ! : > "$LOG_FILE"; then
    printf "ERROR: Cannot create log file: %s\n" "$LOG_FILE" >&2
    exit 1
  fi
  if ! chmod 600 "$LOG_FILE"; then
    printf "ERROR: Cannot set log file permissions: %s\n" "$LOG_FILE" >&2
    exit 1
  fi
fi

# ---------------------------------------------------------------------------
# log() - ISO-8601 UTC timestamps, INFO/ERROR, stderr + log file
# ---------------------------------------------------------------------------
log() {
  local level="$1"; shift
  local message
  message="$(date -u +'%Y-%m-%dT%H:%M:%SZ') [${level}] $*"
  printf '%s\n' "$message" >&2
  if [[ -n "$LOG_FILE" ]]; then
    if ! printf '%s\n' "$message" >> "$LOG_FILE"; then
      printf "ERROR: Cannot write log file: %s\n" "$LOG_FILE" >&2
      exit 1
    fi
  fi
}

# ---------------------------------------------------------------------------
# catch() - centralized step failure hook
# ---------------------------------------------------------------------------
catch() {
  local step_name="$1"
  local exit_code="$2"
  local step_type="${3:-}"
  local hint=""
  if [[ "$step_type" == "vars" && "$exit_code" == "127" ]]; then
    hint=" — vars values are shell commands, not literal strings; check workflow definition"
  fi
  log ERROR "Step failed: ${step_name} [${step_type}] (exit=${exit_code})${hint}"
}

# ---------------------------------------------------------------------------
# run_step() - dry-run and failure handling; streams output via tee
# ---------------------------------------------------------------------------
run_step() {
  local step_name="$1"
  local step_type="${2:-}"

  if [[ "$DRY_RUN" == true ]]; then
    log INFO "[DRY-RUN] would run: ${step_name} [${step_type}]"
    return 0
  fi

  log INFO "Running step: ${step_name} [${step_type}]"

  set +e
  if ( : >> "$LOG_FILE" ) 2>/dev/null; then
    "$step_name" > >(tee -a "$LOG_FILE") 2> >(tee -a "$LOG_FILE" >&2)
    local status=$?
  else
    "$step_name"
    local status=$?
  fi
  set -e

  if [[ $status -ne 0 ]]; then
    catch "$step_name" "$status" "$step_type"
  fi
  return "$status"
}

# ---------------------------------------------------------------------------
# run_stateful_step() - dry-run and failure handling without subshells
# ---------------------------------------------------------------------------
run_stateful_step() {
  local step_name="$1"
  local step_type="${2:-}"

  if [[ "$DRY_RUN" == true ]]; then
    log INFO "[DRY-RUN] would run: ${step_name} [${step_type}]"
    return 0
  fi

  log INFO "Running step: ${step_name} [${step_type}]"

  set +e
  "$step_name"
  local status=$?
  set -e

  if [[ $status -ne 0 ]]; then
    catch "$step_name" "$status" "$step_type"
  fi
  return "$status"
}

# ---------------------------------------------------------------------------
# run_agent() - prompt handling and CLI invocation
# ---------------------------------------------------------------------------
run_agent() {
  local prompt="$1"
  local agent="${2:-}"
  local model="${3:-}"
  local command="${4:-}"
  local capture="${5:-}"
  local dangerously_skip_permissions="${6:-false}"

  local cmd=(opencode run --format json)
  if [[ -n "$agent" ]]; then
    cmd+=(--agent "$agent")
  fi
  if [[ -n "$model" ]]; then
    cmd+=(--model "$model")
  fi
  if [[ -n "$command" ]]; then
    cmd+=(--command "$command")
  fi
  if [[ "$dangerously_skip_permissions" == true ]]; then
    cmd+=(--dangerously-skip-permissions)
  fi

  if [[ "$DRY_RUN" == true ]]; then
    log INFO "[DRY-RUN] would run: $(printf '%q ' "${cmd[@]}") (with prompt)"
    return 0
  fi

  if ! command -v opencode >/dev/null 2>&1; then
    log ERROR "opencode CLI not found in PATH"
    return 127
  fi

  if [[ -n "$capture" ]]; then
    if ! command -v jq >/dev/null 2>&1; then
      log ERROR "jq not found in PATH (required to extract captured agent output)"
      return 127
    fi
    local output
    local status=0
    local answer
    output="$("${cmd[@]}" -- "$prompt")"
    status=$?
    printf '%s\n' "$output"
    answer="$(printf '%s\n' "$output" \
      | jq -r 'select(.type=="text") | .part.text' | tail -1)"
    printf -v "$capture" '%s' "$answer"
    export "$capture"
    return "$status"
  else
    "${cmd[@]}" -- "$prompt"
  fi
}

# ---------------------------------------------------------------------------
# Starting workflow: Continuous Issue Resolution
# ---------------------------------------------------------------------------
log INFO 'Starting workflow: Continuous Issue Resolution'

# ---------------------------------------------------------------------------
# Step 1 (bash): gh issue list --limit 1 --state open | grep -q . || return 42
# ---------------------------------------------------------------------------
step_1() {
  bash -euo pipefail <<'BASH_EOF'
gh issue list --limit 1 --state open | grep -q . || return 42
BASH_EOF
}
run_step step_1 bash

# ---------------------------------------------------------------------------
# Step 2 (bash): git restore --staged . 2>/dev/null && git restore . && git switch main && git p...
# ---------------------------------------------------------------------------
step_2() {
  bash -euo pipefail <<'BASH_EOF'
git restore --staged . 2>/dev/null && git restore . && git switch main && git pull --rebase --autostash
BASH_EOF
}
run_step step_2 bash

# ---------------------------------------------------------------------------
# Step 3 (agent): Follow the instructions in @.opencode/commands/prp-issue-fix.md for the latest ...
# ---------------------------------------------------------------------------
step_3() {
  local prompt
  prompt=$(cat <<'PROMPT_EOF'
Follow the instructions in @.opencode/commands/prp-issue-fix.md for the latest open issue on Github and take its investigation comment as the implementation plan, but also check if there is already a linked PR to continue.
PROMPT_EOF
  )
  local agent='build'
  local model=''
  local command=''
  local capture=''
  local dangerously_skip_permissions=false
  run_agent "$prompt" "$agent" "$model" "$command" "$capture" "$dangerously_skip_permissions"
}
run_step step_3 agent

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
  local model=''
  local command=''
  local capture=''
  local dangerously_skip_permissions=false
  run_agent "$prompt" "$agent" "$model" "$command" "$capture" "$dangerously_skip_permissions"
}
run_step step_4 agent

# ---------------------------------------------------------------------------
# Step 5 (agent): Get the latest open Github issue and its linked PR: Only the PR shows merge iss...
# ---------------------------------------------------------------------------
step_5() {
  local prompt
  prompt=$(cat <<'PROMPT_EOF'
Get the latest open Github issue and its linked PR: Only the PR shows merge issues follow the instructions in @.opencode/commands/resolve-ci-errors.md
PROMPT_EOF
  )
  local agent='build'
  local model=''
  local command=''
  local capture=''
  local dangerously_skip_permissions=false
  run_agent "$prompt" "$agent" "$model" "$command" "$capture" "$dangerously_skip_permissions"
}
run_step step_5 agent

# ---------------------------------------------------------------------------
# Step 6 (agent): Get the latest open Github issue and its linked PR: Follow the instructions in ...
# ---------------------------------------------------------------------------
step_6() {
  local prompt
  prompt=$(cat <<'PROMPT_EOF'
Get the latest open Github issue and its linked PR: Follow the instructions in @.opencode/commands/prp-review.md for the linked PR
PROMPT_EOF
  )
  local agent='build'
  local model=''
  local command=''
  local capture=''
  local dangerously_skip_permissions=false
  run_agent "$prompt" "$agent" "$model" "$command" "$capture" "$dangerously_skip_permissions"
}
run_step step_6 agent

# ---------------------------------------------------------------------------
# Step 7 (agent): Get the latest open Github issue and its linked PR: Raise new Github issues (an...
# ---------------------------------------------------------------------------
step_7() {
  local prompt
  prompt=$(cat <<'PROMPT_EOF'
Get the latest open Github issue and its linked PR: Raise new Github issues (and check against present ones) with `gh` CLI if the PR review comments came up with high or critical priority findings, failing CI or merge blockers. Then, try to merge it. If any PR was processed, send a telegram message on the outcome.
PROMPT_EOF
  )
  local agent='build'
  local model=''
  local command=''
  local capture=''
  local dangerously_skip_permissions=false
  run_agent "$prompt" "$agent" "$model" "$command" "$capture" "$dangerously_skip_permissions"
}
run_step step_7 agent

# ---------------------------------------------------------------------------
# Step 8 (bash): git restore --staged . 2>/dev/null && git restore . && git switch main && git p...
# ---------------------------------------------------------------------------
step_8() {
  bash -euo pipefail <<'BASH_EOF'
git restore --staged . 2>/dev/null && git restore . && git switch main && git pull --rebase --autostash
BASH_EOF
}
run_step step_8 bash

# ---------------------------------------------------------------------------
# Workflow finished: Continuous Issue Resolution
# ---------------------------------------------------------------------------
log INFO 'Workflow finished: Continuous Issue Resolution'

