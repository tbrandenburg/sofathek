# Implementation Plan: Remove Extra Blank Line in README.md

**Issue:** [#321 Fix formatting: remove extra blank line in README.md](https://github.com/tbrandenburg/sofathek/issues/321)

---

## Phase 1: PARSE

| Field        | Value                                         |
| ------------ | --------------------------------------------- |
| **Title**    | Fix formatting: remove extra blank line in README.md |
| **Type**     | DOCUMENTATION                                 |
| **Priority** | LOW                                           |
| **State**    | OPEN                                          |
| **Labels**   | None                                          |
| **Comments** | Bot auto-response only, no discussion         |

### Priority Assessment

**LOW** — Cosmetic formatting issue with zero functional impact; only affects visual consistency of the README.

---

## Phase 2: EXPLORE

| Area         | File:Lines | Notes |
| ------------ | ---------- | ----- |
| **Target**   | `README.md:49` | Extra blank line between code block end and `### Network Access Configuration` heading |

### Current State (README.md lines 46-52)

```
46: docker-compose up -d
47: ```
48:
49:                         <-- extra blank line (line 49)
50: ### Network Access Configuration
51:
52: By default, the frontend now calls the backend ...
```

### Root Cause

A double blank line was left between the closing of the Docker setup code block (line 47) and the `### Network Access Configuration` heading (line 50). All other sections in the README use exactly **one** blank line between code blocks and subsequent headings. Line 49 is the extraneous blank line.

### Git History

The extra blank line was likely introduced in commit `d8b23f5` ("fix: address review suggestions from PR #296") which touched the surrounding area.

---

## Phase 3: ANALYZE

### Change Required

Remove the single blank line at `README.md:49`.

### Files to UPDATE

| File             | Change                                      |
| ---------------- | ------------------------------------------- |
| `README.md:48-50`| Collapse two blank lines into one           |

### Files to CREATE

None.

### Files to DELETE

None.

### Scope Boundaries

- **DO** remove the extra blank line (line 49).
- **DO NOT** change any other content, formatting, or structure in the README.

### Edge Cases & Risks

| Risk                        | Mitigation                                      |
| --------------------------- | ----------------------------------------------- |
| Accidentally removing wrong line | Target is exact line 49; verify with `git diff` |
| Other formatting issues nearby | Not in scope — address separately if needed     |
| README renders differently  | Verify with `glow README.md` or GitHub preview  |

### Validation Strategy

1. Verify the fix with `git diff` to confirm exactly one line removed.
2. Visually confirm no double-blank remains before the heading.
3. No tests needed (README change only).

---

## Phase 4: IMPLEMENTATION STEPS

### Step 1 — Remove the extra blank line

Edit `README.md:48-50` — change the two blank lines to one:

```diff
 docker-compose up -d
 ```

-### Network Access Configuration
+### Network Access Configuration

 By default, the frontend now calls the backend via a **same-origin relative path** (`/api`).
```

### Step 2 — Verify

```bash
git diff README.md
```

Expected: exactly one line removed (the blank line at 49), no other changes.

### Step 3 — Render check (optional)

```bash
# If glow is available
glow README.md | head -55
```

Or open in any Markdown previewer to confirm heading spacing matches adjacent sections.

---

## Phase 5: VERIFICATION

No automated tests are needed for a single-line whitespace fix in documentation.

**Verification commands:**

```bash
# Confirm only the expected change
git diff README.md | wc -l       # Expected: small diff (approx 3-5 lines)
git diff README.md               # Visual inspection

# Check there's no double-blank before the heading
awk '/### Network Access Configuration/{print NR-1": "$(NR-1)}' README.md
```

The line at index 48 (before the heading at line 49 after fix) should not be empty.

---

## Summary

| Aspect          | Value                        |
| --------------- | ---------------------------- |
| Type            | DOCUMENTATION                |
| Priority        | LOW                          |
| Complexity      | LOW                          |
| Confidence      | HIGH                         |
| Files changed   | 1                            |
| Lines removed   | 1                            |
| Lines added     | 0                            |
| Tests needed    | 0                            |

**Confidence: HIGH** — The extra blank line is clearly visible at `README.md:49` in the current file.
