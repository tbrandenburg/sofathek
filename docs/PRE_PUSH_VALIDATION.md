# 🛡️ Pre-Push Hook & Validation System

Sofathek includes a comprehensive pre-push validation system that ensures code quality and prevents broken builds from reaching the repository. The system performs **static analysis** and **build validation** automatically before every push.

## 🚀 Quick Start

The pre-push hook is **automatically enabled** when you run `npm install` (via Husky). No additional setup required!

```bash
# Normal development workflow - validation runs automatically
git add .
git commit -m "feat: add new feature"
git push  # ← Validation runs here automatically
```

## 🔍 What Gets Validated

### **Automatic Pre-Push Checks:**
1. **📝 Code Linting** - ESLint checks for style and quality issues (~10-15s)
2. **🔍 Type Checking** - TypeScript validation across all workspaces (~5-10s)  
3. **🏗️ Build Validation** - Ensures production builds work correctly (~15-30s)

**Total Time: 30-60 seconds** for full validation

## 💻 Manual Validation Commands

You can run validations manually using these npm scripts:

```bash
# Full validation (same as pre-push hook)
npm run validate

# Fast validation (skip build for speed)  
npm run validate:fast

# Verbose output (see detailed logs)
npm run validate:verbose

# Emergency skip (use sparingly!)
npm run validate:skip
```

### **Direct Script Usage:**
```bash
# Run validation script directly
./scripts/validate.sh                # Full validation
./scripts/validate.sh --fast         # Skip build step
./scripts/validate.sh --verbose      # Show detailed output
./scripts/validate.sh --help         # Show help
```

## 🚨 Emergency Skip Mechanisms

For urgent hotfixes when validation is failing but you need to push immediately:

### **Method 1: Environment Variable**
```bash
SKIP_VALIDATION=1 git push
```

### **Method 2: NPM Script**
```bash
npm run validate:skip
# Then push normally
git push
```

### **Method 3: Fast Mode** (Skip build only)
```bash
# If only build is failing but lint/types are OK
npm run validate:fast
```

⚠️ **Use skip mechanisms responsibly** - they should only be used for genuine emergencies!

## 📊 Validation Performance

| Check Type | Duration | Importance | Can Skip? |
|------------|----------|------------|-----------|
| Linting | ~15s | High | ❌ No |
| Type Check | ~10s | High | ❌ No |  
| Build | ~30s | High | ✅ `--fast` |
| **Total** | **~55s** | - | - |

## 🔧 Troubleshooting

### **Common Issues & Quick Fixes:**

#### **❌ Linting Failed**
```bash
# Auto-fix most linting issues
npm run lint:fix

# Check specific workspace
npm run lint:fix -w frontend
npm run lint:fix -w backend
```

#### **❌ Type Checking Failed**
```bash
# Check types manually
npm run type-check

# Check specific workspace  
cd frontend && npm run type-check
cd backend && npm run type-check
```

#### **❌ Build Failed**
```bash
# Debug build issues
npm run build

# Check workspace builds individually
cd frontend && npm run build
cd backend && npm run build
```

#### **❌ Hook Not Running**
```bash
# Reinstall hooks
npx husky install
chmod +x .husky/pre-push

# Verify hook exists
ls -la .husky/pre-push
```

## 🎛️ Configuration

### **Customize Validation Behavior**

#### **Skip Build in Fast Development**
Add to your shell profile (`.bashrc`, `.zshrc`):
```bash
# Always use fast validation for development
alias validate="npm run validate:fast"
```

#### **Team-Specific Settings**
```bash
# For speed-focused teams
export DEFAULT_VALIDATION="fast"

# For quality-focused teams  
export DEFAULT_VALIDATION="full"
```

### **Modify Validation Rules**

#### **Edit Validation Script**
```bash
# Customize validation logic
vim scripts/validate.sh

# Add new validation steps
# Modify timeout settings
# Change output formatting
```

#### **Workspace-Specific Overrides**
```bash
# Skip validation for specific workspace
cd frontend && git commit --no-verify
cd backend && git commit --no-verify
```

## 🎯 Best Practices

### **✅ Recommended Workflow:**
1. **Develop normally** - hooks run automatically
2. **Fix issues quickly** - use `npm run validate:fast` during development  
3. **Full validation before PR** - run `npm run validate` 
4. **Emergency skip sparingly** - only for genuine urgent fixes

### **🚀 Performance Tips:**
- Use `npm run validate:fast` during active development
- Run full validation before important commits
- Fix lint issues with `npm run lint:fix` 
- Use `--verbose` flag only when debugging

### **👥 Team Guidelines:**
- **Never skip validation** without team approval
- **Fix validation issues** before asking for help
- **Document any skips** in commit messages
- **Run validation locally** before pushing

## 🔍 Advanced Usage

### **Custom Validation Scenarios**
```bash
# Validate specific file types only
./scripts/validate.sh --lint-only

# Validate with custom timeout
VALIDATION_TIMEOUT=120 ./scripts/validate.sh

# Validate in CI mode (different rules)
CI=true ./scripts/validate.sh
```

### **Integration with IDEs**
Add validation as IDE tasks:

#### **VS Code Tasks** (`.vscode/tasks.json`):
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Validate Fast",
      "type": "shell", 
      "command": "npm run validate:fast",
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared"
      }
    }
  ]
}
```

#### **JetBrains IDEs**:
1. Go to **Run/Debug Configurations**
2. Add new **Shell Script** configuration
3. Set script path: `./scripts/validate.sh --fast`

## 📈 Monitoring & Metrics

### **Track Validation Performance**
```bash
# Time validation runs
time npm run validate

# Profile validation steps
./scripts/validate.sh --verbose --profile
```

### **Validation Success Rates**
The validation system logs success/failure rates to help optimize the process:
- Average validation time
- Most common failure types  
- Performance trends over time

---

## 🆘 Need Help?

### **Quick Reference:**
```bash
npm run validate        # Full validation
npm run validate:fast   # Skip build (faster)
npm run validate:skip   # Emergency skip
./scripts/validate.sh --help  # Detailed help
```

### **Support:**
- 📖 Check this documentation first
- 🐛 For bugs: [Create an issue](https://github.com/tombrandenburgh/sofathek/issues)
- 💬 For questions: Ask in team chat
- 🚨 For emergencies: Use skip mechanisms responsibly

The validation system is designed to help maintain code quality while staying out of your way during normal development. When in doubt, run `npm run validate:fast` for quick feedback!