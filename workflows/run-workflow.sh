#!/bin/bash

# Workflow Runner Script
# Simplifies workflow execution with common patterns

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_color() {
    color=$1
    message=$2
    echo -e "${color}${message}${NC}"
}

# Function to show help
show_help() {
    cat << EOF
Workflow Runner - Execute SPARC workflows

Usage: ./run-workflow.sh [command] [options]

Commands:
    dev <task>          Run development workflow
    ci                  Run CI/CD pipeline
    monitor             Run monitoring workflow
    test <mode>         Run test workflow
    deploy <env>        Deploy to environment
    sparc <mode> <task> Run specific SPARC mode
    batch <tasks...>    Run multiple tasks in batch
    status              Check workflow status
    cleanup             Clean up resources

Options:
    --parallel          Run tasks in parallel
    --non-interactive   Non-interactive mode
    --verbose           Verbose output
    --dry-run          Show what would be executed

Examples:
    ./run-workflow.sh dev "implement auth feature"
    ./run-workflow.sh ci
    ./run-workflow.sh deploy preview
    ./run-workflow.sh sparc tdd "create auth tests"
    ./run-workflow.sh batch "spec auth" "architect auth" "code auth"

EOF
}

# Function to initialize swarm
init_swarm() {
    print_color "$BLUE" "🚀 Initializing swarm..."
    npx claude-flow@alpha swarm init --topology mesh --max-agents 8
}

# Function to run development workflow
run_dev_workflow() {
    task="$1"
    print_color "$GREEN" "🔧 Running development workflow: $task"
    
    init_swarm
    
    # Run SPARC phases
    print_color "$YELLOW" "📋 Phase 1: Specification"
    npx claude-flow@alpha sparc run spec-pseudocode "$task" --non-interactive
    
    print_color "$YELLOW" "🏗️ Phase 2: Architecture"
    npx claude-flow@alpha sparc run architect "$task" --non-interactive
    
    print_color "$YELLOW" "💻 Phase 3: Implementation"
    npx claude-flow@alpha sparc run code "$task" --non-interactive
    
    print_color "$YELLOW" "🧪 Phase 4: Testing"
    npx claude-flow@alpha sparc run tdd "$task" --non-interactive
    
    print_color "$YELLOW" "🔗 Phase 5: Integration"
    npx claude-flow@alpha sparc run integration "$task" --non-interactive
    
    print_color "$GREEN" "✅ Development workflow completed!"
}

# Function to run CI/CD pipeline
run_ci_pipeline() {
    print_color "$GREEN" "🚀 Running CI/CD pipeline"
    
    # Lint and type check
    print_color "$YELLOW" "🔍 Running validations..."
    pnpm lint
    pnpm check-types
    
    # Build
    print_color "$YELLOW" "🏗️ Building application..."
    pnpm build
    
    # Test
    print_color "$YELLOW" "🧪 Running tests..."
    pnpm test
    
    # Deploy to preview
    if [ "$1" == "deploy" ]; then
        print_color "$YELLOW" "🚀 Deploying to preview..."
        pnpm deploy:preview
    fi
    
    print_color "$GREEN" "✅ CI/CD pipeline completed!"
}

# Function to run monitoring
run_monitoring() {
    print_color "$GREEN" "📊 Running monitoring workflow"
    
    # Collect metrics
    npx claude-flow@alpha performance report
    npx claude-flow@alpha token usage
    npx claude-flow@alpha swarm status
    
    # Analyze
    npx claude-flow@alpha bottleneck analyze
    npx claude-flow@alpha trend analysis --period 24h
    
    print_color "$GREEN" "✅ Monitoring completed!"
}

# Function to run SPARC mode
run_sparc() {
    mode="$1"
    task="$2"
    
    print_color "$GREEN" "🎯 Running SPARC mode: $mode"
    npx claude-flow@alpha sparc run "$mode" "$task" --non-interactive
}

# Function to run batch tasks
run_batch() {
    print_color "$GREEN" "🚀 Running batch tasks"
    
    # Build batch command
    batch_cmd="batchtool run --parallel"
    for task in "$@"; do
        batch_cmd="$batch_cmd \"npx claude-flow sparc run $task --non-interactive\""
    done
    
    eval "$batch_cmd"
}

# Function to check status
check_status() {
    print_color "$BLUE" "📊 Checking workflow status..."
    
    npx claude-flow@alpha swarm status
    npx claude-flow@alpha agent list
    npx claude-flow@alpha task status
    npx claude-flow@alpha memory usage
}

# Function to cleanup
cleanup() {
    print_color "$YELLOW" "🧹 Cleaning up resources..."
    
    # Destroy swarm
    npx claude-flow@alpha swarm destroy
    
    # Clear cache
    rm -rf .claude-flow/cache
    
    print_color "$GREEN" "✅ Cleanup completed!"
}

# Main script logic
case "$1" in
    dev)
        run_dev_workflow "$2"
        ;;
    ci)
        run_ci_pipeline "$2"
        ;;
    monitor)
        run_monitoring
        ;;
    test)
        run_sparc "tdd" "$2"
        ;;
    deploy)
        case "$2" in
            preview)
                pnpm deploy:preview
                ;;
            production)
                pnpm deploy:production
                ;;
            *)
                print_color "$RED" "Unknown environment: $2"
                exit 1
                ;;
        esac
        ;;
    sparc)
        run_sparc "$2" "$3"
        ;;
    batch)
        shift
        run_batch "$@"
        ;;
    status)
        check_status
        ;;
    cleanup)
        cleanup
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_color "$RED" "Unknown command: $1"
        show_help
        exit 1
        ;;
esac