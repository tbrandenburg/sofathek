# Implementation Plan: Remove trailing whitespace on README.md line 96

**Issue**: [#323](https://github.com/tbrandenburg/sofathek/issues/323)
**Type**: CHORE / DOCUMENTATION
**Priority**: LOW — Cosmetic formatting issue, no functional impact
**Complexity**: LOW — Single character change in one file, isolated, no integration points
**Confidence**: HIGH — Root cause confirmed by raw byte inspection (`cat -A` shows `  $` at line 96)

**Reasoning for Priority**: Trailing whitespace is a cosmetic formatting issue with no user-facing or functional impact; the fix is trivial.
**Reasoning for Complexity**: The change touches exactly 1 file, 1 line, removing 2 trailing space characters — no tests, no API changes, no configuration changes needed.
**Reasoning for Confidence**: The trailing whitespace was confirmed via `sed -n '96p' README.md | cat -A` showing `# Production deployment  $` on the committed version, and the fix has already been verified locally.

---

## Phase 1: Issue Summary

**Title**: Remove trailing whitespace on README.md line 96
**Reporter**: @tbrandenburg
**State**: OPEN
**Labels**: None
**Comments**: 1 (auto-response from github-actions bot)

**Problem**: Line 96 of `README.md` contains trailing whitespace (2 spaces) before the closing backtick fence:

```
# Production deployment  
```

This is a minor formatting inconsistency.

---

## Phase 2: Codebase Findings

| Area | File:Lines | Notes |
|------|-----------|-------|
| Core file | `README.md:96` | `# Production deployment  ` — 2 trailing spaces after "deployment" |
| Adjacent context | `README.md:93-98` | Code block under "Before committing" section |
| Additional TS issues | `README.md:67,106,112,217,255` | Other lines with trailing whitespace (out of scope for this issue) |

### Raw Evidence

Committed version (still has the issue):
```
$ git show HEAD:README.md | sed -n '96p' | cat -A
# Production deployment  $
```

Working tree (already fixed):
```
$ sed -n '96p' README.md | cat -A
# Production deployment$
```

### Diff of the fix (staged):
```diff
-# Production deployment  
+# Production deployment
```

### Current Status
- Branch `fix/readme-formatting-issues` exists locally
- Fix is staged but **not committed**
- No PR has been created
- No other branches reference this issue

---

## Phase 3: Analysis

### Root Cause
A previous edit of `README.md` (likely in PR #296 or earlier) left 2 trailing space characters after "deployment" at the end of line 96. These spaces are invisible in most editors and diff views but are visible with `cat -A` or hex dump.

### Why It Happened
Simple editing oversight — trailing whitespace can be introduced when typing in markdown files, especially at the end of lines before code fences.

### Changes Required

**Files to UPDATE:**
1. `README.md` — Remove 2 trailing spaces from line 96

**Files to CREATE:** None
**Files to DELETE:** None

### What NOT to Change
- Do NOT fix other trailing whitespace issues on lines 67, 106, 112, 217, 255 — they are out of scope
- Do NOT change any other content or formatting in the file
- Do NOT modify any files other than README.md
- Do NOT modify any tests (no test changes needed for this fix)

### Edge Cases and Risks
- **No risk**: Trailing whitespace removal is purely cosmetic with zero functional impact
- **Git blame impact**: Minimal — this changes one line
- **Merge conflicts**: Extremely unlikely unless another PR modifies the same code block

---

## Phase 4: Implementation Steps

### Step 1: Verify the trailing whitespace exists

```bash
git show HEAD:README.md | sed -n '96p' | cat -A
```
Expected: `# Production deployment  $` (shows trailing spaces as `  `)

### Step 2: Edit README.md line 96

Remove the 2 trailing space characters after "deployment" on line 96.

The line should change from:
```
# Production deployment  
```
to:
```
# Production deployment
```

### Step 3: Verify the fix

```bash
sed -n '96p' README.md | cat -A
```
Expected: `# Production deployment$` (no trailing spaces)

### Step 4: Commit the change

```bash
git add README.md
git commit -m "docs: remove trailing whitespace on README.md line 96"
```

### Step 5: Create PR (optional)

```bash
gh pr create --base main --head fix/readme-formatting-issues \
  --title "docs: remove trailing whitespace on README.md line 96" \
  --body "Fixes #323

Removes 2 trailing space characters from line 96 of README.md." \
  --label documentation
```

### Step 6: Verify PR checks pass

```bash
gh pr checks --watch
```

---

## Phase 5: Validation Strategy

### Pre-commit verification
```bash
# Confirm the trailing whitespace is gone
git diff --cached -- README.md | grep '^+[^+]' | cat -A
```
Expected: No `  $` pattern in the added line.

### Visual validation
```bash
# Show the fixed line in context
sed -n '93,98p' README.md
```

### Lint check
```bash
npm run lint
```
Expected: No failures (this is a whitespace-only change, lint should pass).

---

## Phase 6: Notes

- The fix is already staged locally on branch `fix/readme-formatting-issues` and just needs a commit and PR
- Additional trailing whitespace found at `README.md:67,106,112,217,255` is **out of scope** for this issue
- If desired, a follow-up issue could address all trailing whitespace in the file holistically
- This issue has no dependency on any other issue or PR
