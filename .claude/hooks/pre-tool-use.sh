#!/usr/bin/env bash

# Read JSON input from stdin (required by Claude Code)
read -r input_json

# Extract tool name from JSON (optional - for debugging)
# tool_name=$(echo "$input_json" | grep -o '"tool":"[^"]*"' | cut -d'"' -f4)

# Output message that will be shown
echo "🎬 Hook is WORKING! Ready for 10-agent parallel workflow! 🚀"

# Exit with success (0 = allow tool to run)
exit 0
