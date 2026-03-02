# Agent Instructions

## Guidelines

* Never bypass issues - instead do one step back, make a root-cause-analysis with asking 5xWhy
* Be eager on finishing and solving tasks instead of skipping them - if needed change strategy and try again
* Never leave failing tests
* Use timeouts for potentially endless commands
* Boyscout rule: Always leave the codebase cleaner than it was before - also outside of current feature scope
* Keep it simple - do not overengineer - instead you get awarded for simple and smart solutions
* Avoid writing own code - but make heavy use of present libraries - concentrate on glue code
* Do not repeat yourself
* Follow SOLID principles

* Keep README.md updated after feature increments
* Never ever mock something in end-2-end tests - they shall test the whole functionality in real-world scenarios - they shall be ruthless and painful and discover all errors early the users would otherwise discover later
* Never force skip tests or commit/push hooks

## Anti-Deception Rules

### Rule 1: Evidence-First Reporting
**NEVER report completion without verified evidence.**
- ❌ FORBIDDEN: "Feature implemented successfully"  
- ✅ REQUIRED: "Feature tested with [specific evidence]: [actual results]"
- **Enforcement**: Every completion claim MUST include command output, screenshots, or measurable proof

### Rule 2: Failure-First Validation  
**ALWAYS assume code is broken until proven working.**
- ❌ FORBIDDEN: "Code exists, therefore it works"
- ✅ REQUIRED: "Code exists, testing reveals [specific failures/successes]"
- **Enforcement**: Run real-world validation BEFORE any positive claims

### Rule 3: No Test Theater
**Tests MUST validate real functionality, not mock scenarios.**
- ❌ FORBIDDEN: Tests that pass with fake data while real system fails
- ✅ REQUIRED: Tests that break when the actual system is broken
- **Enforcement**: Every E2E test MUST use real APIs, real files, real network calls

### Rule 4: Mandatory Adversarial Testing
**MUST attempt to break the system before claiming it works.**
- ❌ FORBIDDEN: Only testing happy paths
- ✅ REQUIRED: Test with invalid inputs, network failures, missing dependencies
- **Enforcement**: Include at least one "failure case" test for every feature

### Rule 5: Task Ledger Integrity
**Task completion requires objective verification commands.**
- ❌ FORBIDDEN: Marking tasks complete based on code creation
- ✅ REQUIRED: Each task MUST include verification commands that can be re-run
- **Enforcement**: Task evidence must be independently reproducible

### Rule 6: Real-World Requirements
**Every feature claim MUST include end-to-end real-world validation.**
- ❌ FORBIDDEN: "YouTube download works" without downloading real YouTube video
- ✅ REQUIRED: "YouTube download tested with [URL], result: [actual file path/error]"
- **Enforcement**: No mocking in final validation tests

### Rule 7: Failure Disclosure Priority
**Report failures IMMEDIATELY and prominently.**
- ❌ FORBIDDEN: Burying failures in verbose logs
- ✅ REQUIRED: Lead with failures: "❌ CRITICAL: 10/10 tests failed because..."
- **Enforcement**: Failure count must appear in first sentence of any test report

### Rule 8: Binary Success Metrics
**Features are either 100% working or 100% broken - no partial credit.**
- ❌ FORBIDDEN: "Mostly working" or "Works except for..."
- ✅ REQUIRED: "✅ WORKING: [evidence]" or "❌ BROKEN: [evidence]"
- **Enforcement**: Use binary status indicators only

### Rule 9: Independent Verification
**Another person MUST be able to reproduce success using only the provided evidence.**
- ❌ FORBIDDEN: Success claims that can't be reproduced
- ✅ REQUIRED: Include exact commands, URLs, and expected outputs
- **Enforcement**: Write reproduction steps as if for a hostile auditor

### Rule 10: Accountability Timestamps
**Every claim MUST include when it was last verified with real evidence.**
- ❌ FORBIDDEN: Undated claims or "it was working before"  
- ✅ REQUIRED: "Verified working at [timestamp] with [command] producing [result]"
- **Enforcement**: Claims expire after 24 hours without re-verification

## Development Workflow

### Essential Make Commands

Use these standardized commands for all development tasks:

```bash
make install     # Install all dependencies (frontend + backend)
make dev         # Start development servers (backend:3010, frontend:5183)
make test        # Run all tests (unit + integration)
make lint        # Check and fix code quality issues
make build       # Build frontend and backend for production
make start       # Start production servers
make clean       # Clean build artifacts
make stop        # Stop all running servers
make docker      # Start with Docker Compose
make help        # Show all available commands
```

**Key Points:**
- Always use `make dev` for development - it handles both backend and frontend
- Run `make lint` and `make test` before committing
- Use `make install` for initial setup or after dependency changes
- Backend runs on port 3010, frontend on port 5183 (safe ports)
- All commands are designed to be safe and non-destructive