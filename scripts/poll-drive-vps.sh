#!/bin/bash
# Google Drive Polling Script for VPS
# 
# This script can be used with system cron or systemd timers
# Make it executable: chmod +x scripts/poll-drive-vps.sh
#
# Usage:
#   ./scripts/poll-drive-vps.sh
#   Or add to crontab: */5 * * * * /path/to/scripts/poll-drive-vps.sh

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

# Change to project directory
cd "$PROJECT_DIR" || exit 1

# Note: Environment variables are loaded by the TypeScript script using dotenv
# No need to export them here since tsx will handle it

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed or not in PATH"
    exit 1
fi

# Check if tsx is available (try local first, then global)
if [ -f "node_modules/.bin/tsx" ]; then
    TSX_CMD="node_modules/.bin/tsx"
elif command -v tsx &> /dev/null; then
    TSX_CMD="tsx"
else
    echo "ERROR: tsx is not installed. Run: npm install"
    exit 1
fi

# Run the polling script
echo "[$(date -Iseconds)] Starting Google Drive polling..."
$TSX_CMD scripts/poll-google-drive.ts

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo "[$(date -Iseconds)] Polling completed successfully"
else
    echo "[$(date -Iseconds)] Polling failed with exit code $EXIT_CODE"
fi

exit $EXIT_CODE

