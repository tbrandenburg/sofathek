# 🛡️ Validation Quick Reference

## Essential Commands
```bash
# Auto-runs on git push (no action needed)
git push

# Manual validation
npm run validate         # Full validation (lint + types + build)
npm run validate:fast    # Fast validation (skip build)
npm run validate:verbose # Show detailed logs

# Emergency skip (use sparingly!)
SKIP_VALIDATION=1 git push
```

## Fix Common Issues
```bash
# Fix linting issues
npm run lint:fix

# Check type errors  
npm run type-check

# Test build locally
npm run build
```

## Timing
- **Fast mode**: ~30s (lint + types)
- **Full mode**: ~60s (lint + types + build)
- **Emergency skip**: instant

## When to Use What
- 🏃‍♂️ **Development**: `npm run validate:fast`
- 🎯 **Before PR**: `npm run validate` 
- 🚨 **Emergency**: `SKIP_VALIDATION=1 git push`

---
📖 **Full docs**: [PRE_PUSH_VALIDATION.md](./PRE_PUSH_VALIDATION.md)