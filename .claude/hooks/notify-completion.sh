#!/bin/bash
# Claude Code hook for notification when agents complete tasks.
# Plays a notification sound only (no desktop notifications).

set -euo pipefail

# Read JSON input from stdin
INPUT=$(cat)

# Extract hook event name using jq
HOOK_EVENT=$(echo "$INPUT" | jq -r '.hook_event_name // ""')
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // ""')

# Function to play notification sound
play_notification_sound() {
    local system=$(uname -s)

    case "$system" in
        "Darwin")
            # macOS - use afplay with built-in system sound
            afplay "/System/Library/Sounds/Ping.aiff" 2>/dev/null || echo -e "\a"
            ;;
        "Linux")
            # Linux - try multiple sound options
            if command -v paplay >/dev/null 2>&1; then
                paplay "/usr/share/sounds/alsa/Front_Left.wav" 2>/dev/null || \
                paplay "/usr/share/sounds/sound-icons/prompt.wav" 2>/dev/null || \
                echo -e "\a"
            elif command -v aplay >/dev/null 2>&1; then
                aplay "/usr/share/sounds/alsa/Front_Left.wav" 2>/dev/null || echo -e "\a"
            elif command -v speaker-test >/dev/null 2>&1; then
                timeout 1s speaker-test -t sine -f 1000 -l 1 2>/dev/null || echo -e "\a"
            else
                echo -e "\a"
            fi
            ;;
        "MINGW"*|"CYGWIN"*|"MSYS"*)
            # Windows - use PowerShell beep
            powershell -c "[console]::beep(800,300)" 2>/dev/null || echo -e "\a"
            ;;
        *)
            # Fallback - bell character
            echo -e "\a"
            ;;
    esac
}

# Handle different hook events
case "$HOOK_EVENT" in
    "Stop")
        TITLE="🤖 Claude Task Complete"
        MESSAGE="Claude has finished processing your request"
        play_notification_sound
        echo "✅ $TITLE: $MESSAGE"
        ;;
    "SubagentStop")
        TITLE="🤖 Agent Task Complete"
        MESSAGE="A specialized agent has finished processing"
        play_notification_sound
        echo "✅ $TITLE: $MESSAGE"
        ;;
    "PostToolUse")
        if [ "$TOOL_NAME" = "Task" ]; then
            TITLE="🎯 Subagent Task Complete"
            MESSAGE="A specialized agent has completed its task"
            play_notification_sound
            echo "✅ $TITLE: $MESSAGE"
        fi
        ;;
    *)
        # Unknown event - do nothing
        exit 0
        ;;
esac