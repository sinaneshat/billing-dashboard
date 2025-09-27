#!/bin/bash

# ==============================================================================
# Translation Checker Script for Roundtable Billing Dashboard
# ==============================================================================
#
# This script performs comprehensive translation checks for the application:
# 1. Detects missing translation keys between locales
# 2. Finds hardcoded strings in user-facing code
# 3. Identifies unused translation keys
# 4. Validates translation file structure
# 5. Preserves existing translations (read-only checks)
#
# Usage: ./scripts/check-translations.sh [options]
#   -v, --verbose    Show detailed output
#   -f, --fix        Suggest fixes (does not modify files)
#   -h, --help       Show this help message
#
# ==============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SRC_DIR="$PROJECT_ROOT/src"
I18N_DIR="$PROJECT_ROOT/src/i18n/locales"
EN_FILE="$I18N_DIR/en/common.json"
FA_FILE="$I18N_DIR/fa/common.json"

# Options
VERBOSE=false
SUGGEST_FIX=false

# Counters for issues
TOTAL_ISSUES=0
MISSING_KEYS=0
HARDCODED_STRINGS=0
UNUSED_KEYS=0
STRUCTURE_ISSUES=0

# ==============================================================================
# Helper Functions
# ==============================================================================

log_info() {
    echo -e "${CYAN}ℹ${NC}  $1"
}

log_success() {
    echo -e "${GREEN}✓${NC}  $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC}  $1"
    ((TOTAL_ISSUES++))
}

log_error() {
    echo -e "${RED}✗${NC}  $1"
    ((TOTAL_ISSUES++))
}

log_header() {
    echo ""
    echo -e "${BOLD}${BLUE}$1${NC}"
    echo -e "${BLUE}$(printf '%.0s=' {1..60})${NC}"
}

show_help() {
    grep '^#' "$0" | grep -E '^# (Usage|This script|[0-9]\.)' | sed 's/^# //'
    exit 0
}

# ==============================================================================
# Validation Functions
# ==============================================================================

# Check if translation files exist
check_files_exist() {
    log_header "Checking Translation Files"

    if [[ ! -f "$EN_FILE" ]]; then
        log_error "English translation file not found: $EN_FILE"
        exit 1
    fi

    if [[ ! -f "$FA_FILE" ]]; then
        log_error "Farsi translation file not found: $FA_FILE"
        exit 1
    fi

    log_success "Translation files found"
}

# Validate JSON structure
validate_json_structure() {
    log_header "Validating JSON Structure"

    # Check if files are valid JSON
    if ! jq empty "$EN_FILE" 2>/dev/null; then
        log_error "English translation file is not valid JSON"
        ((STRUCTURE_ISSUES++))
    else
        log_success "English translation file is valid JSON"
    fi

    if ! jq empty "$FA_FILE" 2>/dev/null; then
        log_error "Farsi translation file is not valid JSON"
        ((STRUCTURE_ISSUES++))
    else
        log_success "Farsi translation file is valid JSON"
    fi
}

# Extract all keys from a JSON file recursively
extract_keys() {
    local file=$1
    jq -r 'paths(scalars) as $p | $p | join(".")' "$file" | sort | uniq
}

# Check for missing keys between locales
check_missing_keys() {
    log_header "Checking for Missing Translation Keys"

    # Extract keys from both files
    local en_keys_file=$(mktemp)
    local fa_keys_file=$(mktemp)

    extract_keys "$EN_FILE" > "$en_keys_file"
    extract_keys "$FA_FILE" > "$fa_keys_file"

    # Find keys in EN but not in FA
    local missing_in_fa=$(comm -23 "$en_keys_file" "$fa_keys_file")
    if [[ -n "$missing_in_fa" ]]; then
        log_warning "Keys missing in Farsi translation:"
        while IFS= read -r key; do
            echo "    - $key"
            ((MISSING_KEYS++))

            if $SUGGEST_FIX; then
                # Get the English value
                local en_value=$(jq -r ".$key" "$EN_FILE" 2>/dev/null)
                if [[ -n "$en_value" && "$en_value" != "null" ]]; then
                    echo -e "      ${CYAN}Suggested: Add to fa/common.json: \"$key\": \"[ترجمه: $en_value]\"${NC}"
                fi
            fi
        done <<< "$missing_in_fa"
    fi

    # Find keys in FA but not in EN
    local missing_in_en=$(comm -13 "$en_keys_file" "$fa_keys_file")
    if [[ -n "$missing_in_en" ]]; then
        log_warning "Keys missing in English translation:"
        while IFS= read -r key; do
            echo "    - $key"
            ((MISSING_KEYS++))
        done <<< "$missing_in_en"
    fi

    if [[ $MISSING_KEYS -eq 0 ]]; then
        log_success "All translation keys are present in both locales"
    fi

    # Cleanup temp files
    rm -f "$en_keys_file" "$fa_keys_file"
}

# Find translation keys used in code
find_used_keys() {
    log_header "Scanning for Used Translation Keys"

    local used_keys_file=$(mktemp)

    # Find all t() function calls and extract keys
    grep -r "t(['\"]" "$SRC_DIR" --include="*.tsx" --include="*.ts" 2>/dev/null | \
        grep -v "node_modules" | \
        grep -oE "t\(['\"]([^'\"]+)['\"]" | \
        sed -E "s/t\(['\"](.+)['\"].*/\1/" | \
        sort | uniq > "$used_keys_file"

    local key_count=$(wc -l < "$used_keys_file")
    log_info "Found $key_count unique translation keys used in code"

    if $VERBOSE; then
        echo "Sample of used keys:"
        head -n 10 "$used_keys_file" | while IFS= read -r key; do
            echo "    - $key"
        done
        if [[ $key_count -gt 10 ]]; then
            echo "    ... and $((key_count - 10)) more"
        fi
    fi

    echo "$used_keys_file"
}

# Check for unused translation keys
check_unused_keys() {
    log_header "Checking for Unused Translation Keys"

    local used_keys_file=$(find_used_keys)
    local all_keys_file=$(mktemp)

    # Get all keys from English file (as reference)
    extract_keys "$EN_FILE" > "$all_keys_file"

    # Find keys in translations but not used in code
    local unused=$(comm -23 "$all_keys_file" "$used_keys_file")

    if [[ -n "$unused" ]]; then
        log_warning "Potentially unused translation keys:"
        local count=0
        while IFS= read -r key; do
            # Skip certain system keys that might be used dynamically
            if [[ ! "$key" =~ ^(metadata|status\.|error\.|success\.) ]]; then
                echo "    - $key"
                ((count++))
                ((UNUSED_KEYS++))

                if [[ $count -ge 20 ]] && ! $VERBOSE; then
                    echo "    ... and more (use -v for full list)"
                    break
                fi
            fi
        done <<< "$unused"
    else
        log_success "All translation keys appear to be used"
    fi

    # Cleanup
    rm -f "$used_keys_file" "$all_keys_file"
}

# Find hardcoded strings in UI components
find_hardcoded_strings() {
    log_header "Scanning for Hardcoded Strings"

    # Patterns that indicate hardcoded user-facing strings
    local patterns=(
        ">[A-Z][a-zA-Z ]{3,}</"
        "placeholder=['\"][^'\"]+['\"]"
        "title=['\"][^'\"]+['\"]"
        "label=['\"][^'\"]+['\"]"
        "toast\.(success|error|warning|info)\(['\"][^'\"]+['\"]"
        "Button[^>]*>[^<]+<"
    )

    local found_issues=false

    for pattern in "${patterns[@]}"; do
        local results=$(grep -r "$pattern" "$SRC_DIR/components" "$SRC_DIR/app" \
            --include="*.tsx" \
            --exclude-dir="node_modules" \
            --exclude-dir=".next" 2>/dev/null | \
            grep -v "t(['\"]" | \
            grep -v "useTranslations" | \
            grep -v "className" | \
            grep -v "data-" | \
            head -n 5)

        if [[ -n "$results" ]]; then
            if ! $found_issues; then
                log_warning "Potential hardcoded strings found:"
                found_issues=true
            fi

            while IFS= read -r line; do
                # Extract filename and line content
                local file_info=$(echo "$line" | cut -d: -f1)
                local file_path=${file_info#$PROJECT_ROOT/}
                local content=$(echo "$line" | cut -d: -f2-)

                # Clean up the content for display
                content=$(echo "$content" | sed 's/^[[:space:]]*//' | head -c 80)

                echo -e "    ${YELLOW}$file_path${NC}"
                echo "      $content..."
                ((HARDCODED_STRINGS++))
            done <<< "$results"
        fi
    done

    if ! $found_issues; then
        log_success "No obvious hardcoded strings found"
    fi
}

# Check for consistent key naming
check_naming_conventions() {
    log_header "Checking Translation Key Naming Conventions"

    local issues=0

    # Check for keys with spaces (should use dots or underscores)
    local keys_with_spaces=$(extract_keys "$EN_FILE" | grep ' ' || true)
    if [[ -n "$keys_with_spaces" ]]; then
        log_warning "Keys containing spaces (should use dots or underscores):"
        echo "$keys_with_spaces" | while IFS= read -r key; do
            echo "    - $key"
            ((issues++))
        done
    fi

    # Check for inconsistent casing
    local uppercase_keys=$(extract_keys "$EN_FILE" | grep -E '[A-Z]' | grep -v '^[A-Z_]+$' || true)
    if [[ -n "$uppercase_keys" ]] && $VERBOSE; then
        log_info "Keys with mixed casing (consider using camelCase or snake_case consistently):"
        echo "$uppercase_keys" | head -n 5 | while IFS= read -r key; do
            echo "    - $key"
        done
    fi

    if [[ $issues -eq 0 ]]; then
        log_success "Translation key naming follows conventions"
    fi
}

# Generate summary report
generate_report() {
    log_header "Translation Check Summary"

    local en_key_count=$(extract_keys "$EN_FILE" | wc -l)
    local fa_key_count=$(extract_keys "$FA_FILE" | wc -l)

    echo -e "${BOLD}Translation Statistics:${NC}"
    echo "  English keys:     $en_key_count"
    echo "  Farsi keys:       $fa_key_count"
    echo ""
    echo -e "${BOLD}Issues Found:${NC}"
    echo "  Missing keys:     $MISSING_KEYS"
    echo "  Hardcoded strings: $HARDCODED_STRINGS"
    echo "  Unused keys:      $UNUSED_KEYS"
    echo "  Structure issues: $STRUCTURE_ISSUES"
    echo ""

    if [[ $TOTAL_ISSUES -eq 0 ]]; then
        echo -e "${GREEN}${BOLD}✓ All translation checks passed!${NC}"
        exit 0
    else
        echo -e "${YELLOW}${BOLD}⚠ Found $TOTAL_ISSUES issue(s) that need attention${NC}"

        if ! $SUGGEST_FIX; then
            echo ""
            echo "Run with --fix flag to see suggested fixes"
        fi

        exit 1
    fi
}

# ==============================================================================
# Main Script
# ==============================================================================

main() {
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -f|--fix)
                SUGGEST_FIX=true
                shift
                ;;
            -h|--help)
                show_help
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                ;;
        esac
    done

    echo -e "${BOLD}${CYAN}🔍 Roundtable Translation Checker${NC}"
    echo -e "${CYAN}$(printf '%.0s=' {1..60})${NC}"

    # Run all checks
    check_files_exist
    validate_json_structure
    check_missing_keys
    check_unused_keys
    find_hardcoded_strings
    check_naming_conventions

    # Generate final report
    generate_report
}

# Run main function
main "$@"