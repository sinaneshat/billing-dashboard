#!/bin/bash
# Claude Code hook for automatic ESLint formatting on file changes.
# Runs ESLint --fix on modified TypeScript/JavaScript files.

set -euo pipefail

# Read JSON input from stdin
INPUT=$(cat)

# Extract data using jq
HOOK_EVENT=$(echo "$INPUT" | jq -r '.hook_event_name // ""')
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // ""')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""')

# Check if we have required environment variable
if [ -z "${CLAUDE_PROJECT_DIR:-}" ]; then
    echo "Error: CLAUDE_PROJECT_DIR not set" >&2
    exit 1
fi

# Function to check if file should be linted
is_lintable_file() {
    local file_path="$1"

    # Check if file path is provided
    [ -n "$file_path" ] || return 1

    # Check for supported extensions
    case "$file_path" in
        *.ts|*.tsx|*.js|*.jsx) ;;
        *) return 1 ;;
    esac

    # Skip certain patterns
    case "$file_path" in
        */node_modules/*|*/.next/*|*/dist/*|*/build/*|*/.claude/*|*/migrations/*) return 1 ;;
        *.d.ts|*next-env.d.ts|*cloudflare-env.d.ts) return 1 ;;
    esac

    return 0
}

# Function to run ESLint fix
run_eslint_fix() {
    local file_path="$1"
    local project_dir="$2"

    # Make file path relative to project directory
    local rel_path=$(realpath --relative-to="$project_dir" "$file_path" 2>/dev/null || echo "$file_path")

    # Change to project directory
    cd "$project_dir"

    # Run ESLint with fix
    if timeout 30s pnpm lint:fix "$rel_path" 2>/dev/null; then
        echo "✅ ESLint fix applied to $rel_path"
        return 0
    else
        local exit_code=$?

        # Check if it's just warnings (exit code might be 0 with warnings)
        if pnpm lint:file "$rel_path" 2>&1 | grep -q "error" && [ $exit_code -ne 0 ]; then
            echo "❌ ESLint errors in $rel_path" >&2
            pnpm lint:file "$rel_path" >&2 2>/dev/null || true
            return 2
        else
            echo "⚠️ ESLint warnings in $rel_path (fixed what could be fixed)"
            return 0
        fi
    fi
}

# Function to run TypeScript type check
run_type_check() {
    local project_dir="$1"

    cd "$project_dir"

    if timeout 60s pnpm check-types >/dev/null 2>&1; then
        echo "✅ TypeScript types are valid"
        return 0
    else
        echo "❌ TypeScript errors found" >&2
        pnpm check-types >&2 2>/dev/null || true
        return 2
    fi
}

# Main logic
if [ "$HOOK_EVENT" = "PostToolUse" ] && [[ "$TOOL_NAME" =~ ^(Write|Edit|MultiEdit)$ ]]; then
    if is_lintable_file "$FILE_PATH"; then
        # Run ESLint fix
        if ! run_eslint_fix "$FILE_PATH" "$CLAUDE_PROJECT_DIR"; then
            exit 2  # Block execution with error feedback
        fi

        # Run type check for TypeScript files
        case "$FILE_PATH" in
            *.ts|*.tsx)
                if ! run_type_check "$CLAUDE_PROJECT_DIR"; then
                    exit 2  # Block execution with error feedback
                fi
                ;;
        esac
    fi
fi

exit 0