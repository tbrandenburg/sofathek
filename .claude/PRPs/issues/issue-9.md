# Investigation: 🐛 Poor text contrast: Video grid metadata barely readable (light gray on white)

**Issue**: #9 (https://github.com/tbrandenburg/sofathek/issues/9)
**Type**: BUG
**Investigated**: 2026-03-02T16:20:00Z

### Assessment

| Metric     | Value  | Reasoning                                                                                                      |
|------------|--------|----------------------------------------------------------------------------------------------------------------|
| Severity   | HIGH   | Affects core functionality usability for all users, violates WCAG accessibility standards, and creates user experience barriers |
| Complexity | LOW    | Only 2 files need updates with straightforward CSS color replacements, using existing theme system |
| Confidence | HIGH   | Clear root cause identified with specific file:line locations and existing theme system already provides proper contrast colors |

---

## Problem Statement

Video metadata text (filenames and file sizes) in the video library grid has extremely poor contrast ratio using light gray colors (#888, text-slate-500, text-gray-600) on white backgrounds, making text barely readable and violating WCAG 2.1 accessibility standards.

---

## Analysis

### Root Cause / Change Rationale

The application has a proper theme system with CSS custom properties that provide accessible contrast ratios, but the video metadata components are using hardcoded light colors and Tailwind classes that don't leverage this theme system.

### Evidence Chain

**WHY**: Video metadata text is barely readable
↓ **BECAUSE**: Light gray colors used against white background  
Evidence: `frontend/src/index.css:154` - `.video-metadata { @apply text-xs text-slate-500 m-0; }`

↓ **BECAUSE**: Components use hardcoded colors instead of theme variables  
Evidence: `frontend/src/components/ui/card.tsx:50` - `style={{ fontSize: '0.875rem', color: '#666', marginBottom: '1rem' }}`

↓ **BECAUSE**: CSS classes don't reference accessible theme colors  
Evidence: `frontend/src/index.css:175` - `.card-description { @apply text-sm text-gray-600 mb-4; }`

↓ **ROOT CAUSE**: Inconsistent use of theme system - proper contrast colors exist but aren't being used  
Evidence: `frontend/src/index.css:25` - `--muted-foreground: 215.4 16.3% 46.9%;` (accessible contrast available)

### Affected Files

| File                                          | Lines     | Action | Description                                    |
|-----------------------------------------------|-----------|--------|------------------------------------------------|
| `frontend/src/index.css`                      | 154, 175  | UPDATE | Replace light gray classes with theme colors  |
| `frontend/src/components/ui/card.tsx`         | 50        | UPDATE | Replace hardcoded #666 with CSS variable      |
| `frontend/src/__tests__/VideoCard.test.tsx`  | NEW       | UPDATE | Add accessibility contrast tests               |

### Integration Points

- `frontend/src/components/VideoCard/VideoCard.tsx:60-77` uses CardDescription component
- `frontend/src/components/VideoGrid/VideoGrid.tsx:77` uses text-slate-500 class  
- Multiple components depend on .video-metadata and .card-description classes
- Theme switching functionality requires consistent CSS variable usage

### Git History

- **Introduced**: 0e4aaf5 - 2026-03-02 - "feat(sofathek): complete Netflix-like frontend interface with E2E testing"
- **Theme system added**: 026854d - "feat(ui): Implement comprehensive theme system and testing infrastructure"  
- **Implication**: Issue existed since original UI implementation, theme system added later but not fully adopted

---

## Implementation Plan

### Step 1: Fix video metadata contrast in CSS

**File**: `frontend/src/index.css`
**Lines**: 154
**Action**: UPDATE

**Current code:**
```css
.video-metadata {
  @apply text-xs text-slate-500 m-0;
}
```

**Required change:**
```css
.video-metadata {
  @apply text-xs m-0;
  color: hsl(var(--muted-foreground));
}
```

**Why**: Uses theme system's muted-foreground variable which provides proper contrast in both light (46.9% lightness) and dark (65.1% lightness) themes.

---

### Step 2: Fix card description contrast in CSS

**File**: `frontend/src/index.css`  
**Lines**: 175
**Action**: UPDATE

**Current code:**
```css
.card-description {
  @apply text-sm text-gray-600 mb-4;
}
```

**Required change:**
```css
.card-description {
  @apply text-sm mb-4;
  color: hsl(var(--muted-foreground));
}
```

**Why**: Consistent with theme system and removes hardcoded gray color that has poor contrast.

---

### Step 3: Remove hardcoded color in Card component

**File**: `frontend/src/components/ui/card.tsx`
**Lines**: 50  
**Action**: UPDATE

**Current code:**
```tsx
<div className={`card-description ${className}`} style={{ fontSize: '0.875rem', color: '#666', marginBottom: '1rem' }} {...props}>
```

**Required change:**
```tsx
<div className={`card-description ${className}`} style={{ fontSize: '0.875rem', marginBottom: '1rem' }} {...props}>
```

**Why**: Remove hardcoded #666 color to allow CSS class styling with theme variables to take effect.

---

### Step 4: Add accessibility tests

**File**: `frontend/src/__tests__/VideoCard.test.tsx`
**Action**: UPDATE

**Test cases to add:**
```typescript
describe('VideoCard accessibility', () => {
  it('should have sufficient color contrast for metadata text', () => {
    render(<VideoCard video={mockVideo} onVideoSelect={jest.fn()} />);
    const metadata = screen.getByTestId('video-metadata');
    const computedStyle = window.getComputedStyle(metadata);
    
    // Verify color is using CSS variable (not hardcoded)
    expect(computedStyle.color).not.toBe('rgb(107, 114, 126)'); // text-slate-500
    expect(computedStyle.color).not.toBe('#666');
  });

  it('should use theme-aware colors', () => {
    render(<VideoCard video={mockVideo} onVideoSelect={jest.fn()} />);
    const metadata = screen.getByTestId('video-metadata');
    
    // Should use CSS custom property
    expect(metadata.className).not.toContain('text-slate-500');
    expect(metadata.className).not.toContain('text-gray-600');
  });
});
```

---

## Patterns to Follow

**From codebase - mirror these exactly:**

```css
/* SOURCE: frontend/src/index.css:25-26 */  
/* Pattern for theme-aware text colors */
--muted-foreground: 215.4 16.3% 46.9%; /* Light theme - proper contrast */
color: hsl(var(--muted-foreground));
```

```css
/* SOURCE: frontend/src/index.css:56-57 */
/* Pattern for dark theme support */  
--muted-foreground: 215 20.2% 65.1%; /* Dark theme - proper contrast */
```

---

## Edge Cases & Risks

| Risk/Edge Case                    | Mitigation                                                |
|-----------------------------------|-----------------------------------------------------------|
| Theme switching breaks contrast   | CSS variables automatically handle light/dark themes     |
| Other components using same colors| Audit reveals only 3 files affected, isolated change     |
| Tests fail after color changes   | Update color assertions to check for theme usage         |
| Custom themes need different colors| CSS variables allow easy customization without code changes|

---

## Validation

### Automated Checks
```bash
npm run type-check    # Ensure no TypeScript errors
npm test VideoCard    # Run video card component tests  
npm run lint          # Check for code quality issues
npm run build         # Verify production build works
```

### Manual Verification
1. View video grid in browser - confirm metadata text is easily readable
2. Toggle between light/dark themes - verify contrast maintained in both
3. Test with accessibility tools - confirm WCAG 2.1 AA compliance (4.5:1 contrast ratio)
4. Test with screen readers - ensure text is properly announced

---

## Scope Boundaries  

**IN SCOPE:**
- Video metadata text contrast in video grid/cards
- Card description text contrast  
- Theme system consistency for text colors
- Basic accessibility testing for contrast

**OUT OF SCOPE (do not touch):**
- Other accessibility improvements beyond contrast
- Complete accessibility audit of entire application  
- Theme system architecture changes
- Color scheme modifications beyond existing variables
- Performance optimizations or other UI improvements

---

## Metadata

- **Investigated by**: Claude
- **Timestamp**: 2026-03-02T16:20:00Z
- **Artifact**: `.claude/PRPs/issues/issue-9.md`