#!/usr/bin/env bash
set -e

# Sofathek Validation Script
# Can be run manually or as part of git hooks
# Usage: ./scripts/validate.sh [--fast|--skip-build]

# Parse command line arguments
FAST_MODE=false
SKIP_BUILD=false
VERBOSE=false

for arg in "$@"; do
    case $arg in
        --fast)
            FAST_MODE=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --help|-h)
            echo "Sofathek Validation Script"
            echo ""
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --fast        Skip build step (faster validation)"
            echo "  --skip-build  Skip build step only"
            echo "  --verbose,-v  Show detailed output"
            echo "  --help,-h     Show this help message"
            echo ""
            echo "Environment variables:"
            echo "  SKIP_VALIDATION=1  Skip all validation (emergency use)"
            echo ""
            echo "Examples:"
            echo "  $0                    # Full validation"
            echo "  $0 --fast            # Skip build for speed"
            echo "  SKIP_VALIDATION=1 $0 # Emergency skip"
            exit 0
            ;;
    esac
done

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "${BLUE}$1${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

print_success() {
    echo -e "   ${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "   ${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "   ${YELLOW}⚠️  $1${NC}"
}

print_step() {
    echo -e "${BLUE}$1${NC}"
}

show_elapsed() {
    current_time=$(date +%s)
    elapsed=$((current_time - start_time))
    if [ "$VERBOSE" = true ]; then
        echo -e "   ${YELLOW}⏱️  ${elapsed}s elapsed${NC}"
    fi
}

print_quick_fixes() {
    echo ""
    echo -e "${YELLOW}💡 Quick fixes:${NC}"
    for fix in "$@"; do
        echo -e "   ${YELLOW}• $fix${NC}"
    done
}

# Check for emergency skip
if [ "$SKIP_VALIDATION" = "1" ]; then
    print_warning "SKIPPING validation due to SKIP_VALIDATION=1"
    print_warning "Use only for emergency fixes!"
    exit 0
fi

# Start validation
print_header "🔍 Running Sofathek validation..."

if [ "$FAST_MODE" = true ]; then
    print_warning "Fast mode enabled - skipping build validation"
    SKIP_BUILD=true
fi

start_time=$(date +%s)

# Step 1: Linting
print_step "📝 Step 1: Linting code..."
if [ "$VERBOSE" = true ]; then
    make lint
    lint_result=$?
else
    make lint > /dev/null 2>&1
    lint_result=$?
fi

if [ $lint_result -eq 0 ]; then
    print_success "Linting passed"
    show_elapsed
else
    print_error "Linting failed - fix code style issues"
    print_quick_fixes \
        "Run: make lint" \
        "Auto-fix: npm run lint:fix" \
        "Check specific workspace: npm run lint:fix -w frontend"
    exit 1
fi

echo ""

# Step 2: Type checking
print_step "🔍 Step 2: Type checking..."
if [ "$VERBOSE" = true ]; then
    make type-check
    type_result=$?
else
    make type-check > /dev/null 2>&1
    type_result=$?
fi

if [ $type_result -eq 0 ]; then
    print_success "Type checking passed"
    show_elapsed
else
    print_error "Type checking failed - fix TypeScript errors"
    print_quick_fixes \
        "Run: make type-check" \
        "Check frontend: cd frontend && npm run type-check" \
        "Check backend: cd backend && npm run type-check"
    exit 1
fi

# Step 3: Build validation (unless skipped)
if [ "$SKIP_BUILD" = false ]; then
    echo ""
    print_step "🏗️  Step 3: Build validation..."
    
    if [ "$VERBOSE" = true ]; then
        make build
        build_result=$?
    else
        make build > /dev/null 2>&1
        build_result=$?
    fi

    if [ $build_result -eq 0 ]; then
        print_success "Build validation passed"
        show_elapsed
    else
        print_error "Build failed - fix build errors"
        print_quick_fixes \
            "Run: make build" \
            "Check frontend build: cd frontend && npm run build" \
            "Check backend build: cd backend && npm run build"
        exit 1
    fi
fi

# Success summary
end_time=$(date +%s)
total_time=$((end_time - start_time))

echo ""
print_header "✅ All validations passed! (${total_time}s total)"
echo -e "${GREEN}🚀 Code is ready!${NC}"

if [ "$SKIP_BUILD" = true ]; then
    print_warning "Build validation was skipped"
fi

echo ""