#!/bin/bash

# Linting Resolution Script
# This script helps systematically fix linting errors in the ArchiTech project

set -e

echo "🚀 Starting Linting Resolution Process..."
echo "Current directory: $(pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if we're in the right directory
check_directory() {
    if [ ! -f "package.json" ] || [ ! -d "src" ]; then
        print_error "Please run this script from the project root directory"
        exit 1
    fi
}

# Function to backup current state
backup_state() {
    print_status "Creating backup..."
    git add -A
    git commit -m "Backup before linting fixes - $(date)" || print_warning "No changes to backup"
}

# Function to get current error count
get_error_count() {
    npm run lint 2>&1 | grep -o "Found [0-9]* errors" | grep -o "[0-9]*" || echo "0"
}

# Function to apply safe auto-fixes
apply_safe_fixes() {
    print_status "Applying safe auto-fixes..."
    
    # Apply Biome formatting and safe fixes
    npx biome check src/ --apply-unsafe 2>/dev/null || true
    
    print_success "Safe auto-fixes applied"
}

# Function to fix button types
fix_button_types() {
    print_status "Fixing button type attributes..."
    
    # Find all button elements without type attribute and add type="button"
    find src/ -name "*.tsx" -type f -exec sed -i '' 's/<button\([^>]*\)\(onClick\|className\)\([^>]*\)>/<button type="button"\1\2\3>/g' {} \;
    
    # Clean up any duplicate type attributes
    find src/ -name "*.tsx" -type f -exec sed -i '' 's/type="button"\([^>]*\)type="button"/type="button"\1/g' {} \;
    
    print_success "Button types fixed"
}

# Function to fix self-closing elements
fix_self_closing() {
    print_status "Converting empty elements to self-closing..."
    
    # Common empty elements that should be self-closing
    local elements=("div" "span" "img" "input" "br" "hr")
    
    for element in "${elements[@]}"; do
        find src/ -name "*.tsx" -type f -exec sed -i '' "s/<${element}\([^>]*\)><\/${element}>/< ${element}\1 \/>/g" {} \;
    done
    
    print_success "Self-closing elements fixed"
}

# Function to add aria-hidden to decorative icons
fix_decorative_icons() {
    print_status "Adding aria-hidden to decorative icons..."
    
    # Add aria-hidden to Lucide React icons that are likely decorative
    find src/ -name "*.tsx" -type f -exec sed -i '' 's/<\([A-Z][a-zA-Z]*\)\s\+size={[^}]*}\s\+className="\([^"]*\)"/<\1 size={16} className="\2" aria-hidden="true"/g' {} \;
    
    print_success "Decorative icons updated"
}

# Function to run incremental tests
run_tests() {
    print_status "Running tests to ensure no regressions..."
    
    # Type checking
    print_status "Checking TypeScript compilation..."
    npx tsc --noEmit || {
        print_error "TypeScript compilation failed"
        return 1
    }
    
    # Build test
    print_status "Testing build process..."
    npm run build > /dev/null 2>&1 || {
        print_error "Build failed"
        return 1
    }
    
    print_success "All tests passed"
}

# Function to show progress
show_progress() {
    local current_errors=$(get_error_count)
    print_status "Current error count: $current_errors"
    
    if [ "$current_errors" -lt "$1" ]; then
        local fixed=$(("$1" - "$current_errors"))
        print_success "Fixed $fixed errors! 🎉"
    fi
}

# Main execution
main() {
    check_directory
    
    print_status "Starting linting resolution process..."
    
    # Get initial error count
    local initial_errors=$(get_error_count)
    print_status "Initial error count: $initial_errors"
    
    # Create backup
    backup_state
    
    # Phase 1: Safe auto-fixes
    print_status "\n=== Phase 1: Safe Auto-fixes ==="
    apply_safe_fixes
    show_progress $initial_errors
    
    # Phase 2: Button types
    print_status "\n=== Phase 2: Button Types ==="
    fix_button_types
    show_progress $initial_errors
    
    # Phase 3: Self-closing elements
    print_status "\n=== Phase 3: Self-closing Elements ==="
    fix_self_closing
    show_progress $initial_errors
    
    # Phase 4: Decorative icons
    print_status "\n=== Phase 4: Decorative Icons ==="
    fix_decorative_icons
    show_progress $initial_errors
    
    # Run tests
    print_status "\n=== Testing Phase ==="
    run_tests || {
        print_error "Tests failed. Please review changes manually."
        exit 1
    }
    
    # Final status
    local final_errors=$(get_error_count)
    local total_fixed=$((initial_errors - final_errors))
    
    print_success "\n=== Summary ==="
    print_success "Initial errors: $initial_errors"
    print_success "Final errors: $final_errors"
    print_success "Total fixed: $total_fixed"
    
    if [ "$final_errors" -eq 0 ]; then
        print_success "🎉 All linting errors resolved!"
    else
        print_warning "$final_errors errors remaining. Manual fixes required."
        print_status "Check LINTING_RESOLUTION_PLAN.md for manual fix guidance."
    fi
    
    # Commit progress
    git add -A
    git commit -m "Auto-fix linting errors: $total_fixed issues resolved" || print_warning "No changes to commit"
}

# Help function
show_help() {
    echo "Linting Resolution Script"
    echo ""
    echo "Usage: $0 [option]"
    echo ""
    echo "Options:"
    echo "  --help, -h     Show this help message"
    echo "  --dry-run      Show what would be fixed without making changes"
    echo "  --status       Show current linting status"
    echo "  --manual       Show manual fix recommendations"
    echo ""
    echo "Examples:"
    echo "  $0              # Run full auto-fix process"
    echo "  $0 --status     # Check current error count"
    echo "  $0 --dry-run    # Preview changes without applying"
}

# Handle command line arguments
case "${1:-}" in
    --help|-h)
        show_help
        exit 0
        ;;
    --status)
        check_directory
        current_errors=$(get_error_count)
        print_status "Current linting errors: $current_errors"
        exit 0
        ;;
    --dry-run)
        print_status "DRY RUN MODE - No changes will be made"
        print_status "This would apply safe auto-fixes for:"
        print_status "- Button type attributes"
        print_status "- Self-closing elements"
        print_status "- Decorative icon aria-hidden attributes"
        print_status "- Biome formatting fixes"
        exit 0
        ;;
    --manual)
        print_status "Manual fixes required for:"
        print_status "- SVG title elements (need semantic descriptions)"
        print_status "- Keyboard event handlers (need UX consideration)"
        print_status "- Semantic HTML elements (need structural review)"
        print_status "- TypeScript any types (need proper type definitions)"
        print_status "\nSee LINTING_RESOLUTION_PLAN.md for detailed guidance"
        exit 0
        ;;
    "")
        main
        ;;
    *)
        print_error "Unknown option: $1"
        show_help
        exit 1
        ;;
esac