#!/bin/bash

###############################################################################
# Daily Generation Batch Script
#
# Generates N connections with rate limiting and error handling.
# Designed to run in GitHub Actions on a daily schedule.
#
# Usage:
#   ./scripts/generate-batch.sh [count] [delay_seconds]
#
# Arguments:
#   count: Number of connections to generate (default: 20)
#   delay_seconds: Delay between generations (default: 10)
#
# Example:
#   ./scripts/generate-batch.sh 20 10  # Generate 20 with 10s delay
###############################################################################

set -e  # Exit on error

# Configuration
COUNT=${1:-20}
DELAY=${2:-10}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Log file
LOG_FILE="$PROJECT_ROOT/logs/generation-$(date +%Y%m%d-%H%M%S).log"
mkdir -p "$(dirname "$LOG_FILE")"

# Logging function
log() {
  local level=$1
  shift
  local message="$@"
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# Header
echo ""
echo "================================================================"
echo "  🤖 Daily Connection Generation Batch"
echo "================================================================"
echo ""
log "INFO" "Starting batch generation"
log "INFO" "Configuration: COUNT=$COUNT DELAY=${DELAY}s"
log "INFO" "Log file: $LOG_FILE"
echo ""

# Validate environment
if [ ! -f "$PROJECT_ROOT/.env.local" ]; then
  log "ERROR" ".env.local not found. Please create it with Supabase credentials."
  exit 1
fi

# Track statistics
SUCCESS_COUNT=0
FAILURE_COUNT=0
START_TIME=$(date +%s)

# Generate connections
for i in $(seq 1 $COUNT); do
  echo "================================================================"
  echo "  Connection $i/$COUNT"
  echo "================================================================"
  echo ""

  log "INFO" "Generating connection $i/$COUNT"

  # Run generation script
  if cd "$PROJECT_ROOT" && npm run generate >> "$LOG_FILE" 2>&1; then
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    log "INFO" "✅ Connection $i/$COUNT completed successfully"
    echo -e "${GREEN}✅ Success${NC}"
  else
    FAILURE_COUNT=$((FAILURE_COUNT + 1))
    log "ERROR" "❌ Connection $i/$COUNT failed"
    echo -e "${RED}❌ Failed${NC}"

    # Don't stop on individual failures, continue with batch
    log "WARN" "Continuing with next connection despite failure"
  fi

  # Rate limiting (skip delay on last iteration)
  if [ $i -lt $COUNT ]; then
    echo ""
    log "INFO" "Waiting ${DELAY}s before next generation..."
    echo -e "${YELLOW}⏳ Waiting ${DELAY}s...${NC}"
    sleep $DELAY
    echo ""
  fi
done

# Calculate statistics
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
DURATION_MINUTES=$((DURATION / 60))
DURATION_SECONDS=$((DURATION % 60))

# Summary
echo ""
echo "================================================================"
echo "  📊 Batch Generation Summary"
echo "================================================================"
echo ""
log "INFO" "Batch generation completed"
log "INFO" "Total: $COUNT | Success: $SUCCESS_COUNT | Failed: $FAILURE_COUNT"
log "INFO" "Duration: ${DURATION_MINUTES}m ${DURATION_SECONDS}s"

echo "Total:     $COUNT"
echo -e "Success:   ${GREEN}$SUCCESS_COUNT${NC}"
echo -e "Failed:    ${RED}$FAILURE_COUNT${NC}"
echo "Duration:  ${DURATION_MINUTES}m ${DURATION_SECONDS}s"
echo "Log file:  $LOG_FILE"
echo ""

# Success rate
SUCCESS_RATE=$((SUCCESS_COUNT * 100 / COUNT))
if [ $SUCCESS_RATE -ge 90 ]; then
  echo -e "${GREEN}✅ Batch completed with $SUCCESS_RATE% success rate${NC}"
  log "INFO" "Batch completed with $SUCCESS_RATE% success rate"
  exit 0
elif [ $SUCCESS_RATE -ge 50 ]; then
  echo -e "${YELLOW}⚠ Batch completed with $SUCCESS_RATE% success rate (below 90%)${NC}"
  log "WARN" "Batch completed with $SUCCESS_RATE% success rate (below 90%)"
  exit 0  # Still exit 0 as some succeeded
else
  echo -e "${RED}❌ Batch failed with only $SUCCESS_RATE% success rate${NC}"
  log "ERROR" "Batch failed with only $SUCCESS_RATE% success rate"
  exit 1
fi
