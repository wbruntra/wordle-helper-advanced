#!/bin/bash

# Wordle Answers Daily Update Script
# This script downloads the latest Wordle answers from the web and parses them into the database
# Designed to be run daily via cron job

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORDLE_URL="https://wordfinder.yourdictionary.com/wordle/answers/"
TEMP_HTML="${SCRIPT_DIR}/temp_answers.html"
LOG_FILE="${SCRIPT_DIR}/update-wordle-answers.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[${timestamp}] $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

# Cleanup function
cleanup() {
    if [ -f "$TEMP_HTML" ]; then
        rm -f "$TEMP_HTML"
    fi
}

trap cleanup EXIT

# Main execution
log "Starting Wordle answers update..."

# Step 1: Download the HTML
log "Downloading Wordle answers page from ${WORDLE_URL}..."
if ! curl -s -L -o "$TEMP_HTML" "$WORDLE_URL"; then
    log_error "Failed to download HTML from ${WORDLE_URL}"
    exit 1
fi

if [ ! -s "$TEMP_HTML" ]; then
    log_error "Downloaded HTML file is empty"
    exit 1
fi

log_success "HTML downloaded successfully ($(wc -c < "$TEMP_HTML") bytes)"

# Step 2: Parse the HTML and update the database
log "Parsing HTML and updating answer database..."
if ! cd "$SCRIPT_DIR" && bun parseAnswers.ts "$TEMP_HTML"; then
    log_error "Failed to parse HTML or update database"
    exit 1
fi

# Step 3: Verify the database was actually updated
log "Verifying database update..."
VERIFY_RESULT=$(cd "$SCRIPT_DIR" && bun -e "
  const db = require('./db_connect.js');
  const count = await db('answer_history').count('* as total').first();
  const recent = await db('answer_history').select('date', 'word').orderBy('date', 'desc').first();
  console.log('ROWS:' + count.total);
  console.log('RECENT:' + recent.date + '=' + recent.word);
  await db.destroy();
" 2>/dev/null)

ROW_COUNT=$(echo "$VERIFY_RESULT" | grep "ROWS:" | cut -d':' -f2)
RECENT_ENTRY=$(echo "$VERIFY_RESULT" | grep "RECENT:" | cut -d':' -f2)

if [ -z "$ROW_COUNT" ] || [ "$ROW_COUNT" -eq 0 ]; then
    log_error "Database verification failed: No rows found in answer_history table"
    exit 1
fi

log_success "Database verified: $ROW_COUNT rows, most recent: $RECENT_ENTRY"
exit 0
