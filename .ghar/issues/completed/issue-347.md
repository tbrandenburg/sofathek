# Investigation: 🚨 Security: vite has HIGH severity vulnerability (GHSA-fx2h-pf6j-xcff)

**Issue**: #347 (https://github.com/tbrandenburg/sofathek/issues/347)
**Type**: CHORE
**Investigated**: 2026-06-19T09:46:00Z

### Assessment

| Metric     | Value   | Reasoning                                                                                                                |
| ---------- | ------- | ------------------------------------------------------------------------------------------------------------------------ |
| Priority   | HIGH    | Security vulnerability with HIGH severity rating; affects dev server's `server.fs.deny` mechanism allowing path traversal |
| Complexity | LOW     | Only lock files need updating — no `package.json` changes required; semver range `^6.4.2` already permits `6.4.3`         |
| Confidence | HIGH    | Clear root cause identified; fix is a straightforward `npm update vite` with no code changes needed                      |

---

## Problem Statement

vite `6.4.2` has a HIGH severity vulnerability (GHSA-fx2h-pf6j-xcff) allowing bypass of the `server.fs.deny` configuration on Windows via alternate path representations, potentially granting access to restricted files. The fix is available in vite `6.4.3+`. The installed version is `6.4.2` (root lock) / `6.4.1` (frontend lock), and both need to be updated to `6.4.3`.

---

## Analysis

### Change Rationale

Dependency update to resolve a security vulnerability. The semver range in `frontend/package.json` (`^6.4.2`) already permits `6.4.3`, but neither lock file has been regenerated to resolve to the patched version:
- `package-lock.json` (root, authoritative for npm workspaces): resolves vite to `6.4.2`
- `frontend/package-lock.json` (stale, from pre-PR#314 era): resolves vite to `6.4.1`

### Evidence Chain

WHY: `npm audit` reports vite `6.4.2` has a HIGH vulnerability (GHSA-fx2h-pf6j-xcff)
↓ BECAUSE: The `server.fs.deny` configuration can be bypassed on Windows via alternate path representations
Evidence: `frontend/package-lock.json` — vite resolved to `6.4.1`; `package-lock.json` — vite resolved to `6.4.2`

↓ BECAUSE: Neither lock file was regenerated after the `^6.4.2` semver range was set in PR #314
Evidence: `frontend/package-lock.json:45` — `"vite": "^6.0.0"` (stale, not updated to `^6.4.2`); root `package-lock.json` resolves to `6.4.2` not `6.4.3`

↓ ROOT CAUSE: Lock files need regeneration via `npm update vite` from the workspace root
Evidence: `frontend/package.json:54` — `"vite": "^6.4.2"` (already correct range); vite `6.4.3` is available on npm

### Affected Files

| File | Lines | Action | Description |
|------|-------|--------|-------------|
| `package-lock.json` | all | UPDATE | Regenerate to resolve vite to `6.4.3` |
| `frontend/package-lock.json` | all | UPDATE | Regenerate to resolve vite to `6.4.3` and fix stale semver entry |

### Integration Points

- `frontend/package.json:54` — `"vite": "^6.4.2"` (devDependency) — this range is already correct
- Root `package.json` — npm workspaces with `"workspaces": ["backend", "frontend"]` — root lock is authoritative
- `frontend/vite.config.ts` — no changes needed, API is unchanged across patch versions
- `frontend/vitest.config.ts` — uses vite internally, will benefit from the update

### Git History

- **Introduced**: PR #314 (2026-04-07) — upgraded vite from `^6.0.0` to `^6.4.2` and vitest from `^2.1.0` to `^3.2.4`, but `frontend/package-lock.json` was NOT regenerated (noted in PR review as medium priority finding)
- **Last modified**: commit `50f84a4` — unrelated task ledger change
- **Implication**: This is a regression from the incomplete PR #314 fix — the lock files were never brought in sync with the updated `package.json`

---

## Implementation Plan

### Step 1: Update lock files from workspace root

**File**: `package-lock.json` (root)
**Action**: UPDATE

**Current state** — vite resolved to `6.4.2`:
```json
"node_modules/vite": {
  "version": "6.4.2",
  ...
}
```

**Required state** — vite resolved to `6.4.3` (after `npm update vite`):
```json
"node_modules/vite": {
  "version": "6.4.3",
  ...
}
```

**Why**: Regenerate both root and frontend lock files so vite resolves to patched `6.4.3`.

---

### Step 2: Fix stale semver entry in frontend lock file

**File**: `frontend/package-lock.json`
**Line**: 45
**Action**: UPDATE

**Current code:**
```json
"vite": "^6.0.0"
```

**Required change:**
```json
"vite": "^6.4.2"
```

**Why**: The frontend lock file was never updated to reflect the new semver range set in PR #314. This entry must match `frontend/package.json:54`.

---

### Step 3: Regenerate both lock files

Run from workspace root:
```bash
npm install  # regenerates both lock files with vite resolved to 6.4.3
```

**Why**: `npm install` (or `npm update vite`) from the root resolves all workspace dependencies and updates both lock files consistently.

---

### Step 4: Verify

```bash
cd frontend && npm audit     # Should show 0 vulnerabilities for vite GHSA-fx2h-pf6j-xcff
npm run type-check           # TypeScript compilation
npm run test --workspace=frontend  # Existing tests pass
```

---

## Patterns to Follow

**From PR #314 — same approach, smaller scope:**

```bash
# Previous fix pattern (PR #314):
cd frontend && npm update vite  # just update vite, no major version changes needed this time
```

**Previous fix evidence pattern (from PR #314 body):**
- `npm audit` (frontend): **0 vulnerabilities**
- `npm test` (frontend): **all passed**
- `npm run build` (frontend): **build successful**

---

## Edge Cases & Risks

| Risk/Edge Case | Mitigation |
|----------------|------------|
| `frontend/package-lock.json` might not exist after regeneration (npm workspaces may only use root lock) | Check if npm workspaces hoist everything to root; if so, `frontend/package-lock.json` can be deleted as stale artifact |
| Windows-only vulnerability — fix verified on Linux CI won't confirm Windows protection | Acceptable; fix is still required for Windows users and the patch is non-breaking |
| Transitive dependencies might also update | Review `git diff` on lock files to ensure only vite-related changes are intentional |
| vite 6.4.3 might break something in the dev server | vite patch releases are backward compatible; run full test suite to verify |

---

## Validation

### Automated Checks

```bash
npm run type-check --workspace=frontend
npm run test --workspace=frontend
npm run lint --workspace=frontend
cd frontend && npm audit
```

### Manual Verification

1. Run `npm audit` from `frontend/` — confirm GHSA-fx2h-pf6j-xcff is gone
2. Run `npm ls vite` from root — confirm resolves to `6.4.3`
3. Verify no changes to `frontend/package.json` (should remain `^6.4.2`)
4. Run `git diff --stat` on lock files to review scope of change

---

## Scope Boundaries

**IN SCOPE:**

- Updating vite from `6.4.2` to `6.4.3` in lock files
- Fixing stale `^6.0.0` semver entry in `frontend/package-lock.json`
- Running `npm audit` to confirm vulnerability is resolved
- Running existing tests to confirm no regression

**OUT OF SCOPE (do not touch):**

- Do NOT change `frontend/package.json` — semver range `^6.4.2` is already correct
- Do NOT update vitest or any other dependency — not needed for this fix
- Do NOT modify any application source code
- Do NOT modify backend dependencies
- Do NOT investigate or fix the unrelated `form-data` and `ws` advisories mentioned in #346 (they are separate issues)
- Do NOT touch `dev/state/task-ledger.json` (internal tooling state)

---

## Metadata

- **Investigated by**: GHAR
- **Timestamp**: 2026-06-19T09:46:00Z
- **Artifact**: `.ghar/issues/issue-347.md`
