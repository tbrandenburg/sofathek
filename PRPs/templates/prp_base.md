name: "Base PRP Template v2 - Context-Rich with Validation Loops"
description: |

## Purpose
Template optimized for AI agents to implement features with sufficient context and self-validation capabilities to achieve working code through iterative refinement.

## Core Principles
1. **Context is King**: Include ALL necessary documentation, examples, and caveats
2. **Validation Loops**: Provide executable tests/lints the AI can run and fix
3. **Information Dense**: Use keywords and patterns from the codebase
4. **Progressive Success**: Start simple, validate, then enhance
5. **Global rules**: Be sure to follow all rules in CLAUDE.md

---

## Goal
[What needs to be built - be specific about the end state and desires]

## Why
- [Business value and user impact]
- [Integration with existing features]
- [Problems this solves and for whom]

## What
[User-visible behavior and technical requirements]

### Success Criteria
- [ ] [Specific measurable outcomes]

## All Needed Context

### Documentation & References (list all context needed to implement the feature)
```yaml
# MUST READ - Include these in your context window
- url: [Official API docs URL]
  why: [Specific sections/methods you'll need]
  
- file: [path/to/example.js]
  why: [Pattern to follow, gotchas to avoid]
  
- doc: [Library documentation URL] 
  section: [Specific section about common pitfalls]
  critical: [Key insight that prevents common errors]

- docfile: [PRPs/ai_docs/file.md]
  why: [docs that the user has pasted in to the project]

```

### Current Codebase tree (run `tree` in the root of the project) to get an overview of the codebase
```bash

```

### Desired Codebase tree with files to be added and responsibility of file
```bash

```

### Known Gotchas of our codebase & Library Quirks
```javascript
// CRITICAL: [Library name] requires [specific setup]
// Example: Express requires middleware order matters
// Example: React requires keys for list items
// Example: We use ES modules and require .js extensions
```

## Implementation Blueprint

### Data models and structure

Create the core data models, we ensure type safety and consistency.
```javascript
Examples: 
 - TypeScript interfaces
 - API response schemas
 - Database models
 - Configuration types

```

### list of tasks to be completed to fulfill the PRP in the order they should be completed

```yaml
Task 1:
MODIFY src/existing_module.js:
  - FIND pattern: "class OldImplementation"
  - INJECT after line containing "constructor()"
  - PRESERVE existing method signatures

CREATE src/new_feature.js:
  - MIRROR pattern from: src/similar_feature.js
  - MODIFY class name and core logic
  - KEEP error handling pattern identical

...(...)

Task N:
...

```


### Per task pseudocode as needed added to each task
```javascript

// Task 1
// Pseudocode with CRITICAL details dont write entire code
async function newFeature(param) {
    // PATTERN: Always validate input first (see src/validators.js)
    const validated = validateInput(param);  // throws ValidationError
    
    // GOTCHA: This library requires connection pooling
    const connection = await getConnection();  // see src/db/pool.js
    
    try {
        // PATTERN: Use existing retry decorator
        const result = await withRetry(async () => {
            // CRITICAL: API returns 429 if >10 req/sec
            await rateLimiter.acquire();
            return await externalApi.call(validated);
        }, { attempts: 3, backoff: 'exponential' });
        
        // PATTERN: Standardized response format
        return formatResponse(result);  // see src/utils/responses.js
    } finally {
        await connection.close();
    }
}
```

### Integration Points
```yaml
DATABASE:
  - migration: "Add column 'feature_enabled' to users table"
  - index: "CREATE INDEX idx_feature_lookup ON users(feature_id)"
  
CONFIG:
  - add to: config/settings.js
  - pattern: "FEATURE_TIMEOUT: process.env.FEATURE_TIMEOUT || 30"
  
ROUTES:
  - add to: src/api/routes.js  
  - pattern: "app.use('/feature', featureRouter)"
```

## Validation Loop

### Level 1: Syntax & Style
```bash
# Run these FIRST - fix any errors before proceeding
npm run lint                         # Auto-fix what's possible
npm run type-check                   # Type checking

# Expected: No errors. If errors, READ the error and fix.
```

### Level 2: Unit Tests each new feature/file/function use existing test patterns
```javascript
// CREATE test/new_feature.test.js with these test cases:
describe('newFeature', () => {
  test('happy path - basic functionality works', async () => {
    const result = await newFeature("valid_input");
    expect(result.status).toBe("success");
  });

  test('validation error - invalid input throws error', async () => {
    await expect(newFeature("")).rejects.toThrow(ValidationError);
  });

  test('external api timeout - handles timeouts gracefully', async () => {
    jest.spyOn(externalApi, 'call').mockRejectedValue(new TimeoutError());
    const result = await newFeature("valid");
    expect(result.status).toBe("error");
    expect(result.message).toContain("timeout");
  });
});
```

```bash
# Run and iterate until passing:
npm run test:unit
# If failing: Read error, understand root cause, fix code, re-run (never mock to pass)
```

### Level 3: Integration Test
```bash
# Start the service
npm run dev

# Test the endpoint
curl -X POST http://localhost:3000/feature \
  -H "Content-Type: application/json" \
  -d '{"param": "test_value"}'

# Expected: {"status": "success", "data": {...}}
# If error: Check logs at logs/app.log for stack trace
```

## Final validation Checklist
- [ ] All tests pass: `npm run test`
- [ ] No linting errors: `npm run lint`
- [ ] No type errors: `npm run type-check`
- [ ] Manual test successful: [specific curl/command]
- [ ] Error cases handled gracefully
- [ ] Logs are informative but not verbose
- [ ] Documentation updated if needed

---

## Anti-Patterns to Avoid
- ❌ Don't create new patterns when existing ones work
- ❌ Don't skip validation because "it should work"  
- ❌ Don't ignore failing tests - fix them
- ❌ Don't use blocking operations in async context
- ❌ Don't hardcode values that should be config
- ❌ Don't catch all exceptions - be specific