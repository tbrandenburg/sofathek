# Investigation: Broken dark mode

**Issue**: #19 (https://github.com/tbrandenburg/sofathek/issues/19)
**Type**: BUG
**Investigated**: 2026-03-03T10:30:00Z

### Assessment

| Metric     | Value    | Reasoning                                                                                                      |
| ---------- | -------- | -------------------------------------------------------------------------------------------------------------- |
| Severity   | HIGH     | Major UI feature completely broken, significant visual impact making content unreadable in dark mode          |
| Complexity | MEDIUM   | 4 CSS classes need updates, isolated to styling layer, no architectural changes required                      |
| Confidence | HIGH     | Clear root cause identified with specific hardcoded values, straightforward CSS variable replacements needed  |

---

## Problem Statement

Dark mode displays white background panels and unreadable text due to hardcoded `bg-white` styles that don't respect the theme system's CSS variables, creating a broken user experience in dark mode.

---

## Analysis

### Root Cause / Change Rationale

**5 Whys Analysis:**

WHY 1: Why does dark mode look horrible with white backgrounds?
↓ BECAUSE: CSS classes use hardcoded `bg-white` instead of theme-aware variables
Evidence: `frontend/src/index.css:83` - `.card { @apply bg-white }`

WHY 2: Why do components use hardcoded white backgrounds?
↓ BECAUSE: Original component styles were written before theme system integration
Evidence: `git blame` shows commit f961263 introduced hardcoded styles on 2026-03-02

WHY 3: Why weren't theme-aware variables used from the start?
↓ BECAUSE: Theme system (CSS variables) and component styles were developed separately
Evidence: Theme system commit c035d2b came after component styles commit f961263

WHY 4: Why don't the styles adapt to dark mode CSS variables?
↓ BECAUSE: Tailwind utilities reference fixed colors instead of CSS custom properties
Evidence: `bg-white` vs `bg-card` which maps to `hsl(var(--card))`

ROOT CAUSE: Hardcoded Tailwind color utilities in component CSS classes
Evidence: `frontend/src/index.css:83,238,283,345` - Multiple `bg-white` hardcoded values

### Evidence Chain

WHY: Dark mode shows white panels and unreadable text
↓ BECAUSE: Components use `bg-white` instead of `bg-card`
Evidence: `frontend/src/index.css:83` - `@apply bg-white`

↓ BECAUSE: Original styles predated theme system integration
Evidence: `git blame` - f961263 (component styles) before c035d2b (theme system)

↓ BECAUSE: No systematic replacement of hardcoded colors with theme variables
Evidence: `frontend/src/index.css:238,283,345` - Multiple hardcoded white backgrounds

↓ ROOT CAUSE: Missing theme-aware CSS utility classes in component definitions
Evidence: Should use `bg-card` (maps to CSS variable) not `bg-white` (hardcoded)

### Affected Files

| File                       | Lines      | Action | Description                                      |
| -------------------------- | ---------- | ------ | ------------------------------------------------ |
| `frontend/src/index.css`   | 83,87      | UPDATE | Replace .card hardcoded white with theme colors |
| `frontend/src/index.css`   | 238,242    | UPDATE | Replace .video-player hardcoded backgrounds      |
| `frontend/src/index.css`   | 283,287    | UPDATE | Replace .play-overlay-button hardcoded white     |
| `frontend/src/index.css`   | 291,299    | UPDATE | Replace .video-metadata hardcoded backgrounds    |
| `frontend/src/index.css`   | 345        | UPDATE | Replace .modal-content hardcoded white           |

### Integration Points

- `frontend/src/components/Layout.tsx:17` - Uses theme-aware classes correctly
- `frontend/src/components/theme-provider.tsx:38,50` - Applies dark class to root
- `frontend/tailwind.config.js:35-56` - Maps CSS variables to Tailwind utilities
- All video grid cards, modal dialogs, and video player components are affected

### Git History

- **Introduced**: f961263 - 2026-03-02 - "feat(sofathek): complete Netflix-like frontend interface"
- **Last modified**: 8ec19f8 - "Fix: Poor text contrast in video grid metadata (#9)"
- **Implication**: Original bug from initial component implementation, theme system added later but hardcoded styles weren't updated

---

## Implementation Plan

### Step 1: Fix .card component hardcoded backgrounds

**File**: `frontend/src/index.css`
**Lines**: 83-87
**Action**: UPDATE

**Current code:**

```css
.card {
  @apply rounded-lg border border-slate-200 bg-white shadow-card overflow-hidden transition-all duration-200;
}

.card:hover {
  @apply shadow-card-hover -translate-y-0.5;
}
```

**Required change:**

```css
.card {
  @apply rounded-lg border border-border bg-card text-card-foreground shadow-card overflow-hidden transition-all duration-200;
}

.card:hover {
  @apply shadow-card-hover -translate-y-0.5;
}
```

**Why**: Replace `bg-white` and `border-slate-200` with theme-aware `bg-card`, `text-card-foreground`, and `border-border` that adapt to dark mode

---

### Step 2: Fix .video-player component backgrounds

**File**: `frontend/src/index.css`
**Lines**: 238-242
**Action**: UPDATE

**Current code:**

```css
.video-player {
  @apply max-w-5xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden;
}

.video-header {
  @apply p-6 border-b border-slate-200 bg-slate-50;
}
```

**Required change:**

```css
.video-player {
  @apply max-w-5xl mx-auto bg-card text-card-foreground rounded-lg shadow-lg overflow-hidden;
}

.video-header {
  @apply p-6 border-b border-border bg-muted;
}
```

**Why**: Replace hardcoded whites and grays with theme-aware card and muted backgrounds

---

### Step 3: Fix .play-overlay-button hardcoded white

**File**: `frontend/src/index.css`
**Lines**: 283-287
**Action**: UPDATE

**Current code:**

```css
.play-overlay-button {
  @apply w-20 h-20 border-0 rounded-full bg-white bg-opacity-90 text-gray-800 cursor-pointer flex items-center justify-center text-2xl transition-all duration-200 shadow-lg;
}

.play-overlay-button:hover {
  @apply bg-white scale-110;
}
```

**Required change:**

```css
.play-overlay-button {
  @apply w-20 h-20 border-0 rounded-full bg-background/90 text-foreground cursor-pointer flex items-center justify-center text-2xl transition-all duration-200 shadow-lg;
}

.play-overlay-button:hover {
  @apply bg-background scale-110;
}
```

**Why**: Replace hardcoded white with theme-aware background and foreground colors using opacity

---

### Step 4: Fix .video-metadata and related components

**File**: `frontend/src/index.css`
**Lines**: 291-299
**Action**: UPDATE

**Current code:**

```css
.video-metadata {
  @apply p-6 bg-slate-50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4;
}

.metadata-label {
  @apply text-xs font-semibold text-slate-500 uppercase tracking-wide;
}
```

**Required change:**

```css
.video-metadata {
  @apply p-6 bg-muted grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4;
}

.metadata-label {
  @apply text-xs font-semibold text-muted-foreground uppercase tracking-wide;
}
```

**Why**: Replace hardcoded slate colors with theme-aware muted background and foreground

---

### Step 5: Fix .modal-content hardcoded white

**File**: `frontend/src/index.css`
**Lines**: 345
**Action**: UPDATE

**Current code:**

```css
.modal-content {
  @apply relative bg-white rounded-xl max-w-[90vw] max-h-[90vh] overflow-hidden shadow-modal z-10;
}
```

**Required change:**

```css
.modal-content {
  @apply relative bg-card text-card-foreground rounded-xl max-w-[90vw] max-h-[90vh] overflow-hidden shadow-modal z-10;
}
```

**Why**: Replace hardcoded white with theme-aware card background and text color

---

### Step 6: Add remaining theme-aware video player styles

**File**: `frontend/src/index.css`
**Lines**: 246-250
**Action**: UPDATE

**Current code:**

```css
.video-player-title {
  @apply text-xl font-bold text-gray-800 mb-2;
}

.video-info {
  @apply flex gap-4 text-sm text-slate-500;
}
```

**Required change:**

```css
.video-player-title {
  @apply text-xl font-bold text-foreground mb-2;
}

.video-info {
  @apply flex gap-4 text-sm text-muted-foreground;
}
```

**Why**: Replace hardcoded grays with theme-aware text colors

---

## Patterns to Follow

**From codebase - mirror these exactly:**

```typescript
// SOURCE: frontend/src/components/Layout.tsx:17
// Pattern for theme-aware background and text
className="min-h-screen bg-background text-foreground"
```

```css
/* SOURCE: frontend/src/index.css:40-68 */
/* Pattern for CSS variable definitions */
.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;
}
```

```javascript
// SOURCE: frontend/tailwind.config.js:35-56
// Pattern for CSS variable to utility mapping
colors: {
  background: "hsl(var(--background))",
  foreground: "hsl(var(--foreground))",
  card: {
    DEFAULT: "hsl(var(--card))",
    foreground: "hsl(var(--card-foreground))",
  },
}
```

---

## Edge Cases & Risks

| Risk/Edge Case                     | Mitigation                                          |
| ---------------------------------- | --------------------------------------------------- |
| CSS variable not defined           | All referenced variables exist in index.css:40-68  |
| Opacity syntax compatibility       | Use `/90` Tailwind syntax for cross-browser support |
| Hover states losing contrast       | Test all hover states in both light and dark modes |
| Breaking existing light mode       | Verify light mode CSS variables still work         |

---

## Validation

### Automated Checks

```bash
npm run type-check   # TypeScript validation
npm run test         # Component and theme tests
npm run lint         # CSS and code quality
npm run build        # Production build verification
```

### Manual Verification

1. Switch to dark mode and verify no white panels remain visible
2. Check all video cards display with proper dark backgrounds and readable text
3. Test video player modal and overlay button in dark mode
4. Verify video metadata sections use appropriate dark mode colors
5. Confirm light mode still works correctly after changes
6. Test hover states and transitions in both themes

---

## Scope Boundaries

**IN SCOPE:**

- CSS component styles in index.css using hardcoded colors
- Theme-aware replacements for bg-white, text-gray-*, border-slate-*
- Modal, video player, and card component styling

**OUT OF SCOPE (do not touch):**

- Theme provider logic (already working correctly)
- Tailwind configuration (CSS variables already mapped)
- Component structure or functionality
- Adding new theme variants beyond dark/light

---

## Metadata

- **Investigated by**: Claude
- **Timestamp**: 2026-03-03T10:30:00Z
- **Artifact**: `.claude/PRPs/issues/issue-19.md`