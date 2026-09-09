# Root Cause Analysis

**Issue**: #386, tighten js-yaml override to exclude vulnerable versions
**Root Cause**: The manifests used an unbounded lower-only override that permitted vulnerable js-yaml 4.0.0 through 4.3.1 releases.
**Date**: 2026-09-09
**Branch**: fix/issue-386-tighten-js-yaml
**Severity**: High
**Confidence**: High - the issue identifies the range and all three manifests contain the same prior constraint.
**Mode**: Deep

---

## Symptom

PR #387 needed a merge-ready dependency remediation for issue #386. Its predecessor constraint, `>=3.15.2`, did not exclude vulnerable js-yaml 4.x releases even though current lockfiles resolved safe versions.

## Reproduction

Inspecting the prior manifest value shows that version 4.0.0 satisfies `>=3.15.2`; therefore the override could select the vulnerable interval. The current PR changes the range to `>=3.15.2 <4.0.0 || >=4.3.2`. Running three audits reports `found 0 vulnerabilities` for root, backend, and frontend. GitHub reports PR #387 as `MERGEABLE` and `CLEAN` with six passing checks.

## Hypotheses

| # | Hypothesis | Likelihood | Verdict |
|---|-----------|------------|---------|
| H1 | The override range permits vulnerable js-yaml 4.x versions. | HIGH | CONFIRMED |
| H2 | A stale lockfile is the remaining cause. | MED | REJECTED - lockfiles resolve safe versions and no lockfile change is required by the PR. |
| H3 | CI or a merge conflict is blocking the PR. | LOW | REJECTED - all six checks pass and GitHub reports MERGEABLE/CLEAN. |

## Evidence Chain

WHY: A future install could reintroduce vulnerable js-yaml.
↓ BECAUSE: The old override only specified a lower bound.
Evidence: `package.json:73`, `backend/package.json:59`, `frontend/package.json:20` - each previously used `>=3.15.2`.

WHY: A lower bound alone admits vulnerable 4.0.0 through 4.3.1.
↓ BECAUSE: Those versions are greater than or equal to 3.15.2.
Evidence: `gh issue view 386` - the issue explicitly identifies the vulnerable interval.

WHY: The manifests could independently allow the unsafe interval.
↓ BECAUSE: Root and standalone workspace installs each read their own override block.
Evidence: `package.json:72`, `backend/package.json:58`, `frontend/package.json:19` - all three define overrides.

WHY: The vulnerability was not prevented by current lockfile state.
↓ BECAUSE: Lockfiles describe current resolution, not the full future range permitted by the manifest.
Evidence: PR #387 description - current locks resolve safe versions but the manifest needed tightening.

WHY: The fix is a bounded union of safe ranges.
↓ ROOT CAUSE: The shared js-yaml override lacked an upper bound below 4.0.0 and a lower bound at patched 4.3.2.
Evidence: `c46eea8`, `package.json:73`, `backend/package.json:59`, `frontend/package.json:20` - current value is `>=3.15.2 <4.0.0 || >=4.3.2`.

## Validation

| Test | Result |
|------|--------|
| Causation: root cause leads to the vulnerable resolution? | PASS |
| Necessity: without the bounded range could the issue recur? | NO (PASS) |
| Sufficiency: bounded range addresses the stated issue alone? | YES |

## Git History

- **Introduced**: `39dddd4` - `fix: resolve issue 384 dependency vulnerabilities` - 2026-09-09
- **Corrected**: `c46eea8` - `Fix: tighten js-yaml override for issue 386` - 2026-09-09
- **Author**: Tom Brandenburg
- **Type**: follow-up to dependency remediation

## Affected Files

| File | Lines | Role in the Bug |
|------|-------|-----------------|
| `package.json` | 72-74 | Root install override |
| `backend/package.json` | 58-60 | Backend standalone install override |
| `frontend/package.json` | 19-21 | Frontend standalone install override |

## Fix Options

### Option 1: Bounded union override (Recommended)

**Changes**: Use `>=3.15.2 <4.0.0 || >=4.3.2` in all three manifests.
**Complexity**: LOW
**Risk**: Future major versions may require a deliberate range update.

### Option 2: Pin one patched version

**Changes**: Pin js-yaml to a single patched version in all three manifests.
**Complexity**: LOW
**Risk**: More restrictive and less compatible with consumers requiring another safe major version.

## Recommendation

Use Option 1. It excludes the complete vulnerable interval while retaining patched 3.x and 4.3.2+ releases, and it is the change already present in PR #387.

## Verification

1. Run `npm audit --audit-level=high`, `npm audit --prefix backend --audit-level=high`, and `npm audit --prefix frontend --audit-level=high`.
2. Run `./scripts/validate.sh` and `make test`.
3. Run `gh pr checks 387` and verify GitHub reports `MERGEABLE`/`CLEAN`.
